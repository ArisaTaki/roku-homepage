import { createHash, randomUUID } from 'node:crypto';
import { appendFile, lstat, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_REPO = 'kuguya-AI-app-develop/tsukuyomi-Obsidian-theme';
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const PREVIEW = 'public/previews/tsukuyomi';
const KNOWLEDGE = 'public/knowledge/irop-skill.md';
const START = '<!-- TSUKUYOMI_RELEASE_START -->';
const END = '<!-- TSUKUYOMI_RELEASE_END -->';
const LIMITS = { 'theme.css': 512 * 1024, 'manifest.json': 16 * 1024, 'SHA256SUMS.txt': 64 * 1024, LICENSE: 64 * 1024, 'NOTICE.md': 128 * 1024 };
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function validVersion(value, label) {
  if (typeof value !== 'string' || !VERSION.test(value)) throw new Error(`Invalid ${label}: expected X.Y.Z`);
  return value;
}

function checkedUrl(value, kind, original) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) throw new Error('Untrusted download URL');
  const allowed = kind === 'asset'
    ? (url.href === original || ['release-assets.githubusercontent.com', 'objects.githubusercontent.com'].includes(url.hostname))
    : url.href === original;
  if (!allowed) throw new Error('Untrusted download redirect');
  return url;
}

/** Public asset requests never receive the API token, including redirected requests. */
async function download(url, { fetchImpl, token, maxBytes, kind = 'asset', timeoutMs }) {
  const signal = AbortSignal.timeout(timeoutMs);
  let current = url;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const parsed = checkedUrl(current, kind, url);
    const headers = { 'User-Agent': 'irop-tsukuyomi-release-sync', Accept: kind === 'api' ? 'application/vnd.github+json' : '*/*' };
    if (kind === 'api' && token && parsed.hostname === 'api.github.com') headers.Authorization = `Bearer ${token}`;
    const response = await fetchImpl(parsed.href, { headers, redirect: 'manual', signal });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location || redirects === 3) throw new Error('Download redirect limit exceeded');
      current = new URL(location, parsed).href;
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`GitHub download failed (${response.status})`);
    }
    const contentLength = response.headers.get('content-length');
    if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > maxBytes)) {
      await response.body?.cancel();
      throw new Error('Download exceeds size limit');
    }
    if (!response.body) throw new Error('Empty download body');
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) throw new Error('Download exceeds size limit');
        chunks.push(Buffer.from(value));
      }
    } catch (error) {
      await reader.cancel().catch(() => {});
      throw error;
    } finally {
      reader.releaseLock();
    }
    if (!size) throw new Error('Empty download body');
    return Buffer.concat(chunks);
  }
  throw new Error('Download redirect limit exceeded');
}

function checksumMap(bytes) {
  const map = new Map();
  for (const line of bytes.toString('utf8').trim().split(/\r?\n/)) {
    const match = /^([a-fA-F0-9]{64}) [ *]([^\s/\\]+)$/.exec(line);
    if (!match || map.has(match[2])) throw new Error('Invalid or duplicate release checksum');
    map.set(match[2], match[1].toLowerCase());
  }
  return map;
}

export function releaseKnowledge(manifest, release) {
  return `${START}\n- Tsukuyomi release: [${manifest.version}](${release.releaseUrl}); requires Obsidian ${manifest.minAppVersion}+. This website bundles the published release's theme CSS and manifest, verified against its SHA256SUMS.txt. Install manually by extracting the release ZIP's Tsukuyomi folder into a vault's .obsidian/themes/ folder, then select it in Settings → Appearance. The [official listing](https://community.obsidian.md/themes/tsukuyomi) is the source for current directory/review status; a GitHub release alone does not verify theme-manager availability.\n${END}`;
}

function replaceKnowledgeBlock(text, block) {
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  if (start < 0 || end < start || text.indexOf(START, start + START.length) >= 0 || text.indexOf(END, end + END.length) >= 0) {
    throw new Error('Expected one Tsukuyomi release marker block in knowledge file');
  }
  return text.slice(0, start) + block + text.slice(end + END.length);
}

async function existingFile(file) {
  try {
    const info = await lstat(file);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('Sync target must be a regular file');
    return await readFile(file);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

/** Stage all bytes first; ordinary write/rename failures restore replaced files. */
async function replaceFiles(root, updates) {
  const staged = [];
  const replaced = [];
  try {
    for (const update of updates) {
      const destination = path.join(root, update.name);
      await mkdir(path.dirname(destination), { recursive: true });
      const temporary = `${destination}.sync-${randomUUID()}`;
      staged.push({ ...update, destination, temporary });
      await writeFile(temporary, update.bytes, { flag: 'wx' });
    }
    for (const item of staged) {
      await rename(item.temporary, item.destination);
      replaced.push(item);
    }
  } catch (error) {
    for (const item of replaced.reverse()) {
      if (item.before === null) await unlink(item.destination);
      else {
        await writeFile(item.temporary, item.before, { flag: 'wx' });
        await rename(item.temporary, item.destination);
      }
    }
    throw error;
  } finally {
    await Promise.all(staged.map(({ temporary }) => unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error; })));
  }
}

export async function syncTsukuyomi({ root = fileURLToPath(new URL('..', import.meta.url)), version, check = false, fetchImpl = fetch, token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN, timeoutMs = 20_000 } = {}) {
  if (version !== undefined) validVersion(version, 'requested version');
  const request = (url, maxBytes, kind) => download(url, { fetchImpl, token, maxBytes, kind, timeoutMs });
  const endpoint = `https://api.github.com/repos/${SOURCE_REPO}/releases/${version ? `tags/${version}` : 'latest'}`;
  const release = JSON.parse((await request(endpoint, 1024 * 1024, 'api')).toString('utf8'));
  const tag = validVersion(release.tag_name, 'release tag');
  if (release.draft !== false || release.prerelease !== false) throw new Error('Only published stable releases can be synchronized');
  if (version && tag !== version) throw new Error('Release tag does not match requested version');
  const releaseUrl = `https://github.com/${SOURCE_REPO}/releases/tag/${tag}`;
  if (release.html_url !== releaseUrl || typeof release.published_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(release.published_at) || !Number.isFinite(Date.parse(release.published_at))) {
    throw new Error('Invalid published release metadata');
  }
  if (!Array.isArray(release.assets)) throw new Error('Release assets are missing');
  const bytes = {};
  for (const name of ['SHA256SUMS.txt', 'manifest.json', 'theme.css']) {
    const assets = release.assets.filter((asset) => asset.name === name);
    const url = `https://github.com/${SOURCE_REPO}/releases/download/${tag}/${name}`;
    if (assets.length !== 1 || assets[0].browser_download_url !== url || !Number.isSafeInteger(assets[0].size) || assets[0].size <= 0 || assets[0].size > LIMITS[name]) throw new Error(`Invalid release asset: ${name}`);
    bytes[name] = await request(url, LIMITS[name], 'asset');
    if (bytes[name].length !== assets[0].size) throw new Error(`Asset size mismatch: ${name}`);
  }
  const sums = checksumMap(bytes['SHA256SUMS.txt']);
  for (const name of ['manifest.json', 'theme.css']) {
    if (sums.get(name) !== sha256(bytes[name])) throw new Error(`Checksum mismatch: ${name}`);
  }
  const manifest = JSON.parse(bytes['manifest.json'].toString('utf8'));
  if (manifest.name !== 'Tsukuyomi' || manifest.version !== tag) throw new Error('Manifest name/version does not match release');
  validVersion(manifest.minAppVersion, 'minimum Obsidian version');
  for (const name of ['LICENSE', 'NOTICE.md']) bytes[name] = await request(`https://raw.githubusercontent.com/${SOURCE_REPO}/${tag}/${name}`, LIMITS[name], 'raw');
  if (!bytes.LICENSE.toString('utf8').includes('MIT License') || !bytes['NOTICE.md'].toString('utf8').includes('Tsukuyomi')) throw new Error('Invalid release attribution files');
  const metadata = {
    version: tag, tag, sourceRepo: SOURCE_REPO, releaseUrl, publishedAt: release.published_at,
    cssSha256: sha256(bytes['theme.css']), manifestSha256: sha256(bytes['manifest.json']),
  };
  const outputs = new Map(['theme.css', 'manifest.json', 'LICENSE', 'NOTICE.md'].map((name) => [`${PREVIEW}/${name}`, bytes[name]]));
  outputs.set(`${PREVIEW}/release.json`, Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`));
  const knowledge = await readFile(path.join(root, KNOWLEDGE), 'utf8');
  outputs.set(KNOWLEDGE, Buffer.from(replaceKnowledgeBlock(knowledge, releaseKnowledge(manifest, metadata))));
  const updates = [];
  for (const [name, value] of outputs) {
    const before = await existingFile(path.join(root, name));
    if (!before?.equals(value)) updates.push({ name, bytes: value, before });
  }
  if (!check && updates.length) await replaceFiles(root, updates);
  return { changed: updates.length > 0, version: tag, tag, releaseUrl };
}

async function main() {
  const args = process.argv.slice(2);
  let version;
  let check = false;
  while (args.length) {
    const arg = args.shift();
    if (arg === '--version' && version === undefined && args[0]) version = args.shift();
    else if (arg === '--check' && !check) check = true;
    else throw new Error('Usage: node tools/sync-tsukuyomi.mjs [--version X.Y.Z] [--check]');
  }
  const result = await syncTsukuyomi({ version, check });
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `changed=${result.changed}\nversion=${result.version}\ntag=${result.tag}\nrelease_url=${result.releaseUrl}\n`);
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(`Tsukuyomi sync failed: ${error.message}`); process.exitCode = 1; });
}
