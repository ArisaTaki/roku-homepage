import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PROJECTS } from './sync-project-releases.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const siteRepo = 'ArisaTaki/roku-homepage';
const liveOrigin = 'https://irop.one';
const metadataPaths = ['public/knowledge/project-main.json', 'src/data/project-main.json'];
const lockPath = path.join(tmpdir(), 'roku-homepage-project-main.lock');
const shaPattern = /^[a-f0-9]{40}$/;
const branchFor = (project) => project.id === 'yki-video-generator' ? 'master' : 'main';
const emptyMetadata = () => ({ schemaVersion: 1, projects: {} });
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
let activeChild;
let interrupted = false;
let logDirectory;
let logIndex = 0;

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function killChild(signal) {
  if (!activeChild?.pid) return;
  try {
    if (process.platform === 'win32') activeChild.kill(signal);
    else process.kill(-activeChild.pid, signal);
  } catch (error) { if (error.code !== 'ESRCH') throw error; }
}

async function run(command, args, { cwd = root, timeout = 120_000, optional404 = false, label = command } = {}) {
  requireCondition(!interrupted, 'Synchronization interrupted.');
  return new Promise((resolve, reject) => {
    let timedOut = false;
    let forceTimer;
    const child = execFile(command, args, {
      cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, detached: process.platform !== 'win32',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GH_PROMPT_DISABLED: '1' },
    }, async (error, stdout, stderr) => {
      clearTimeout(timer);
      clearTimeout(forceTimer);
      activeChild = undefined;
      try {
        if (logDirectory) await writeFile(path.join(logDirectory, `${++logIndex}-${command.replace(/[^a-z0-9]/gi, '_')}.log`), `${label}\n${stdout}\n${stderr}`, { mode: 0o600 });
        if (optional404 && error && /\bHTTP 404\b/.test(stderr)) return resolve(null);
        if (error || interrupted || timedOut) return reject(new Error(`${label} ${timedOut ? 'timed out' : interrupted ? 'was interrupted' : 'failed'}${logDirectory ? `; logs: ${logDirectory}` : '; check gh authentication and repository access'}.`));
        resolve(stdout.trim());
      } catch (failure) { reject(failure); }
    });
    activeChild = child;
    const timer = setTimeout(() => {
      timedOut = true;
      killChild('SIGTERM');
      forceTimer = setTimeout(() => killChild('SIGKILL'), 5_000);
    }, timeout);
  });
}

function validateMetadata(value) {
  requireCondition(isObject(value) && value.schemaVersion === 1 && isObject(value.projects), 'Invalid project main metadata.');
  requireCondition(Object.keys(value.projects).every((id) => PROJECTS.some((project) => project.id === id)), 'Unknown project in main metadata.');
  const result = emptyMetadata();
  for (const project of PROJECTS) {
    const entry = value.projects[project.id];
    if (entry === undefined) continue;
    requireCondition(isObject(entry) && entry.sourceRepo === project.repo && entry.branch === branchFor(project)
      && shaPattern.test(entry.sourceCommit) && typeof entry.updatedAt === 'string' && Number.isFinite(Date.parse(entry.updatedAt))
      && entry.commitUrl === `https://github.com/${project.repo}/commit/${entry.sourceCommit}`, `Invalid main metadata for ${project.id}.`);
    result.projects[project.id] = {
      sourceRepo: project.repo, branch: entry.branch, sourceCommit: entry.sourceCommit,
      updatedAt: entry.updatedAt, commitUrl: entry.commitUrl,
    };
  }
  return result;
}

async function githubHead(repo, branch) {
  // Filter before returning output: never retain private commit messages or bodies.
  const value = JSON.parse(await run('gh', ['api', `repos/${repo}/commits/${branch}`, '--jq', '{sha: .sha, date: .commit.committer.date}'], { label: `Read ${repo}/${branch}` }));
  requireCondition(shaPattern.test(value.sha) && typeof value.date === 'string' && Number.isFinite(Date.parse(value.date)), `Invalid branch commit for ${repo}.`);
  return value;
}

async function sourceHeads() {
  const result = emptyMetadata();
  for (const project of PROJECTS) {
    const branch = branchFor(project);
    const head = await githubHead(project.repo, branch);
    result.projects[project.id] = { sourceRepo: project.repo, branch, sourceCommit: head.sha, updatedAt: head.date, commitUrl: `https://github.com/${project.repo}/commit/${head.sha}` };
  }
  return result;
}

async function githubFile(file, revision) {
  const content = await run('gh', ['api', `repos/${siteRepo}/contents/${file}?ref=${revision}`, '--jq', '.content'], { optional404: true, label: `Read homepage ${file}` });
  return content === null ? null : JSON.parse(Buffer.from(content, 'base64').toString('utf8'));
}

async function localFile(directory, file) {
  try { return JSON.parse(await readFile(path.join(directory, file), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function baseline(read) {
  const first = validateMetadata(await read(metadataPaths[0]) ?? emptyMetadata());
  const second = validateMetadata(await read(metadataPaths[1]) ?? emptyMetadata());
  requireCondition(serialize(first) === serialize(second), 'The two project main metadata files differ.');
  const commits = {};
  const manifests = {};
  for (const project of PROJECTS) {
    commits[project.id] = first.projects[project.id]?.sourceCommit;
    if (project.game) {
      const manifest = await read(`public/previews/${project.id}/game/demo-manifest.json`);
      requireCondition(!commits[project.id] || manifest, `Missing installed demo manifest for ${project.id}.`);
      if (manifest) {
        requireCondition(manifest.sourceRepo === project.repo && shaPattern.test(manifest.sourceCommit), `Invalid baseline manifest for ${project.id}.`);
        requireCondition(!commits[project.id] || commits[project.id] === manifest.sourceCommit, `Main metadata and installed demo revision differ for ${project.id}.`);
        manifests[project.id] = manifest;
        commits[project.id] = manifest.sourceCommit;
      }
    }
  }
  return { metadata: first, commits, manifests };
}

function plan(current, target) {
  return {
    changedProjects: PROJECTS.filter((project) => current.commits[project.id] !== target.projects[project.id].sourceCommit).map((project) => project.id),
    metadataUpdateNeeded: serialize(current.metadata) !== serialize(target),
  };
}

async function check() {
  const head = await githubHead(siteRepo, 'main');
  const current = await baseline((file) => githubFile(file, head.sha));
  const target = await sourceHeads();
  console.log(serialize({ mode: 'check', homepageCommit: head.sha, ...plan(current, target), projects: target.projects }).trim());
}

async function acquireLock() {
  const owner = { pid: process.pid, nonce: `${Date.now()}-${Math.random().toString(16).slice(2)}` };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { await mkdir(lockPath, { mode: 0o700 }); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let previous;
      try { previous = JSON.parse(await readFile(path.join(lockPath, 'owner.json'), 'utf8')); }
      catch { throw new Error(`Sync lock is initializing or incomplete: ${lockPath}. Inspect it before retrying.`); }
      requireCondition(Number.isInteger(previous.pid) && previous.pid > 0, `Invalid sync lock: ${lockPath}.`);
      try { process.kill(previous.pid, 0); }
      catch (failure) {
        if (failure.code !== 'ESRCH') throw new Error(`Another synchronization owns ${lockPath}.`);
        // Serialize stale-lock recovery so two callers cannot remove a new live lock.
        const recovery = `${lockPath}.recovery`;
        try { await mkdir(recovery, { mode: 0o700 }); }
        catch { throw new Error(`Sync lock recovery is in progress: ${recovery}. Retry later.`); }
        try {
          const current = JSON.parse(await readFile(path.join(lockPath, 'owner.json'), 'utf8'));
          requireCondition(current.pid === previous.pid && current.nonce === previous.nonce, 'Sync lock changed; retry later.');
          try { process.kill(current.pid, 0); throw new Error('Sync lock owner is still running.'); }
          catch (alive) { if (alive.code !== 'ESRCH') throw alive; }
          const stale = `${lockPath}.stale-${owner.nonce}`;
          await rename(lockPath, stale);
          await rm(stale, { recursive: true, force: true });
        } finally { await rm(recovery, { recursive: true, force: true }); }
        continue;
      }
      throw new Error(`Another synchronization is running (PID ${previous.pid}).`);
    }
    await writeFile(path.join(lockPath, 'owner.json'), serialize(owner), { mode: 0o600 });
    return async () => {
      const current = JSON.parse(await readFile(path.join(lockPath, 'owner.json'), 'utf8'));
      if (current.pid === owner.pid && current.nonce === owner.nonce) await rm(lockPath, { recursive: true, force: true });
    };
  }
  throw new Error('Could not acquire the synchronization lock; retry later.');
}

async function clone(repo, branch, destination) {
  await run('gh', ['repo', 'clone', repo, destination, '--', '--depth=1', `--branch=${branch}`, '--single-branch'], { timeout: 600_000, label: `Clone ${repo}` });
}

async function installDependencies(directory) {
  const packageJson = await localFile(directory, 'package.json');
  requireCondition(packageJson, `Missing package.json in ${directory}.`);
  const lock = await localFile(directory, 'package-lock.json') ?? await localFile(directory, 'npm-shrinkwrap.json');
  // Vite sets NODE_ENV, so build dependencies must be included explicitly.
  if (lock) await run('npm', ['ci', '--include=dev', '--no-audit', '--no-fund'], { cwd: directory, timeout: 900_000, label: 'Install locked dependencies' });
  else requireCondition(!['dependencies', 'devDependencies', 'optionalDependencies'].some((key) => Object.keys(packageJson[key] ?? {}).length) && !packageJson.workspaces, 'Dependencies require a committed npm lockfile.');
}

async function installCocosExtension(directory) {
  const packageJson = await localFile(directory, 'package.json');
  if (!packageJson) return;
  const lock = await localFile(directory, 'package-lock.json');
  // These legacy extension locks resolve the production type packages. Normalize
  // only their duplicate dev declarations in this disposable source checkout.
  if (packageJson.name === 'biligame-builder' && lock?.lockfileVersion === 1) {
    let changed = false;
    for (const name of ['@types/node', '@types/fs-extra']) {
      const production = packageJson.dependencies?.[name];
      const development = packageJson.devDependencies?.[name];
      if (typeof production === 'string' && typeof development === 'string' && production !== development) {
        packageJson.devDependencies[name] = production;
        changed = true;
      }
    }
    if (changed) await writeFile(path.join(directory, 'package.json'), serialize(packageJson));
  }
  await installDependencies(directory);
}

async function publish() {
  const releaseLock = await acquireLock();
  let temporary;
  let succeeded = false;
  try {
    temporary = await mkdtemp(path.join(tmpdir(), 'roku-main-sync-'));
    logDirectory = path.join(temporary, 'logs');
    await mkdir(logDirectory, { mode: 0o700 });
    const site = path.join(temporary, 'homepage');
    await clone(siteRepo, 'main', site);
    const start = await run('git', ['rev-parse', 'HEAD'], { cwd: site });
    const current = await baseline((file) => localFile(site, file));
    const target = await sourceHeads();
    const planned = plan(current, target);
    if (!planned.changedProjects.length && !planned.metadataUpdateNeeded) {
      succeeded = true;
      console.log(serialize({ mode: 'publish', status: 'unchanged', homepageCommit: start, ...planned }).trim());
      return;
    }
    for (const key of ['user.name', 'user.email']) {
      const value = await run('git', ['config', '--get', key], { cwd: root, label: `Read Git ${key}; configure it with git config before publishing` });
      requireCondition(value && !/[\r\n]/.test(value), `Configure Git ${key} before publishing.`);
      await run('git', ['config', '--local', key, value], { cwd: site });
    }
    // Use the freshly cloned homepage adapter, never a potentially outdated caller.
    const { syncGame, games } = await import(pathToFileURL(path.join(site, 'tools/sync-game-demos.mjs')).href);
    for (const project of PROJECTS.filter((item) => item.game && planned.changedProjects.includes(item.id))) {
      requireCondition(games[project.id]?.repo === project.repo.split('/')[1], `Unexpected game adapter for ${project.id}.`);
      const source = path.join(temporary, project.id);
      const revision = target.projects[project.id].sourceCommit;
      await clone(project.repo, branchFor(project), source);
      await run('git', ['fetch', '--depth=1', 'origin', revision], { cwd: source, timeout: 600_000, label: `Fetch fixed ${project.id} revision` });
      await run('git', ['checkout', '--quiet', '--detach', revision], { cwd: source });
      await installDependencies(source);
      if (games[project.id].export) {
        // Creator loads registered extensions even when their optional export is off.
        const extension = path.join(source, project.id === 'ranlu' ? 'cocos' : '', 'extensions/biligame-builder');
        await installCocosExtension(extension);
        await run('npm', ['run', 'build:web'], { cwd: source, timeout: 2_700_000, label: `Build ${project.id}` });
      }
      requireCondition(!interrupted, 'Synchronization interrupted.');
      await syncGame(project.id, source, { root: site });
      const manifest = await localFile(site, `public/previews/${project.id}/game/demo-manifest.json`);
      requireCondition(manifest?.sourceRepo === project.repo && manifest.sourceCommit === revision, `Built revision changed for ${project.id}; refusing to publish.`);
    }
    for (const file of metadataPaths) {
      await mkdir(path.dirname(path.join(site, file)), { recursive: true });
      await writeFile(path.join(site, file), serialize(target));
    }
    await installDependencies(site);
    await run('npm', ['run', 'build'], { cwd: site, timeout: 900_000, label: 'Build homepage' });
    const allowed = [...PROJECTS.filter((project) => project.game).map((project) => `public/previews/${project.id}/game`), ...metadataPaths];
    await run('git', ['add', '--', ...allowed], { cwd: site });
    const staged = await run('git', ['diff', '--cached', '--name-only'], { cwd: site });
    if (!staged) { succeeded = true; console.log('No publishable changes.'); return; }
    requireCondition(staged.split('\n').every((file) => allowed.some((entry) => file === entry || file.startsWith(`${entry}/`))), 'Unexpected file staged; refusing to publish.');
    const latest = await sourceHeads();
    requireCondition(PROJECTS.every((project) => latest.projects[project.id].sourceCommit === target.projects[project.id].sourceCommit), 'Stale build: a source branch changed; retry on the next synchronization.');
    requireCondition((await githubHead(siteRepo, 'main')).sha === start, 'Stale build: homepage main changed; retry on the next synchronization.');
    await run('git', ['commit', '-m', 'chore: sync project main snapshots'], { cwd: site, timeout: 120_000 });
    await run('git', ['push', 'origin', 'HEAD:main'], { cwd: site, timeout: 600_000, label: 'Push homepage main without force' });
    const commit = await run('git', ['rev-parse', 'HEAD'], { cwd: site });
    succeeded = true;
    console.log(serialize({ mode: 'publish', status: 'published', homepageCommit: commit, ...planned }).trim());
  } catch (error) {
    if (temporary) console.error(`Synchronization stopped; retained local build material: ${temporary}`);
    throw error;
  } finally {
    logDirectory = undefined;
    try { if (succeeded && temporary) await rm(temporary, { recursive: true, force: true }); }
    finally { await releaseLock(); }
  }
}

async function liveJson(relative, optional = false) {
  const response = await fetch(`${liveOrigin}/${relative}`, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30_000) });
  if (optional && response.status === 404) return null;
  requireCondition(response.ok, `Live ${relative} returned HTTP ${response.status}.`);
  let bytes = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    bytes += chunk.length;
    requireCondition(bytes <= 2 * 1024 * 1024, `Live ${relative} exceeds its size limit.`);
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (optional && response.headers.get('content-type')?.includes('text/html') && /^\s*(?:<!doctype html|<html)[\s>]/i.test(text)) return null;
  return JSON.parse(text);
}

async function verifyLive() {
  const current = await baseline((file) => localFile(root, file));
  const bootstrap = Object.keys(current.metadata.projects).length === 0;
  const live = validateMetadata(await liveJson('knowledge/project-main.json', bootstrap) ?? emptyMetadata());
  requireCondition(serialize(live) === serialize(current.metadata), 'Live project main metadata differs from this checkout; wait for deployment or use the deployed checkout.');
  for (const project of PROJECTS.filter((entry) => entry.game)) {
    const manifest = await liveJson(`previews/${project.id}/game/demo-manifest.json`, bootstrap && !current.commits[project.id]);
    if (!manifest && !current.commits[project.id]) continue;
    requireCondition(manifest?.sourceRepo === project.repo && shaPattern.test(manifest.sourceCommit) && manifest.sourceCommit === current.commits[project.id], `Live demo revision differs for ${project.id}.`);
    requireCondition(serialize(manifest) === serialize(current.manifests[project.id]), `Live demo manifest differs for ${project.id}.`);
  }
  console.log('Live project main metadata and three game manifests match this checkout.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const stop = () => { interrupted = true; killChild('SIGTERM'); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  try {
    const args = process.argv.slice(2);
    requireCondition(args.length <= 1 && (!args.length || ['--check', '--publish', '--verify-live', '--help'].includes(args[0])), 'Use --help for supported arguments.');
    const mode = args[0] ?? '--check';
    if (mode === '--help') console.log('Usage: node tools/sync-project-main.mjs [--check | --publish | --verify-live]\nDefault: compare five upstream main/master branches with GitHub homepage main.\n--publish builds changed games in temporary checkouts, builds the homepage and pushes normally.\nRequires Node, authenticated gh, configured Git author and Cocos Creator 3.8.8 (COCOS_CREATOR optional).\n--verify-live compares this checkout with irop.one without GitHub credentials.');
    else if (mode === '--publish') await publish();
    else if (mode === '--verify-live') await verifyLive();
    else await check();
  } catch (error) { console.error(`Project main sync failed: ${error.message}`); process.exitCode = 1; }
  finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); }
}
