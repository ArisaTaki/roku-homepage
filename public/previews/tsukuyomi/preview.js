// Preview controls belong to this browser demo, not to the installed CSS theme.
const query = new URLSearchParams(location.search);
const embedded = query.get("embed") === "1";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const text = {
  zh: {
    tagline: "月光落在笔记之间。", language: "语言", intro: "将月读夜景放进 Obsidian：让鱼群游过留白，让阅读回到安静。",
    dark: "月读夜景", light: "月白", scene: "空白场景", reading: "阅读笔记", static: "静态场景", minimal: "简洁模式",
    folder: "月读手帖", sceneFile: "00 · 月读入口", noteFile: "01 · 把夜色写进笔记", ideas: "02 · 灵感与碎片", links: "03 · 星光的连线",
    welcome: "欢迎来到月读", welcomeSubtitle: "留一片夜色，等下一个念头。", openNote: "打开示例笔记 ↗", sceneHint: "光鱼 · 鸟居 · 四位小伙伴",
    noteTitle: "把夜色写进笔记", noteIntro: "窗外是流动的光，纸上是安静的字。月读把热闹留给空白页，把注意力还给正在写作的人。",
    quote: "好的主题，是每次打开笔记时，刚刚好的陪伴。", noteHeading: "为阅读留白", noteBody: "深蓝灰与月白两套色板，搭配青绿、朱红和一点点金色。正文保持纯色背景，沿用你自己的字体。",
    calloutTitle: "✧ 小小的约定", callout: "场景只在空白页与工作区边缘出现。阅读时，文字始终是主角。", details: "细节备忘",
    detailOne: "40rem 默认阅读宽度，1.75 倍行高", detailTwo: "无需插件；可用 Style Settings 调整五项设置", detailThree: "支持系统减少动态效果，也可以切换静态场景",
    noteEnd: "写下此刻，留待重逢。", status: "本地主题预览", disclaimer: "此页面用主题原始 CSS 展示示例界面，并非完整 Obsidian。小屏幕会按比例缩放桌面场景。",
    motionNote: "系统已开启减少动态效果，场景保持静止。", download: "下载主题 1.0.2 ↗", repository: "GitHub 源码 ↗", listing: "官方网页条目 ↗",
    install: "适用于 Obsidian 1.13.7+。将两个文件放入笔记库的 .obsidian/themes/Tsukuyomi/，然后在外观中选择主题。2026-09-16：官方网页已有条目，客户端目录仍待同步，建议手动安装。",
    credit: "ArisaTaki 的非官方粉丝主题 · 免费分享", notice: "素材与权利说明", controls: "预览设置", modeGroup: "配色模式", viewGroup: "预览视图",
  },
  en: {
    tagline: "Moonlight between the lines.", language: "Language", intro: "A little Tsukuyomi nightscape in Obsidian. Fish drift through the empty space; your notes stay quiet.",
    dark: "Moonlit night", light: "Moon white", scene: "Empty scene", reading: "Reading view", static: "Static scene", minimal: "Minimal mode",
    folder: "Moonlit journal", sceneFile: "00 · Welcome to Tsukuyomi", noteFile: "01 · A note after dark", ideas: "02 · Fragments & ideas", links: "03 · Constellations",
    welcome: "Welcome to Tsukuyomi", welcomeSubtitle: "A little night sky for your next thought.", openNote: "Open sample note ↗", sceneHint: "LIGHT FISH · TORII · FOUR COMPANIONS",
    noteTitle: "A note after dark", noteIntro: "Light moves outside the window; words rest on the page. Tsukuyomi keeps its scenery in empty panes, leaving your attention with your writing.",
    quote: "A good theme feels like quiet company whenever you open a note.", noteHeading: "Room to read", noteBody: "Ink-blue and moon-white palettes with turquoise, coral and a touch of gold. Solid reading surfaces keep your chosen fonts intact.",
    calloutTitle: "✧ A small promise", callout: "Scenery belongs in empty panes and around the workspace. In a note, your words take the lead.", details: "Details to keep",
    detailOne: "40rem default reading width and 1.75 line height", detailTwo: "No plugin required; five optional Style Settings controls", detailThree: "Respects reduced motion, with a static scene option",
    noteEnd: "Keep this moment for another day.", status: "Local theme preview", disclaimer: "A sample interface rendered with the original theme CSS, not the full Obsidian app. Small screens show a scaled desktop scene.",
    motionNote: "Your system prefers reduced motion, so the scene stays still.", download: "Download theme 1.0.2 ↗", repository: "Source on GitHub ↗", listing: "Official web listing ↗",
    install: "Requires Obsidian 1.13.7+. Put both files in your vault’s .obsidian/themes/Tsukuyomi/ folder, then select the theme in Appearance. September 16, 2026: the web listing is published; the in-app directory is awaiting synchronization. Use manual installation for now.",
    credit: "An unofficial fan theme by ArisaTaki · Shared free of charge", notice: "Artwork & rights", controls: "Preview controls", modeGroup: "Color mode", viewGroup: "Preview view",
  },
  ja: {
    tagline: "ノートの行間に、月明かりを。", language: "言語", intro: "Obsidian にツクヨミの夜景を。余白に光の魚が泳ぎ、ノートには静けさが残ります。",
    dark: "月読の夜", light: "月白", scene: "空白の風景", reading: "読書ビュー", static: "静かな風景", minimal: "シンプル表示",
    folder: "月読の手帖", sceneFile: "00 · 月読の入口", noteFile: "01 · 夜をノートに", ideas: "02 · アイデアのかけら", links: "03 · 星のつながり",
    welcome: "ツクヨミへようこそ", welcomeSubtitle: "次のひらめきに、少しの夜空を。", openNote: "サンプルノートを開く ↗", sceneHint: "光の魚 · 鳥居 · 四人の仲間",
    noteTitle: "夜をノートに", noteIntro: "窓の外には流れる光、紙の上には静かな文字。月読は風景を空白ページに留め、書く人の集中を守ります。",
    quote: "よいテーマは、ノートを開くたびに静かに寄り添うもの。", noteHeading: "読むための余白", noteBody: "深い青と月白の配色に、青緑、朱色、少しの金色。本文は単色の背景で、お気に入りのフォントをそのまま使えます。",
    calloutTitle: "✧ 小さな約束", callout: "風景は空白ページとワークスペースの縁だけに。ノートでは、言葉が主役です。", details: "細部のメモ",
    detailOne: "既定の読書幅は 40rem、行間は 1.75", detailTwo: "プラグイン不要。Style Settings で五つの設定を調整可能", detailThree: "動きを減らす設定に対応。静止表示への切り替えも可能",
    noteEnd: "今を書き留めて、また会う日へ。", status: "ローカルテーマプレビュー", disclaimer: "テーマ本来の CSS を使ったサンプル画面です。Obsidian 本体ではありません。小さな画面ではデスクトップの風景を縮小して表示します。",
    motionNote: "システムで動きを減らす設定が有効なため、風景は静止します。", download: "テーマ 1.0.2 をダウンロード ↗", repository: "GitHub ソース ↗", listing: "公式ウェブ掲載ページ ↗",
    install: "Obsidian 1.13.7 以降に対応。二つのファイルを保管庫の .obsidian/themes/Tsukuyomi/ に入れ、外観で選択してください。2026年9月16日現在、公式ウェブには掲載済みですがアプリ内一覧は同期待ちです。当面は手動でインストールしてください。",
    credit: "ArisaTaki による非公式ファンテーマ · 無料配布", notice: "素材と権利について", controls: "プレビュー設定", modeGroup: "配色", viewGroup: "表示",
  },
};
const candidate = query.get("lang") || navigator.language.slice(0, 2);
const state = { lang: Object.hasOwn(text, candidate) ? candidate : "en", mode: "dark", view: "scene", minimal: false, static: reducedMotion.matches, playing: !embedded };
document.body.classList.toggle("is-embed", embedded);

// A fixed desktop viewport lets the actual theme's media/container rules behave
// consistently in the small card and in the standalone, resizable preview.
const viewport = document.querySelector(".stage-viewport");
let stage = document.querySelector(".preview-window");
let frame;
if (!embedded) {
  frame = document.createElement("iframe");
  frame.className = "preview-window";
  frame.title = "Tsukuyomi · Obsidian theme";
  frame.src = `./index.html?embed=1&lang=${state.lang}`;
  stage.replaceWith(frame);
  stage = frame;
  frame.addEventListener("load", () => syncFrame());
}
const fitStage = () => {
  const scale = viewport.clientWidth / 1120;
  stage.style.transform = `scale(${scale})`;
  viewport.style.height = `${740 * scale}px`;
};
new ResizeObserver(fitStage).observe(viewport);
fitStage();

function syncFrame() {
  frame?.contentWindow?.postMessage({ type: "tsukuyomi-preview-state", ...state, playing: state.playing && !document.hidden }, location.origin);
}

function render() {
  const copy = text[state.lang];
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : state.lang;
  document.querySelectorAll("[data-copy]").forEach(element => { element.textContent = copy[element.dataset.copy]; });
  document.querySelector(".intro h1 span").textContent = copy.tagline;
  document.querySelector("#language").value = state.lang;
  document.querySelector(".preview-toolbar").setAttribute("aria-label", copy.controls);
  document.querySelectorAll(".control-group")[0].setAttribute("aria-label", copy.modeGroup);
  document.querySelectorAll(".control-group")[1].setAttribute("aria-label", copy.viewGroup);
  document.body.classList.toggle("theme-dark", state.mode === "dark");
  document.body.classList.toggle("theme-light", state.mode === "light");
  document.body.classList.toggle("tk-minimal", state.minimal);
  document.body.classList.toggle("tk-disable-motion", state.static || reducedMotion.matches || !state.playing || document.hidden);
  document.querySelectorAll("[data-mode]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode)));
  document.querySelectorAll("[data-view]").forEach(button => {
    const selected = button.dataset.view === state.view;
    button.setAttribute("aria-pressed", String(selected));
    button.classList.toggle("is-active", selected);
  });
  document.querySelector("#motion-toggle").setAttribute("aria-pressed", String(state.static || reducedMotion.matches));
  document.querySelector("#motion-toggle").disabled = reducedMotion.matches;
  document.querySelector("#minimal-toggle").setAttribute("aria-pressed", String(state.minimal));
  document.querySelector("#motion-note").hidden = !reducedMotion.matches;
  const scenePane = document.querySelector("#scene-pane");
  const readingPane = document.querySelector("#reading-pane");
  if (scenePane) scenePane.hidden = state.view !== "scene";
  if (readingPane) readingPane.hidden = state.view !== "reading";
  syncFrame();
}
document.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => { state.mode = button.dataset.mode; render(); }));
document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => {
  state.view = button.dataset.view;
  render();
  if (embedded) parent.postMessage({ type: "tsukuyomi-preview-view", view: state.view }, location.origin);
}));
document.querySelector("#motion-toggle").addEventListener("click", () => { state.static = !state.static; render(); });
document.querySelector("#minimal-toggle").addEventListener("click", () => { state.minimal = !state.minimal; render(); });
document.querySelector("#language").addEventListener("change", event => {
  state.lang = event.target.value;
  const url = new URL(location.href);
  url.searchParams.set("lang", state.lang);
  history.replaceState(null, "", url);
  render();
});
window.addEventListener("message", event => {
  if (event.origin !== location.origin) return;
  const message = event.data;
  if (!message || typeof message !== "object") return;
  if (!embedded) {
    if (event.source === frame?.contentWindow && message.type === "tsukuyomi-preview-view" && ["scene", "reading"].includes(message.view)) {
      state.view = message.view;
      render();
    }
    return;
  }
  if (event.source !== parent) return;
  if (message.type === "tsukuyomi-preview-playback" && typeof message.playing === "boolean") {
    state.playing = message.playing;
  } else if (message.type === "tsukuyomi-preview-state") {
    if (Object.hasOwn(text, message.lang)) state.lang = message.lang;
    if (["dark", "light"].includes(message.mode)) state.mode = message.mode;
    if (["scene", "reading"].includes(message.view)) state.view = message.view;
    for (const key of ["minimal", "static", "playing"]) if (typeof message[key] === "boolean") state[key] = message[key];
  } else return;
  render();
});
reducedMotion.addEventListener("change", render);
document.addEventListener("visibilitychange", render);
if (!embedded) new IntersectionObserver(([entry]) => { state.playing = entry.isIntersecting; render(); }).observe(viewport);
render();
