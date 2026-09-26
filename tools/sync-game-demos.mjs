import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Supply local source checkouts explicitly; this tool never downloads private repositories.
// Example: node tools/sync-game-demos.mjs --ranlu /path/to/ranlu --jingang-guild /path/to/jingang-guild --naiwa-yuushiya /path/to/naiwa-yuushiya-table-game
const root = fileURLToPath(new URL('..', import.meta.url));
export const games = {
  ranlu: { repo: 'ranlu', export: 'cocos/build/web-mobile', inputs: 'cocos/assets', title: '染路 · Ranlu' },
  'jingang-guild': { repo: 'jingang-guild', export: 'build/web-mobile', inputs: 'assets', title: '晶港商会 · Crystal Harbor Guild' },
  'naiwa-yuushiya': { repo: 'naiwa-yuushiya-table-game', title: '如果有勇者在的話就好了 · 单机试玩' },
};
const runtimeFiles = new Set(['index.html', 'index.js', 'application.js', 'style.css']);
const runtimeDirectories = new Set(['assets', 'src', 'cocos-js']);
const runtimeExtensions = new Set(['.html', '.js', '.css', '.json', '.bin', '.wasm', '.png', '.jpg', '.jpeg', '.webp', '.wav', '.mp3', '.ogg', '.ttf', '.woff', '.woff2']);
const maxBytes = 25 * 1024 * 1024;

async function filesIn(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symbolic links are not runtime assets: ${relative}`);
    if (entry.isDirectory()) files.push(...await filesIn(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`Unsupported runtime entry: ${relative}`);
  }
  return files.sort();
}

function sourceRevision(source, game) {
  const run = (...args) => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8' }).trim();
  const inputs = game.export ? [game.inputs] : ['packages/client', 'packages/core', 'package-lock.json'];
  if (run('status', '--porcelain', '--untracked-files=no', '--', ...inputs)) {
    throw new Error('Game source has tracked changes; use a clean source revision for a reproducible demo.');
  }
  return run('rev-parse', 'HEAD');
}

function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0 || text.indexOf(from, first + from.length) >= 0) {
    throw new Error(`Naiwa source changed: review the offline demo adapter (${label}).`);
  }
  return text.slice(0, first) + to + text.slice(first + from.length);
}

function replaceBetween(text, start, end, replacement, label) {
  const first = text.indexOf(start);
  const last = text.indexOf(end, first + start.length);
  if (first < 0 || last < 0) throw new Error(`Naiwa source changed: review the offline demo adapter (${label}).`);
  return text.slice(0, first) + replacement + text.slice(last);
}

// The public prototype uses the existing solo UI/rules. Remote lobby and controller
// are removed at build time so there is no unusable WebSocket endpoint in this demo.
function offlineNaiwaUi(source) {
  let text = source;
  for (const [from, to, label] of [
    ["import type { RoomInfo } from '@naiwa/server/protocol';\n", '', 'room type'],
    ["import { LocalController, RemoteController, type TableController } from './controller';", "import { LocalController, type TableController } from './controller';", 'controller import'],
    ["import { recordRows } from './records';\n", '', 'room records'],
    ['  let remote: RemoteController | null = null;\n', '', 'remote state'],
    ["  let connStatus: 'connecting' | 'open' | 'closed' = 'open';\n", '', 'connection state'],
    ['    remote = null;\n', '', 'remote cleanup'],
    ["    connStatus = 'open';\n", '', 'connection setup'],
    ['    const room = remote?.getRoom() ?? null;\n', '', 'end room'],
    ['    const isHost = !remote || room?.hostId === remote.getPlayerId();\n', '', 'end host'],
    ['        ${room ? `<div class="player-list">${recordsHtml(room)}</div>` : \'\'}\n', '', 'end room records'],
    ["${remote ? (isHost ? '再来一局' : '等待房主再来一局') : '再来一局'}", '再来一局', 'restart label'],
    ['    again.disabled = remote !== null && !isHost;\n', '', 'restart state'],
  ]) text = replaceOnce(text, from, to, label);
  text = replaceBetween(text, '        <div class="tabs">', '        <div class="panel" id="panel-local">', '        <div class="hint-line">单机 + BOT 试玩 · 开发中原型</div>\n', 'lobby tabs');
  text = replaceBetween(text, '        <div class="panel" id="panel-remote" hidden>', '        <div class="hint-line err" id="lobby-err">', '', 'remote panels');
  text = replaceBetween(text, "    const tabLocal = $('#tab-local');", "    $('#l-start').onclick = () => {", '', 'tab handlers');
  text = replaceBetween(text, '    const connectRemote = ', '  // ---------- 对局 ----------', '  }\n\n', 'remote handlers');
  text = replaceBetween(text, "    $('#tb-conn').innerHTML =", "    $('#opponents').innerHTML =", "    $('#tb-conn').textContent = '单机 · BOT';\n\n", 'connection indicator');
  if (/RemoteController|\bremote\b|WebSocket|ws:\/\//.test(text)) throw new Error('Naiwa offline adapter left remote functionality in the UI.');
  return text;
}

async function buildNaiwa(source, output) {
  const require = createRequire(path.join(source, 'package.json'));
  let vitePath;
  try { vitePath = require.resolve('vite'); }
  catch { throw new Error('Naiwa dependencies are missing. Run npm ci in that source checkout first.'); }
  const { build } = await import(pathToFileURL(vitePath).href);
  const client = path.join(source, 'packages/client');
  await build({
    root: client,
    configFile: false,
    base: './',
    publicDir: false,
    cacheDir: path.join(output, '.vite-cache'),
    logLevel: 'warn',
    plugins: [{
      name: 'homepage-offline-naiwa-demo',
      enforce: 'pre',
      transform(code, id) {
        if (id === path.join(client, 'src/ui.ts')) return { code: offlineNaiwaUi(code), map: null };
        if (id === path.join(client, 'src/controller.ts')) {
          const marker = '/** 最小 WebSocket 结构：';
          const end = code.indexOf(marker);
          if (end < 0) throw new Error('Naiwa controller changed: review the offline demo adapter.');
          return { code: code.slice(0, end), map: null };
        }
      },
    }],
    build: { outDir: output, emptyOutDir: true, sourcemap: false, minify: 'esbuild' },
  });
}

async function copyCocosExport(source, game, output) {
  const exported = path.join(source, game.export);
  const settings = JSON.parse(await readFile(path.join(exported, 'src/settings.json'), 'utf8'));
  if (settings.engine?.debug !== false || settings.assets?.server || settings.assets?.remoteBundles?.length) {
    throw new Error('Expected a production Cocos Web export with same-origin assets.');
  }
  const builtAt = (await stat(path.join(exported, 'index.html'))).mtimeMs;
  for (const file of await filesIn(path.join(source, game.inputs))) {
    if ((await stat(path.join(source, game.inputs, file))).mtimeMs > builtAt) {
      throw new Error('Cocos export is older than the game assets. Run npm run build:web in the source checkout.');
    }
  }
  for (const file of await filesIn(exported)) {
    const top = file.split('/')[0];
    if ((!runtimeFiles.has(file) && !runtimeDirectories.has(top)) || !runtimeExtensions.has(path.extname(file))) continue;
    const target = path.join(output, file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(exported, file), target);
  }
}

async function finalize(output, id, game, revision) {
  const htmlPath = path.join(output, 'index.html');
  let html = await readFile(htmlPath, 'utf8');
  html = html.replace(/<html(?: lang="[^"]*")?>/, '<html lang="zh-CN">').replace(/<title>[^<]*<\/title>/, `<title>${game.title}</title>`);
  await writeFile(htmlPath, html);
  const files = {};
  let bytes = 0;
  for (const file of await filesIn(output)) {
    if (!runtimeExtensions.has(path.extname(file))) throw new Error(`Unexpected public runtime file: ${file}`);
    const content = await readFile(path.join(output, file));
    bytes += content.length;
    if (bytes > maxBytes) throw new Error('Demo exceeds the 25 MiB runtime budget.');
    if (/\.(js|css|html|json)$/.test(file)) {
      const text = content.toString('utf8');
      if (/sourceMappingURL=|\/Users\/|\/home\/|(?:localhost|127\.0\.0\.1):\d/.test(text)) throw new Error(`Development-only content in ${file}`);
      if (id === 'naiwa-yuushiya' && /WebSocket|ws:\/\/|wss:\/\/|panel-remote/.test(text)) throw new Error('Remote code reached the offline Naiwa bundle.');
    }
    files[file] = { bytes: content.length, sha256: createHash('sha256').update(content).digest('hex') };
  }
  await writeFile(path.join(output, 'demo-manifest.json'), `${JSON.stringify({
    sourceRepo: `kuguya-AI-app-develop/${game.repo}`,
    sourceCommit: revision,
    runtime: id === 'naiwa-yuushiya' ? 'DOM offline prototype' : 'Cocos Creator 3.8.8 Web',
    entry: 'index.html',
    offline: true,
    files,
  }, null, 2)}\n`);
  return { game: id, runtimeFiles: Object.keys(files).length, runtimeBytes: bytes, sourceCommit: revision };
}

export async function syncGame(id, source, { root: destinationRoot = root } = {}) {
  if (!Object.hasOwn(games, id)) throw new Error(`Unknown game: ${id}`);
  const game = games[id];
  const revision = sourceRevision(source, game);
  const temporary = await mkdtemp(path.join(tmpdir(), `homepage-${id}-`));
  const output = path.join(temporary, 'game');
  await mkdir(output);
  try {
    if (game.export) await copyCocosExport(source, game, output);
    else await buildNaiwa(source, output);
    const summary = await finalize(output, id, game, revision);
    const destination = path.join(destinationRoot, 'public/previews', id, 'game');
    await mkdir(path.dirname(destination), { recursive: true });
    const previous = await lstat(destination).catch((error) => { if (error.code !== 'ENOENT') throw error; return null; });
    if (previous && (!previous.isDirectory() || previous.isSymbolicLink())) throw new Error('Demo destination must be a regular directory.');
    if (previous) {
      // Only replace directories previously managed by this tool.
      const manifest = JSON.parse(await readFile(path.join(destination, 'demo-manifest.json'), 'utf8'));
      if (manifest.sourceRepo !== `kuguya-AI-app-develop/${game.repo}`) throw new Error('Unexpected existing demo manifest.');
      const expected = new Set([...Object.keys(manifest.files), 'demo-manifest.json']);
      if ((await filesIn(destination)).some((file) => !expected.has(file))) throw new Error('Unmanaged files in the existing game directory; move them before synchronizing.');
      await rename(destination, path.join(temporary, 'previous'));
    }
    try { await rename(output, destination); }
    catch (error) {
      if (previous) await rename(path.join(temporary, 'previous'), destination);
      throw error;
    }
    console.log(JSON.stringify(summary));
    return summary;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help')) {
    console.log('Usage: node tools/sync-game-demos.mjs [--ranlu SOURCE] [--jingang-guild SOURCE] [--naiwa-yuushiya SOURCE]');
  } else {
    try {
      const requested = new Set();
      while (args.length) {
        const flag = args.shift();
        const id = flag?.slice(2);
        const source = args.shift();
        if (!flag?.startsWith('--') || !Object.hasOwn(games, id) || !source || source.startsWith('--') || requested.has(id)) throw new Error('Expected unique game flags and local source directories. Use --help for usage.');
        requested.add(id);
        await syncGame(id, path.resolve(source));
      }
    } catch (error) {
      console.error(`Game demo sync failed: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
