import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { SOURCE_REPO, syncTsukuyomi } from './sync-tsukuyomi.mjs';

const preview = 'public/previews/tsukuyomi';
const knowledgePath = 'public/knowledge/irop-skill.md';
const apiUrl = `https://api.github.com/repos/${SOURCE_REPO}/releases/latest`;
const assetBase = `https://github.com/${SOURCE_REPO}/releases/download/1.2.0/`;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

function upstream({ manifest = {}, css = '/* MIT licensed theme */\nbody { color: teal; }\n' } = {}) {
  const files = {
    'manifest.json': JSON.stringify({ name: 'Tsukuyomi', version: '1.2.0', minAppVersion: '1.13.7', ...manifest }),
    'theme.css': css,
    LICENSE: 'MIT License\nCopyright test\n',
    'NOTICE.md': '# Tsukuyomi\nThird-party character rights remain reserved.\n',
  };
  files['SHA256SUMS.txt'] = `${hash(files['manifest.json'])}  manifest.json\n${hash(files['theme.css'])}  theme.css\n`;
  const release = {
    tag_name: '1.2.0', draft: false, prerelease: false, published_at: '2026-09-17T13:59:36Z',
    html_url: `https://github.com/${SOURCE_REPO}/releases/tag/1.2.0`,
    assets: ['manifest.json', 'theme.css', 'SHA256SUMS.txt'].map((name) => ({ name, size: Buffer.byteLength(files[name]), browser_download_url: assetBase + name })),
  };
  const routes = new Map([
    [apiUrl, () => new Response(JSON.stringify(release))],
    [`https://api.github.com/repos/${SOURCE_REPO}/releases/tags/1.2.0`, () => new Response(JSON.stringify(release))],
    ...Object.keys(files).map((name) => [
      ['LICENSE', 'NOTICE.md'].includes(name) ? `https://raw.githubusercontent.com/${SOURCE_REPO}/1.2.0/${name}` : assetBase + name,
      () => new Response(files[name]),
    ]),
  ]);
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    const route = routes.get(url);
    if (!route) throw new Error(`Unexpected request: ${url}`);
    return route(options);
  };
  return { files, release, routes, calls, fetchImpl };
}

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tsukuyomi-sync-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, preview), { recursive: true });
  await mkdir(path.join(root, 'public/knowledge'), { recursive: true });
  await writeFile(path.join(root, knowledgePath), '# Knowledge\nKeep other project facts.\n<!-- TSUKUYOMI_RELEASE_START -->\nOld release.\n<!-- TSUKUYOMI_RELEASE_END -->\nKeep footer.\n');
  for (const name of ['theme.css', 'manifest.json', 'LICENSE', 'NOTICE.md', 'release.json']) await writeFile(path.join(root, preview, name), `old ${name}`);
  return root;
}

async function snapshot(root) {
  const result = {};
  for (const directory of [preview, 'public/knowledge']) {
    for (const name of await readdir(path.join(root, directory))) result[`${directory}/${name}`] = await readFile(path.join(root, directory, name), 'utf8');
  }
  return result;
}

test('sync uses release bytes and stable provenance; check is read-only and a second sync is identical', async (t) => {
  const root = await fixture(t);
  const remote = upstream();
  const before = await snapshot(root);
  assert.equal((await syncTsukuyomi({ root, fetchImpl: remote.fetchImpl, check: true })).changed, true);
  assert.deepEqual(await snapshot(root), before);
  const result = await syncTsukuyomi({ root, fetchImpl: remote.fetchImpl, version: '1.2.0', token: 'test-api-only-token' });
  assert.equal(result.changed, true);
  const after = await snapshot(root);
  for (const name of ['theme.css', 'manifest.json', 'LICENSE', 'NOTICE.md']) assert.equal(after[`${preview}/${name}`], remote.files[name]);
  const metadata = JSON.parse(after[`${preview}/release.json`]);
  assert.deepEqual(metadata, {
    version: '1.2.0', tag: '1.2.0', sourceRepo: SOURCE_REPO,
    releaseUrl: `https://github.com/${SOURCE_REPO}/releases/tag/1.2.0`, publishedAt: '2026-09-17T13:59:36Z',
    cssSha256: hash(remote.files['theme.css']), manifestSha256: hash(remote.files['manifest.json']),
  });
  assert.match(after[knowledgePath], /^# Knowledge\nKeep other project facts\./);
  assert.match(after[knowledgePath], /1\.2\.0.*1\.13\.7/);
  assert.match(after[knowledgePath], /Keep footer\.\n$/);
  assert.equal((await syncTsukuyomi({ root, fetchImpl: remote.fetchImpl })).changed, false);
  assert.deepEqual(await snapshot(root), after);
  assert(remote.calls.some(({ url, options }) => url.includes('/tags/') && options.headers.Authorization === 'Bearer test-api-only-token'));
  assert(remote.calls.filter(({ url }) => !url.startsWith('https://api.github.com/')).every(({ options }) => !options.headers.Authorization));
});

const rejectionCases = [
  ['bad checksum', (remote) => { remote.files['theme.css'] = remote.files['theme.css'].replace('teal', 'pink'); }, /Checksum mismatch/],
  ['wrong manifest version', (remote) => { remote.files['manifest.json'] = remote.files['manifest.json'].replace('1.2.0', '1.2.1'); remote.files['SHA256SUMS.txt'] = `${hash(remote.files['manifest.json'])}  manifest.json\n${hash(remote.files['theme.css'])}  theme.css\n`; }, /Manifest name\/version/],
  ['wrong theme name', (remote) => { remote.files['manifest.json'] = remote.files['manifest.json'].replace('Tsukuyomi', 'Othername'); remote.files['SHA256SUMS.txt'] = `${hash(remote.files['manifest.json'])}  manifest.json\n${hash(remote.files['theme.css'])}  theme.css\n`; }, /Manifest name\/version/],
  ['draft', (remote) => { remote.release.draft = true; }, /Only published stable/],
  ['prerelease', (remote) => { remote.release.prerelease = true; }, /Only published stable/],
  ['missing published date', (remote) => { remote.release.published_at = null; }, /Invalid published release/],
  ['moving main tag', (remote) => { remote.release.tag_name = 'main'; }, /Invalid release tag/],
  ['untrusted asset URL', (remote) => { remote.release.assets[0].browser_download_url = 'https://example.com/manifest.json'; }, /Invalid release asset/],
  ['duplicate asset', (remote) => { remote.release.assets.push(remote.release.assets[0]); }, /Invalid release asset/],
  ['oversized asset metadata', (remote) => { remote.release.assets[1].size = 1024 * 1024; }, /Invalid release asset/],
  ['halfway download failure', (remote) => { remote.routes.set(assetBase + 'theme.css', () => new Response('Unavailable', { status: 503 })); }, /download failed \(503\)/],
  ['copyright download failure', (remote) => { remote.routes.set(`https://raw.githubusercontent.com/${SOURCE_REPO}/1.2.0/NOTICE.md`, () => new Response('', { status: 404 })); }, /download failed \(404\)/],
  ['bad content length', (remote) => { remote.routes.set(assetBase + 'theme.css', () => new Response('x', { headers: { 'content-length': String(1024 * 1024) } })); }, /exceeds size limit/],
  ['oversized streamed response', (remote) => { remote.routes.set(assetBase + 'theme.css', () => new Response('x'.repeat(512 * 1024 + 1))); }, /exceeds size limit/],
  ['untrusted redirect', (remote) => { remote.routes.set(assetBase + 'theme.css', () => new Response(null, { status: 302, headers: { location: 'https://example.com/exfiltrate' } })); }, /Untrusted download redirect/],
  ['API token redirect', (remote) => { remote.routes.set(apiUrl, () => new Response(null, { status: 302, headers: { location: 'https://example.com/exfiltrate' } })); }, /Untrusted download redirect/],
  ['invalid min app version', (remote) => { remote.files['manifest.json'] = remote.files['manifest.json'].replace('1.13.7', 'latest'); remote.files['SHA256SUMS.txt'] = `${hash(remote.files['manifest.json'])}  manifest.json\n${hash(remote.files['theme.css'])}  theme.css\n`; }, /minimum Obsidian version/],
];

for (const [name, corrupt, expected] of rejectionCases) {
  test(`${name} leaves every existing resource unchanged`, async (t) => {
    const root = await fixture(t);
    const before = await snapshot(root);
    const remote = upstream();
    corrupt(remote);
    await assert.rejects(syncTsukuyomi({ root, fetchImpl: remote.fetchImpl, token: 'test-api-only-token' }), expected);
    assert.deepEqual(await snapshot(root), before);
    assert(remote.calls.every(({ url }) => !url.includes('example.com')));
  });
}

test('a release-assets redirect works without leaking the API token', async (t) => {
  const root = await fixture(t);
  const remote = upstream();
  const signed = 'https://release-assets.githubusercontent.com/github-production-release-asset/test?signature=test';
  remote.routes.set(assetBase + 'theme.css', () => new Response(null, { status: 302, headers: { location: signed } }));
  remote.routes.set(signed, () => new Response(remote.files['theme.css']));
  await syncTsukuyomi({ root, fetchImpl: remote.fetchImpl, token: 'test-api-only-token' });
  assert.equal(remote.calls.find(({ url }) => url === signed).options.headers.Authorization, undefined);
});

test('missing or duplicate marker block fails without modifying resources', async (t) => {
  const root = await fixture(t);
  const remote = upstream();
  for (const content of ['# No marker block\n', '<!-- TSUKUYOMI_RELEASE_START --><!-- TSUKUYOMI_RELEASE_END --><!-- TSUKUYOMI_RELEASE_END -->']) {
    await writeFile(path.join(root, knowledgePath), content);
    const before = await snapshot(root);
    await assert.rejects(syncTsukuyomi({ root, fetchImpl: remote.fetchImpl }), /Expected one Tsukuyomi release marker block/);
    assert.deepEqual(await snapshot(root), before);
  }
});

test('request abort signal bounds waiting and preserves current release', async (t) => {
  const root = await fixture(t);
  const before = await snapshot(root);
  // The interval keeps Node alive while AbortSignal.timeout uses an unref timer.
  const keepAlive = setInterval(() => {}, 100);
  try {
    await assert.rejects(syncTsukuyomi({ root, timeoutMs: 15, fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })) }), /timeout/i);
  } finally { clearInterval(keepAlive); }
  assert.deepEqual(await snapshot(root), before);
});

test('invalid requested version makes no network request', async () => {
  await assert.rejects(syncTsukuyomi({ version: '../main', fetchImpl: () => { throw new Error('Network must not be used'); } }), /requested version/);
});
