import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const upstream = 'kuguya-AI-app-develop/tsukuyomi-Obsidian-theme';
const deployedUrl = 'https://irop.one/previews/tsukuyomi/release.json';

export function compareRelease(release, deployed) {
  const version = release?.tag_name;
  if (!/^\d+\.\d+\.\d+$/.test(version ?? '') || release.draft || release.prerelease) {
    throw new Error('Expected a published stable Tsukuyomi release.');
  }
  const digests = {};
  for (const name of ['theme.css', 'manifest.json']) {
    const assets = release.assets?.filter(asset => asset.name === name) ?? [];
    if (assets.length !== 1 || assets[0].state !== 'uploaded' || !/^sha256:[a-f0-9]{64}$/.test(assets[0].digest ?? '')) {
      throw new Error(`Release is not ready: ${name} must have an uploaded SHA-256 digest.`);
    }
    digests[name] = assets[0].digest.slice(7);
  }
  const changed = deployed?.sourceRepo !== upstream || deployed?.version !== version
    || deployed?.cssSha256 !== digests['theme.css'] || deployed?.manifestSha256 !== digests['manifest.json'];
  return { changed, version };
}

export async function checkDeployment(fetcher = fetch) {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
  // Authentication goes only to this fixed GitHub API URL; never forward it to the site.
  const upstreamResponse = await fetcher(`https://api.github.com/repos/${upstream}/releases/latest`, {
    headers, redirect: 'error', signal: AbortSignal.timeout(20000),
  });
  if (!upstreamResponse.ok) throw new Error(`GitHub release lookup failed: HTTP ${upstreamResponse.status}`);
  const release = await upstreamResponse.json();
  const siteResponse = await fetcher(deployedUrl, {
    headers: { 'Cache-Control': 'no-cache' }, redirect: 'error', signal: AbortSignal.timeout(20000),
  });
  let deployed = null;
  if (siteResponse.ok) {
    // The previous SPA can return HTML for this not-yet-created metadata file.
    const contentType = siteResponse.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) deployed = await siteResponse.json();
  } else if (siteResponse.status !== 404) {
    throw new Error(`Deployed release lookup failed: HTTP ${siteResponse.status}`);
  }
  return compareRelease(release, deployed);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await checkDeployment();
    if (process.env.GITHUB_OUTPUT) {
      await appendFile(process.env.GITHUB_OUTPUT, `changed=${result.changed}\nversion=${result.version}\n`);
    }
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
