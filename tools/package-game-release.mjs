import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { games, syncGame } from './sync-game-demos.mjs';
import { validateBundle } from './sync-project-releases.mjs';

const packageName = 'irop-web-demo.json.gz';
const maxRuntimeBytes = 25 * 1024 * 1024;
const maxPackageBytes = 40 * 1024 * 1024;
const sha256 = (content) => createHash('sha256').update(content).digest('hex');
const shellQuote = (value) => `'${value.replaceAll("'", "'\\''")}'`;

function parseArgs(args) {
  const options = {};
  while (args.length) {
    const flag = args.shift();
    if (!['--game', '--version', '--source', '--output', '--skip-build'].includes(flag) || Object.hasOwn(options, flag)) {
      throw new Error(`Unexpected or repeated argument: ${flag}. Use --help for usage.`);
    }
    if (flag === '--skip-build') options[flag] = true;
    else {
      const value = args.shift();
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}.`);
      options[flag] = value;
    }
  }
  if (!Object.hasOwn(games, options['--game'])) throw new Error('Choose ranlu, jingang-guild, or naiwa-yuushiya.');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(options['--version'] ?? '')) throw new Error('Version must be a safe tag of 1–80 letters, digits, dots, underscores, or hyphens.');
  if (!options['--source'] || !options['--output']) throw new Error('--source and --output are required.');
  return {
    id: options['--game'], version: options['--version'],
    source: path.resolve(options['--source']), output: path.resolve(options['--output']),
    skipBuild: options['--skip-build'] === true,
  };
}

function validatePath(file) {
  if (file.length > 512 || !/^[A-Za-z0-9_@.-]+(?:\/[A-Za-z0-9_@.-]+)*$/.test(file)
    || file.split('/').some((part) => part.startsWith('.') || ['__proto__', 'prototype', 'constructor'].includes(part))
    || file === 'demo-manifest.json') throw new Error(`Unsafe runtime path: ${file}`);
}

async function runtimeFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Runtime symlink: ${relative}`);
    if (entry.isDirectory()) files.push(...await runtimeFiles(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`Unexpected runtime entry: ${relative}`);
  }
  return files.sort();
}

async function readPackage(directory, id, version, revision) {
  const manifest = JSON.parse(await readFile(path.join(directory, 'demo-manifest.json'), 'utf8'));
  if (manifest.sourceRepo !== `kuguya-AI-app-develop/${games[id].repo}`
    || manifest.sourceCommit !== revision || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(revision)
    || manifest.entry !== 'index.html' || manifest.offline !== true
    || !manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) {
    throw new Error('Unexpected generated demo manifest.');
  }
  const expected = Object.keys(manifest.files).sort();
  const actual = (await runtimeFiles(directory)).filter((file) => file !== 'demo-manifest.json');
  if (!expected.includes('index.html') || JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Runtime files do not match the manifest.');
  const files = Object.create(null);
  let total = 0;
  for (const file of expected) {
    validatePath(file);
    const content = await readFile(path.join(directory, file));
    const metadata = manifest.files[file];
    total += content.length;
    if (total > maxRuntimeBytes) throw new Error('Demo exceeds the 25 MiB runtime budget.');
    if (!metadata || metadata.bytes !== content.length || metadata.sha256 !== sha256(content)) throw new Error(`Runtime hash or size mismatch: ${file}`);
    files[file] = content.toString('base64');
  }
  const json = Buffer.from(JSON.stringify({ schemaVersion: 1, game: id, version, manifest, files }), 'utf8');
  if (json.length > maxPackageBytes) throw new Error('Uncompressed release package exceeds 40 MiB.');
  const compressed = gzipSync(json, { level: 9 });
  if (compressed.length > maxPackageBytes) throw new Error('Compressed release package exceeds 40 MiB.');
  return compressed;
}

async function existingFileMatches(file, content) {
  const existing = await lstat(file).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (!existing) return false;
  if (!existing.isFile() || existing.isSymbolicLink() || !(await readFile(file)).equals(content)) {
    throw new Error(`Refusing to overwrite a different file: ${file}`);
  }
  return true;
}

async function main(options) {
  const { id, source, output, version, skipBuild } = options;
  if (games[id].export && !skipBuild) {
    execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build:web'], { cwd: source, stdio: 'inherit' });
  }
  const temporary = await mkdtemp(path.join(tmpdir(), `irop-release-${id}-`));
  try {
    const summary = await syncGame(id, source, { root: temporary });
    const compressed = await readPackage(path.join(temporary, 'public/previews', id, 'game'), id, version, summary.sourceCommit);
    const repo = `kuguya-AI-app-develop/${games[id].repo}`;
    await validateBundle(compressed, { id, repo, game: true }, { version, assetSha256: sha256(compressed) });
    const artifacts = [
      [path.join(output, packageName), compressed],
      [path.join(output, 'SHA256SUMS.txt'), Buffer.from(`${sha256(compressed)}  ${packageName}\n`)],
    ];
    // Check both paths before creating either artifact. Exclusive writes also guard races.
    for (const [file, content] of artifacts) await existingFileMatches(file, content);
    await mkdir(output, { recursive: true });
    for (const [file, content] of artifacts) {
      try { await writeFile(file, content, { flag: 'wx' }); }
      catch (error) {
        if (error.code !== 'EEXIST' || !await existingFileMatches(file, content)) throw error;
      }
    }
    console.log(`Prepared ${id} ${version}: ${compressed.length} compressed bytes in ${output}`);
    console.log('Next: upload both files to a draft release, then publish when ready:');
    console.log(`gh release create ${shellQuote(version)} ${artifacts.map(([file]) => shellQuote(file)).join(' ')} --repo ${shellQuote(repo)} --target ${summary.sourceCommit} --draft --title ${shellQuote(version)} --notes 'Web demo release'`);
    console.log(`gh release edit ${shellQuote(version)} --repo ${shellQuote(repo)} --draft=false`);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log('Usage: node tools/package-game-release.mjs --game ranlu|jingang-guild|naiwa-yuushiya --version TAG --source DIR --output DIR [--skip-build]');
  console.log('Cocos exports are built by default. --skip-build reuses an export with the existing freshness checks. Naiwa always builds its offline demo.');
} else {
  try { await main(parseArgs(args)); }
  catch (error) {
    console.error(`Game release packaging failed: ${error.message}`);
    process.exitCode = 1;
  }
}
