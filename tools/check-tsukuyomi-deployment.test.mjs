import test from 'node:test';
import assert from 'node:assert/strict';
import { compareRelease, checkDeployment } from './check-tsukuyomi-deployment.mjs';

const css = 'a'.repeat(64);
const manifest = 'b'.repeat(64);
const release = () => ({ tag_name: '1.2.0', draft: false, prerelease: false, assets: [
  { name: 'theme.css', state: 'uploaded', digest: `sha256:${css}` },
  { name: 'manifest.json', state: 'uploaded', digest: `sha256:${manifest}` },
] });
const deployed = () => ({ sourceRepo: 'kuguya-AI-app-develop/tsukuyomi-Obsidian-theme', version: '1.2.0', cssSha256: css, manifestSha256: manifest });

test('compares production metadata, so generated assets need no bot commits', () => {
  assert.deepEqual(compareRelease(release(), deployed()), { changed: false, version: '1.2.0' });
  assert.equal(compareRelease(release(), null).changed, true);
  assert.equal(compareRelease(release(), { ...deployed(), version: '1.1.0' }).changed, true);
});
test('same-version asset replacement is detected', () => {
  assert.equal(compareRelease(release(), { ...deployed(), cssSha256: 'c'.repeat(64) }).changed, true);
});
test('does not trigger on a draft, preview, malformed tag or incomplete upload', () => {
  for (const change of [{ draft: true }, { prerelease: true }, { tag_name: '1.2.0\nchanged=true' }, { assets: [] }]) {
    assert.throws(() => compareRelease({ ...release(), ...change }, deployed()));
  }
});
test('a site outage fails the check instead of continuously redeploying', async () => {
  const urls = [];
  await assert.rejects(checkDeployment(async url => {
    urls.push(url);
    return urls.length === 1 ? Response.json(release()) : new Response('', { status: 503 });
  }), /HTTP 503/);
});
test('old SPA fallback means metadata has not yet been deployed', async () => {
  const calls = [];
  const result = await checkDeployment(async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1 ? Response.json(release()) : new Response('<html>old site</html>', { headers: { 'Content-Type': 'text/html' } });
  });
  assert.equal(result.changed, true);
  assert.equal(calls[1].options.headers.Authorization, undefined);
  assert.ok(calls.every(call => call.options.redirect === 'error'));
});
