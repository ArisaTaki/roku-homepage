import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFile, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

export const PROJECTS = Object.freeze([
  { id: 'ranlu', repo: 'kuguya-AI-app-develop/ranlu', game: true },
  { id: 'jingang-guild', repo: 'kuguya-AI-app-develop/jingang-guild', game: true },
  { id: 'naiwa-yuushiya', repo: 'kuguya-AI-app-develop/naiwa-yuushiya-table-game', game: true },
  { id: 'yki-video-generator', repo: 'kuguya-AI-app-develop/YKI-video-generator', game: false },
  { id: 'reflex-labs', repo: 'kuguya-AI-app-develop/Jev_project', game: false },
].map(Object.freeze));
export const BUNDLE_NAME = 'irop-web-demo.json.gz';

const root = fileURLToPath(new URL('..', import.meta.url));
const liveOrigin = 'https://irop.one';
const metadataPaths = ['public/knowledge/project-releases.json', 'src/data/project-releases.json'];
const bundleLimit = 40 * 1024 * 1024;
const runtimeLimit = 25 * 1024 * 1024;
const jsonLimit = 2 * 1024 * 1024;
const extensions = new Set(['.html', '.js', '.css', '.json', '.bin', '.wasm', '.png', '.jpg', '.jpeg', '.webp', '.wav', '.mp3', '.ogg', '.ttf', '.woff', '.woff2']);
const rootFiles = new Set(['index.html', 'index.js', 'application.js', 'style.css']);
const runtimeDirectories = new Set(['assets', 'src', 'cocos-js']);
const storageHosts = new Set(['release-assets.githubusercontent.com', 'objects.githubusercontent.com', 'github-releases.githubusercontent.com']);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const emptyMetadata = () => ({ schemaVersion: 1, projects: {} });
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;
class ReleaseSyncError extends Error {}

function requireCondition(condition, message) {
  if (!condition) throw new ReleaseSyncError(message);
}

function validVersion(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[\x00-\x1f\x7f]/.test(value);
}

function releaseUrl(project, version) {
  return `https://github.com/${project.repo}/releases/tag/${encodeURIComponent(version)}`;
}

function validateMetadata(value) {
  requireCondition(isObject(value) && value.schemaVersion === 1 && isObject(value.projects), 'Invalid project release metadata.');
  requireCondition(Object.keys(value.projects).every((id) => PROJECTS.some((project) => project.id === id)), 'Unknown project in release metadata.');
  const result = emptyMetadata();
  for (const project of PROJECTS) {
    const entry = value.projects[project.id];
    if (entry === undefined) continue;
    requireCondition(isObject(entry) && validVersion(entry.version) && entry.sourceRepo === project.repo
      && entry.releaseUrl === releaseUrl(project, entry.version)
      && typeof entry.publishedAt === 'string' && Number.isFinite(Date.parse(entry.publishedAt))
      && (project.game ? /^[a-f0-9]{64}$/.test(entry.assetSha256) : entry.assetSha256 === undefined), `Invalid release metadata for ${project.id}.`);
    result.projects[project.id] = {
      version: entry.version, sourceRepo: project.repo, releaseUrl: entry.releaseUrl,
      publishedAt: entry.publishedAt, ...(project.game ? { assetSha256: entry.assetSha256 } : {}),
    };
  }
  return result;
}

async function readLocalMetadata() {
  const values = await Promise.all(metadataPaths.map(async (file) => validateMetadata(JSON.parse(await readFile(path.join(root, file), 'utf8')))));
  requireCondition(serialize(values[0]) === serialize(values[1]), 'The two local project release metadata files differ.');
  return values[0];
}

async function readBounded(response, limit, label) {
  requireCondition(Number(response.headers.get('content-length') || 0) <= limit, `${label} exceeds its size limit.`);
  const chunks = [];
  let total = 0;
  if (!response.body) throw new ReleaseSyncError(`${label} has no response body.`);
  for await (const chunk of response.body) {
    total += chunk.length;
    requireCondition(total <= limit, `${label} exceeds its size limit.`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function fetchLive(relative, { optional = false } = {}) {
  const response = await fetch(`${liveOrigin}/${relative}`, {
    redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30_000),
  });
  if (optional && response.status === 404) return null;
  requireCondition(response.ok, `Live ${relative} returned HTTP ${response.status}.`);
  const body = (await readBounded(response, jsonLimit, 'Live JSON')).toString('utf8');
  // Older deployments can serve the SPA for an unknown JSON path. This is only
  // accepted during bootstrap, when both local metadata files are empty.
  if (optional && response.headers.get('content-type')?.includes('text/html') && /^\s*(?:<!doctype html|<html)[\s>]/i.test(body)) return null;
  return JSON.parse(body);
}

async function readLiveMetadata(optional = false) {
  return validateMetadata(await fetchLive('knowledge/project-releases.json', { optional }) ?? emptyMetadata());
}

async function githubJson(project, suffix, token) {
  // Repo and suffix are constructed locally. Credentials never follow redirects.
  const response = await fetch(`https://api.github.com/repos/${project.repo}/${suffix}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    redirect: 'error', signal: AbortSignal.timeout(30_000),
  });
  requireCondition(response.ok, `GitHub ${project.id} returned HTTP ${response.status}; verify release read access.`);
  return JSON.parse((await readBounded(response, 10 * jsonLimit, 'GitHub release list')).toString('utf8'));
}

async function listReleases(project, token) {
  const releases = [];
  for (let page = 1; page <= 20; page += 1) {
    const values = await githubJson(project, `releases?per_page=100&page=${page}`, token);
    requireCondition(Array.isArray(values), `Invalid GitHub release list for ${project.id}.`);
    releases.push(...values.filter((release) => release.draft === false && release.prerelease === false));
    if (values.length < 100) return releases;
  }
  throw new ReleaseSyncError(`Release pagination limit reached for ${project.id}; no update was applied.`);
}

function candidateFromRelease(project, release) {
  requireCondition(validVersion(release.tag_name) && typeof release.published_at === 'string'
    && Number.isFinite(Date.parse(release.published_at)), `Invalid published release for ${project.id}.`);
  let asset;
  if (project.game) {
    requireCondition(Array.isArray(release.assets), `Invalid release assets for ${project.id}.`);
    const assets = release.assets.filter((item) => item.name === BUNDLE_NAME && item.state === 'uploaded');
    if (assets.length === 0) return null;
    requireCondition(assets.length === 1, `Duplicate demo bundles for ${project.id}.`);
    [asset] = assets;
    requireCondition(Number.isSafeInteger(asset.id) && asset.id > 0
      && Number.isSafeInteger(asset.size) && asset.size > 0 && asset.size <= bundleLimit
      && /^sha256:[a-f0-9]{64}$/.test(asset.digest), `Invalid demo asset size or GitHub SHA-256 digest for ${project.id}.`);
  }
  return {
    metadata: {
      version: release.tag_name, sourceRepo: project.repo, releaseUrl: releaseUrl(project, release.tag_name),
      publishedAt: release.published_at, ...(asset ? { assetSha256: asset.digest.slice(7) } : {}),
    },
    asset,
  };
}

function newer(current, candidate, id) {
  if (!current) return candidate;
  if (!candidate) return current;
  if (current.version === candidate.version) {
    requireCondition(current.assetSha256 === candidate.assetSha256, `The published demo asset for ${id} was replaced; publish a new version instead.`);
    return Date.parse(candidate.publishedAt) > Date.parse(current.publishedAt) ? candidate : current;
  }
  const difference = Date.parse(candidate.publishedAt) - Date.parse(current.publishedAt);
  requireCondition(difference !== 0, `Conflicting release versions with the same publication date for ${id}.`);
  return difference > 0 ? candidate : current;
}

async function findTargets(baseline, token) {
  const selected = new Map();
  for (const project of PROJECTS) {
    const releases = await listReleases(project, token);
    releases.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
    let candidate = null;
    for (const release of releases) {
      candidate = candidateFromRelease(project, release);
      if (candidate) break;
    }
    const current = baseline.projects[project.id];
    const target = newer(current, candidate?.metadata, project.id);
    if (!target) continue;
    // A removed release never downgrades the site. A deployment can only restore
    // that live version from its exact immutable asset, otherwise it fails closed.
    if (project.game && candidate?.metadata.version !== target.version) {
      const release = releases.find((entry) => entry.tag_name === target.version);
      candidate = release ? candidateFromRelease(project, release) : null;
    }
    selected.set(project.id, { metadata: target, asset: candidate?.metadata.version === target.version ? candidate.asset : null });
  }
  return selected;
}

async function downloadAsset(project, asset, token) {
  requireCondition(asset, `The live release for ${project.id} is unavailable upstream; preserving the deployed version.`);
  let response = await fetch(`https://api.github.com/repos/${project.repo}/releases/assets/${asset.id}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/octet-stream', 'X-GitHub-Api-Version': '2022-11-28' },
    redirect: 'manual', signal: AbortSignal.timeout(60_000),
  });
  for (let redirect = 0; [301, 302, 303, 307, 308].includes(response.status); redirect += 1) {
    requireCondition(redirect < 3, `Too many asset redirects for ${project.id}.`);
    const location = response.headers.get('location');
    requireCondition(location, `Missing asset redirect for ${project.id}.`);
    const url = new URL(location);
    requireCondition(url.protocol === 'https:' && !url.username && !url.password && !url.port && storageHosts.has(url.hostname), `Untrusted asset download host for ${project.id}.`);
    await response.body?.cancel();
    // Deliberately no Authorization header on GitHub's signed storage URLs.
    response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(60_000) });
  }
  requireCondition(response.ok, `Demo download for ${project.id} returned HTTP ${response.status}.`);
  const data = await readBounded(response, bundleLimit, `${project.id} bundle`);
  requireCondition(data.length === asset.size && hash(data) === asset.digest.slice(7), `GitHub asset size or digest mismatch for ${project.id}.`);
  return data;
}

function validRuntimePath(file) {
  if (typeof file !== 'string' || file.length > 240 || /[\\\x00-\x1f\x7f:]/.test(file) || path.posix.isAbsolute(file)) return false;
  const parts = file.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..' || part.startsWith('.') || /^(?:__proto__|prototype|constructor|node_modules|documents|logs|private|secrets|source)$/i.test(part))) return false;
  return extensions.has(path.posix.extname(file)) && (rootFiles.has(file) || runtimeDirectories.has(parts[0]));
}

export function validateBundle(compressed, project, { version, assetSha256 }) {
  requireCondition(PROJECTS.some((item) => item.id === project?.id && item.repo === project.repo && item.game === true)
    && project.game === true && Buffer.isBuffer(compressed)
    && compressed.length <= bundleLimit && /^[a-f0-9]{64}$/.test(assetSha256)
    && hash(compressed) === assetSha256, 'Invalid demo bundle or SHA-256 digest.');
  const bundle = JSON.parse(gunzipSync(compressed, { maxOutputLength: bundleLimit }).toString('utf8'));
  requireCondition(isObject(bundle) && bundle.schemaVersion === 1 && bundle.game === project.id
    && bundle.version === version && isObject(bundle.manifest) && isObject(bundle.files), `Demo bundle identity mismatch for ${project.id}.`);
  const manifest = bundle.manifest;
  requireCondition(manifest.sourceRepo === project.repo && /^[a-f0-9]{40}$/.test(manifest.sourceCommit)
    && typeof manifest.runtime === 'string' && manifest.runtime.length > 0 && manifest.runtime.length <= 100
    && !/[\x00-\x1f\x7f]/.test(manifest.runtime)
    && manifest.entry === 'index.html' && manifest.offline === true && isObject(manifest.files), `Invalid runtime manifest for ${project.id}.`);
  const names = Object.keys(manifest.files).sort();
  requireCondition(names.length > 0 && names.length <= 2000 && names.includes('index.html')
    && JSON.stringify(names) === JSON.stringify(Object.keys(bundle.files).sort())
    && new Set(names.map((name) => name.toLowerCase())).size === names.length, `Runtime file list mismatch for ${project.id}.`);
  let total = 0;
  const files = new Map();
  const checkedFiles = {};
  for (const file of names) {
    const record = manifest.files[file];
    const encoded = bundle.files[file];
    requireCondition(validRuntimePath(file) && isObject(record) && Number.isSafeInteger(record.bytes)
      && record.bytes >= 0 && record.bytes <= runtimeLimit && /^[a-f0-9]{64}$/.test(record.sha256)
      && typeof encoded === 'string' && encoded.length === Math.ceil(record.bytes / 3) * 4, `Invalid runtime file in ${project.id}.`);
    total += record.bytes;
    requireCondition(total <= runtimeLimit, `Runtime exceeds 25 MiB for ${project.id}.`);
    const content = Buffer.from(encoded, 'base64');
    requireCondition(content.length === record.bytes && hash(content) === record.sha256
      && content.toString('base64') === encoded, `Runtime digest mismatch for ${project.id}/${file}.`);
    if (/\.(js|css|html|json)$/.test(file)) {
      const text = content.toString('utf8');
      requireCondition(!/sourceMappingURL\s*=|\/Users\/|\/home\/|(?:localhost|127\.0\.0\.1|\[::1\]):\d|-----BEGIN (?:[A-Z ]*PRIVATE KEY|OPENSSH PRIVATE KEY)-----/.test(text), `Development or private content in ${project.id}/${file}.`);
      if (project.id === 'naiwa-yuushiya') requireCondition(!/WebSocket|wss?:\/\/|panel-remote/.test(text), 'Naiwa release must use the offline demo adapter.');
    }
    checkedFiles[file] = { bytes: record.bytes, sha256: record.sha256 };
    files.set(file, content);
  }
  if (project.id !== 'naiwa-yuushiya') {
    requireCondition(files.has('src/settings.json'), `Missing Cocos settings for ${project.id}.`);
    const settings = JSON.parse(files.get('src/settings.json').toString('utf8'));
    requireCondition(settings.engine?.debug === false && !settings.assets?.server
      && !settings.assets?.remoteBundles?.length, `Expected a production Cocos export with local assets for ${project.id}.`);
  }
  // Copy the public allowlist only: no release bodies, local paths, or extra fields.
  return { manifest: {
    sourceRepo: project.repo, sourceCommit: manifest.sourceCommit, runtime: manifest.runtime,
    entry: 'index.html', offline: true, files: checkedFiles,
  }, files };
}

async function filesIn(directory, prefix = '') {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    requireCondition(!item.isSymbolicLink() && (item.isDirectory() || item.isFile()), 'Unexpected entry in an existing demo directory.');
    const relative = path.posix.join(prefix, item.name);
    if (item.isDirectory()) files.push(...await filesIn(path.join(directory, item.name), relative));
    else files.push(relative);
  }
  return files;
}

async function safeDestination(relative, project) {
  let current = root;
  const parts = relative.split('/');
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]);
    const item = await lstat(current).catch((error) => { if (error.code !== 'ENOENT') throw error; return null; });
    if (!item) continue;
    requireCondition(!item.isSymbolicLink() && (index < parts.length - 1 || project ? item.isDirectory() : item.isFile()), 'Release destination must be a regular managed file or directory.');
  }
  if (project && await lstat(current).catch(() => null)) {
    const manifest = JSON.parse(await readFile(path.join(current, 'demo-manifest.json'), 'utf8'));
    requireCondition(manifest.sourceRepo === project.repo && isObject(manifest.files), `Existing demo for ${project.id} is not managed by this tool.`);
    const expected = new Set([...Object.keys(manifest.files), 'demo-manifest.json']);
    requireCondition((await filesIn(current)).every((file) => expected.has(file)), `Unmanaged files in ${project.id}; synchronization stopped.`);
  }
}

async function applyUpdates(updates, metadata) {
  const temporary = await mkdtemp(path.join(root, '.release-sync-'));
  const actions = [];
  let cleanup = true;
  try {
    for (const [id, { manifest, files, release }] of updates) {
      const project = PROJECTS.find((entry) => entry.id === id);
      const relative = `public/previews/${id}/game`;
      await safeDestination(relative, project);
      const staged = path.join(temporary, id);
      await mkdir(staged);
      for (const [file, content] of files) {
        const destination = path.join(staged, file);
        await mkdir(path.dirname(destination), { recursive: true });
        await writeFile(destination, content);
      }
      await writeFile(path.join(staged, 'demo-manifest.json'), serialize({ ...manifest, release }));
      actions.push({ destination: path.join(root, relative), staged });
    }
    for (const [index, relative] of metadataPaths.entries()) {
      await safeDestination(relative);
      const staged = path.join(temporary, `metadata-${index}.json`);
      await writeFile(staged, serialize(metadata));
      actions.push({ destination: path.join(root, relative), staged });
    }
    try {
      for (const [index, action] of actions.entries()) {
        await mkdir(path.dirname(action.destination), { recursive: true });
        const exists = await lstat(action.destination).catch((error) => { if (error.code !== 'ENOENT') throw error; return null; });
        if (exists) {
          action.backup = path.join(temporary, `previous-${index}`);
          await rename(action.destination, action.backup);
        }
        await rename(action.staged, action.destination);
        action.applied = true;
      }
    } catch (error) {
      for (const action of [...actions].reverse()) {
        try {
          if (action.applied) await rm(action.destination, { recursive: true, force: true });
          if (action.backup) await rename(action.backup, action.destination);
        } catch { cleanup = false; }
      }
      if (!cleanup) throw new ReleaseSyncError(`Release rollback needs attention; backups retained in ${path.basename(temporary)}.`);
      throw error;
    }
  } finally {
    if (cleanup) await rm(temporary, { recursive: true, force: true });
  }
}

async function verifyLive({ guardNoToken = false } = {}) {
  const local = await readLocalMetadata();
  const live = await readLiveMetadata(Object.keys(local.projects).length === 0);
  requireCondition(serialize(local) === serialize(live), 'Live project release metadata does not match this build.');
  for (const project of PROJECTS.filter((entry) => entry.game)) {
    if (guardNoToken && !local.projects[project.id]) continue;
    const relative = `previews/${project.id}/game/demo-manifest.json`;
    const expected = JSON.parse(await readFile(path.join(root, 'public', relative), 'utf8'));
    const actual = await fetchLive(relative);
    requireCondition(JSON.stringify(expected) === JSON.stringify(actual), `Live runtime manifest differs for ${project.id}.`);
  }
  console.log(guardNoToken
    ? 'No-token deployment preserves all published project versions and released demos.'
    : 'Project releases and all three live demo manifests match this build.');
}

async function main() {
  const args = process.argv.slice(2);
  requireCondition(args.every((arg) => ['--check', '--verify-live', '--guard-no-token', '--use-gh', '--help'].includes(arg))
    && new Set(args).size === args.length
    && args.filter((arg) => ['--check', '--verify-live', '--guard-no-token'].includes(arg)).length <= 1,
  'Usage: node tools/sync-project-releases.mjs [--check | --verify-live | --guard-no-token] [--use-gh]');
  if (args.includes('--help')) {
    console.log('Usage: node tools/sync-project-releases.mjs [--check | --verify-live | --guard-no-token] [--use-gh]\nSync/check require GH_TOKEN with read access to the five source repositories. --use-gh reads the local gh credential into memory.\n--guard-no-token protects published releases while allowing manual updates to games without a release.');
    return;
  }
  if (args.includes('--verify-live')) return verifyLive();
  if (args.includes('--guard-no-token')) return verifyLive({ guardNoToken: true });
  let token = process.env.GH_TOKEN;
  if (!token && args.includes('--use-gh')) {
    token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  }
  requireCondition(typeof token === 'string' && token.trim().length > 0, 'GH_TOKEN is required; private repository 404 responses are permission errors, not empty releases.');
  const local = await readLocalMetadata();
  const live = await readLiveMetadata(Object.keys(local.projects).length === 0);
  const baseline = args.includes('--check') ? live : local;
  if (!args.includes('--check')) {
    for (const project of PROJECTS) {
      const entry = newer(baseline.projects[project.id], live.projects[project.id], project.id);
      if (entry) baseline.projects[project.id] = entry;
    }
  }
  const targets = await findTargets(baseline, token);
  const metadata = emptyMetadata();
  for (const [id, target] of targets) metadata.projects[id] = target.metadata;
  const changed = serialize(metadata) !== serialize(live);
  if (args.includes('--check')) {
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
    console.log(`Project release updates: ${changed ? 'available' : 'none'}.`);
    return;
  }
  const updates = new Map();
  // Validate every selected asset before making any changes to managed files.
  for (const project of PROJECTS.filter((entry) => entry.game)) {
    const target = targets.get(project.id);
    if (!target) continue;
    const downloaded = await downloadAsset(project, target.asset, token);
    const validated = validateBundle(downloaded, project, target.metadata);
    const { version, releaseUrl: url, publishedAt, assetSha256 } = target.metadata;
    updates.set(project.id, { ...validated, release: { version, releaseUrl: url, publishedAt, assetSha256 } });
  }
  await applyUpdates(updates, metadata);
  console.log(`Synchronized ${Object.keys(metadata.projects).length} project versions and ${updates.size} game demos.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    // Never print upstream response bodies, storage URLs, or child process output.
    const message = error instanceof ReleaseSyncError ? error.message : 'Check network access, local files, and bundle JSON format; no upstream content or credentials were logged.';
    console.error(`Project release sync failed: ${message}`);
    process.exitCode = 1;
  });
}
