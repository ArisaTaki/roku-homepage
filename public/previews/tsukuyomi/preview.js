// Preview controls belong to this browser demo, not to the installed CSS theme.
const query = new URLSearchParams(location.search);
const embedded = query.get("embed") === "1";
const autoDemo = embedded && query.get("demo") === "1";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const text = {
  zh: {
    filesModule: "文件", searchModule: "搜索", bookmarksModule: "书签", outlineModule: "大纲", backlinksModule: "反向链接", loading: "正在载入发布版本…", loadFailed: "主题资源加载失败。保留简化界面，可重新加载页面重试。", versionUnknown: "版本未读取", releases: "查看 GitHub 发行版 ↗", installFallback: "请查看 GitHub 发行版中的版本与安装要求。",
    tagline: "月光落在笔记之间。", language: "语言", intro: "将月读夜景放进 Obsidian：让鱼群游过留白，让阅读回到安静。",
    dark: "月读夜景", light: "月白", scene: "空白场景", reading: "阅读笔记", static: "静态场景", minimal: "简洁模式",
    folder: "月读手帖", sceneFile: "00 · 月读入口", noteFile: "01 · 把夜色写进笔记", ideas: "02 · 灵感与碎片", links: "03 · 星光的连线",
    welcome: "欢迎来到月读", welcomeSubtitle: "留一片夜色，等下一个念头。", openNote: "打开示例笔记 ↗", sceneHint: "光鱼 · 鸟居 · 四位小伙伴",
    noteTitle: "把夜色写进笔记", noteIntro: "窗外是流动的光，纸上是安静的字。月读把热闹留给空白页，把注意力还给正在写作的人。",
    quote: "好的主题，是每次打开笔记时，刚刚好的陪伴。", noteHeading: "为阅读留白", noteBody: "深蓝灰与月白两套色板，搭配青绿、朱红和一点点金色。正文保持纯色背景，沿用你自己的字体。",
    calloutTitle: "✧ 小小的约定", callout: "场景只在空白页与工作区边缘出现。阅读时，文字始终是主角。", details: "细节备忘",
    detailOne: "40rem 默认阅读宽度，1.75 倍行高", detailTwo: "无需插件；可用 Style Settings 调整五项设置", detailThree: "支持系统减少动态效果，也可以切换静态场景",
    noteEnd: "写下此刻，留待重逢。", status: "浏览器模拟", disclaimer: "此页面用主题原始 CSS 展示浏览器中的示例界面，切换已打开的标签可体验文章入场与果冻反馈；并非完整 Obsidian 或 iOS 原生测试。",
    motionNote: "系统已开启减少动态效果，场景保持静止。", download: "下载主题 {version} ↗", repository: "GitHub 源码 ↗", listing: "官方网页条目 ↗",
    install: "适用于 Obsidian {minimum}+。下载 {version} 压缩包并将 Tsukuyomi 文件夹放入笔记库的 .obsidian/themes/，然后在外观中选择主题。",
    credit: "ArisaTaki 的非官方粉丝主题 · 免费分享", notice: "素材与权利说明", controls: "预览设置", modeGroup: "配色模式", viewGroup: "预览视图", deviceGroup: "设备", desktop: "桌面", phone: "手机", drawer: "文件", closeDrawer: "关闭文件栏",
  },
  en: {
    filesModule: "Files", searchModule: "Search", bookmarksModule: "Bookmarks", outlineModule: "Outline", backlinksModule: "Backlinks", loading: "Loading the published theme…", loadFailed: "Theme assets could not load. A readable fallback is shown; reload to retry.", versionUnknown: "Version unavailable", releases: "View GitHub releases ↗", installFallback: "See the GitHub release for its version and installation requirements.",
    tagline: "Moonlight between the lines.", language: "Language", intro: "A little Tsukuyomi nightscape in Obsidian. Fish drift through the empty space; your notes stay quiet.",
    dark: "Moonlit night", light: "Moon white", scene: "Empty scene", reading: "Reading view", static: "Static scene", minimal: "Minimal mode",
    folder: "Moonlit journal", sceneFile: "00 · Welcome to Tsukuyomi", noteFile: "01 · A note after dark", ideas: "02 · Fragments & ideas", links: "03 · Constellations",
    welcome: "Welcome to Tsukuyomi", welcomeSubtitle: "A little night sky for your next thought.", openNote: "Open sample note ↗", sceneHint: "LIGHT FISH · TORII · FOUR COMPANIONS",
    noteTitle: "A note after dark", noteIntro: "Light moves outside the window; words rest on the page. Tsukuyomi keeps its scenery in empty panes, leaving your attention with your writing.",
    quote: "A good theme feels like quiet company whenever you open a note.", noteHeading: "Room to read", noteBody: "Ink-blue and moon-white palettes with turquoise, coral and a touch of gold. Solid reading surfaces keep your chosen fonts intact.",
    calloutTitle: "✧ A small promise", callout: "Scenery belongs in empty panes and around the workspace. In a note, your words take the lead.", details: "Details to keep",
    detailOne: "40rem default reading width and 1.75 line height", detailTwo: "No plugin required; five optional Style Settings controls", detailThree: "Respects reduced motion, with a static scene option",
    noteEnd: "Keep this moment for another day.", status: "Browser simulation", disclaimer: "A sample browser interface rendered with the original theme CSS, with open-tab entry and jelly feedback; not the full Obsidian app or a native iOS test.",
    motionNote: "Your system prefers reduced motion, so the scene stays still.", download: "Download theme {version} ↗", repository: "Source on GitHub ↗", listing: "Official web listing ↗",
    install: "Requires Obsidian {minimum}+. Download the {version} archive, place its Tsukuyomi folder in your vault’s .obsidian/themes/, then select the theme in Appearance.",
    credit: "An unofficial fan theme by ArisaTaki · Shared free of charge", notice: "Artwork & rights", controls: "Preview controls", modeGroup: "Color mode", viewGroup: "Preview view", deviceGroup: "Device", desktop: "Desktop", phone: "Phone", drawer: "Files", closeDrawer: "Close navigation",
  },
  ja: {
    filesModule: "ファイル", searchModule: "検索", bookmarksModule: "ブックマーク", outlineModule: "アウトライン", backlinksModule: "バックリンク", loading: "公開テーマを読み込み中…", loadFailed: "テーマを読み込めませんでした。簡易表示を維持しています。再読み込みしてお試しください。", versionUnknown: "バージョン未取得", releases: "GitHub リリースを見る ↗", installFallback: "バージョンとインストール要件は GitHub リリースをご確認ください。",
    tagline: "ノートの行間に、月明かりを。", language: "言語", intro: "Obsidian にツクヨミの夜景を。余白に光の魚が泳ぎ、ノートには静けさが残ります。",
    dark: "月読の夜", light: "月白", scene: "空白の風景", reading: "読書ビュー", static: "静かな風景", minimal: "シンプル表示",
    folder: "月読の手帖", sceneFile: "00 · 月読の入口", noteFile: "01 · 夜をノートに", ideas: "02 · アイデアのかけら", links: "03 · 星のつながり",
    welcome: "ツクヨミへようこそ", welcomeSubtitle: "次のひらめきに、少しの夜空を。", openNote: "サンプルノートを開く ↗", sceneHint: "光の魚 · 鳥居 · 四人の仲間",
    noteTitle: "夜をノートに", noteIntro: "窓の外には流れる光、紙の上には静かな文字。月読は風景を空白ページに留め、書く人の集中を守ります。",
    quote: "よいテーマは、ノートを開くたびに静かに寄り添うもの。", noteHeading: "読むための余白", noteBody: "深い青と月白の配色に、青緑、朱色、少しの金色。本文は単色の背景で、お気に入りのフォントをそのまま使えます。",
    calloutTitle: "✧ 小さな約束", callout: "風景は空白ページとワークスペースの縁だけに。ノートでは、言葉が主役です。", details: "細部のメモ",
    detailOne: "既定の読書幅は 40rem、行間は 1.75", detailTwo: "プラグイン不要。Style Settings で五つの設定を調整可能", detailThree: "動きを減らす設定に対応。静止表示への切り替えも可能",
    noteEnd: "今を書き留めて、また会う日へ。", status: "ブラウザーのシミュレーション", disclaimer: "テーマ本来の CSS を使ったブラウザー上のサンプル画面です。開いているタブの切り替えで入場と弾む動きを体験できます。Obsidian 本体や iOS ネイティブテストではありません。",
    motionNote: "システムで動きを減らす設定が有効なため、風景は静止します。", download: "テーマ {version} をダウンロード ↗", repository: "GitHub ソース ↗", listing: "公式ウェブ掲載ページ ↗",
    install: "Obsidian {minimum} 以降に対応。{version} のアーカイブをダウンロードし、Tsukuyomi フォルダーを保管庫の .obsidian/themes/ に入れてから外観で選択してください。",
    credit: "ArisaTaki による非公式ファンテーマ · 無料配布", notice: "素材と権利について", controls: "プレビュー設定", modeGroup: "配色", viewGroup: "表示", deviceGroup: "デバイス", desktop: "デスクトップ", phone: "スマートフォン", drawer: "ファイル", closeDrawer: "ナビゲーションを閉じる",
  },
};
const candidate = query.get("lang") || navigator.language.slice(0, 2);
const requestedDevice = query.get("device");
const initialDevice = ["desktop", "phone"].includes(requestedDevice)
  ? requestedDevice
  : (!embedded && matchMedia("(max-width: 650px)").matches ? "phone" : "desktop");
const state = { lang: Object.hasOwn(text, candidate) ? candidate : "en", device: initialDevice, mode: "dark", view: "scene", minimal: false, static: reducedMotion.matches, playing: !embedded, leftModule: "files", rightModule: "outline" };
document.body.classList.toggle("is-embed", embedded);
let releaseManifest;
let themeReady = false;
let themeFailed = false;
let demoTimer;
let demoStep = 0;
const demoSteps = [
  { leftModule: "search" },
  { leftModule: "files", view: "reading" },
  { rightModule: "backlinks" },
  { rightModule: "outline", view: "scene" },
];
function scheduleDemo() {
  const canPlay = autoDemo && themeReady && state.playing && !state.static && !reducedMotion.matches && !document.hidden;
  if (!canPlay) {
    clearTimeout(demoTimer);
    demoTimer = undefined;
    return;
  }
  if (demoTimer !== undefined) return;
  demoTimer = setTimeout(() => {
    demoTimer = undefined;
    Object.assign(state, demoSteps[demoStep]);
    demoStep = (demoStep + 1) % demoSteps.length;
    render();
  }, state.view === "scene" && state.leftModule === "files" ? 5500 : 3500);
}


// Standalone uses fixed CSS-pixel frames so each device mode exercises the
// original theme rules at its intended viewport; embedded callers supply theirs.
const viewport = document.querySelector(".stage-viewport");
let stage = document.querySelector(".preview-window");
let frame;
if (!embedded) {
  frame = document.createElement("iframe");
  frame.className = "preview-window";
  frame.title = "Tsukuyomi · Obsidian theme";
  // Set the child URL after the release manifest has been read.
  stage.replaceWith(frame);
  stage = frame;
  frame.addEventListener("load", () => syncFrame());
}
const fitStage = () => {
  const dimensions = state.device === "phone" ? { width: 393, height: 852 } : { width: 1120, height: 740 };
  const scale = Math.min(1, viewport.clientWidth / dimensions.width);
  stage.style.width = `${dimensions.width}px`;
  stage.style.height = `${dimensions.height}px`;
  stage.style.transform = `scale(${scale})`;
  viewport.style.height = `${dimensions.height * scale}px`;
  viewport.classList.toggle("is-phone-stage", state.device === "phone");
};
if (!embedded) {
  new ResizeObserver(fitStage).observe(viewport);
  fitStage();
}

function syncFrame() {
  frame?.contentWindow?.postMessage({ type: "tsukuyomi-preview-state", ...state, playing: state.playing && !document.hidden }, location.origin);
}

const drawer = document.querySelector("#file-drawer");
const drawerToggles = document.querySelectorAll("#drawer-toggle, #mobile-drawer-toggle");
const drawerClose = document.querySelector("#drawer-close");
const drawerBackground = [
  document.querySelector(".mod-root"),
  document.querySelector(".mobile-topbar"),
  document.querySelector(".mobile-bottom-bar"),
].filter(Boolean);
const drawerBackgroundState = new Map();
const drawerState = drawer && {
  role: drawer.getAttribute("role"),
  ariaModal: drawer.getAttribute("aria-modal"),
  ariaLabel: drawer.getAttribute("aria-label"),
};
let drawerOpen = false;
let drawerReturnTarget;

function setDrawerBackgroundInert(inert) {
  if (inert) {
    drawerBackground.forEach(element => {
      if (!drawerBackgroundState.has(element)) {
        drawerBackgroundState.set(element, {
          inert: element.inert,
          hadInert: element.hasAttribute("inert"),
          ariaHidden: element.getAttribute("aria-hidden"),
        });
      }
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });
    return;
  }
  drawerBackground.forEach(element => {
    const saved = drawerBackgroundState.get(element);
    if (!saved) return;
    element.inert = saved.inert;
    if (!saved.hadInert) element.removeAttribute("inert");
    if (saved.ariaHidden === null) element.removeAttribute("aria-hidden");
    else element.setAttribute("aria-hidden", saved.ariaHidden);
    drawerBackgroundState.delete(element);
  });
}

function restoreDrawerSemantics() {
  if (!drawer || !drawerState) return;
  if (drawerState.role === null) drawer.removeAttribute("role"); else drawer.setAttribute("role", drawerState.role);
  if (drawerState.ariaModal === null) drawer.removeAttribute("aria-modal"); else drawer.setAttribute("aria-modal", drawerState.ariaModal);
  if (drawerState.ariaLabel === null) drawer.removeAttribute("aria-label"); else drawer.setAttribute("aria-label", drawerState.ariaLabel);
}

function setDrawer(open, returnFocus = false) {
  const wasOpen = drawerOpen;
  drawerOpen = state.device === "phone" && open;
  document.body.classList.toggle("drawer-open", drawerOpen);
  drawer?.setAttribute("aria-hidden", String(state.device === "phone" && !drawerOpen));
  if (drawer) drawer.inert = state.device === "phone" && !drawerOpen;
  if (drawerOpen) {
    drawer?.setAttribute("role", "dialog");
    drawer?.setAttribute("aria-modal", "true");
    drawer?.setAttribute("aria-label", text[state.lang].drawer);
    setDrawerBackgroundInert(true);
  } else {
    restoreDrawerSemantics();
    setDrawerBackgroundInert(false);
  }
  drawerToggles.forEach(button => button.setAttribute("aria-expanded", String(drawerOpen)));
  if (drawerOpen && !wasOpen) {
    drawerClose?.focus();
  } else if (!drawerOpen && wasOpen && returnFocus) {
    drawerReturnTarget?.focus();
  }
}

function drawerFocusableElements() {
  if (!drawer) return [];
  return [...drawer.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")]
    .filter(element => !element.hidden && element.getClientRects().length > 0);
}

function reloadFrame() {
  if (!frame) return;
  const url = new URL(frame.src, location.href);
  url.searchParams.set("device", state.device);
  url.searchParams.set("lang", state.lang);
  if (releaseManifest) url.searchParams.set("v", releaseManifest.version);
  frame.src = url.href;
}

function render() {
  const copy = text[state.lang];
  const phoneShell = embedded && state.device === "phone";
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : state.lang;
  document.querySelectorAll("[data-copy]").forEach(element => {
    const key = element.dataset.copy;
    let value = copy[key];
    if (key === "download" && !releaseManifest) value = copy.releases;
    if (key === "install" && !releaseManifest) value = copy.installFallback;
    element.textContent = value.replaceAll("{version}", releaseManifest?.version ?? "").replaceAll("{minimum}", releaseManifest?.minAppVersion ?? "");
  });
  document.querySelectorAll("[data-label]").forEach(element => element.setAttribute("aria-label", copy[element.dataset.label]));
  document.querySelectorAll("[data-version]").forEach(element => { element.textContent = releaseManifest?.version ?? copy.versionUnknown; });
  const loadStatus = document.querySelector("#load-status");
  loadStatus.textContent = copy[themeFailed ? "loadFailed" : "loading"];
  loadStatus.hidden = themeReady;
  document.body.dataset.themeState = themeReady ? "ready" : themeFailed ? "error" : "loading";
  document.querySelector(".intro h1 span").textContent = copy.tagline;
  document.querySelector("#language").value = state.lang;
  document.querySelector(".preview-toolbar").setAttribute("aria-label", copy.controls);
  document.querySelectorAll(".control-group")[0].setAttribute("aria-label", copy.modeGroup);
  document.querySelectorAll(".control-group")[1].setAttribute("aria-label", copy.viewGroup);
  document.querySelector("[data-device-group]").setAttribute("aria-label", copy.deviceGroup);
  document.body.classList.toggle("theme-dark", state.mode === "dark");
  document.body.classList.toggle("theme-light", state.mode === "light");
  document.body.classList.toggle("is-mobile", phoneShell);
  document.body.classList.toggle("is-phone", phoneShell);
  document.body.classList.toggle("is-ios", phoneShell);
  document.body.classList.toggle("is-floating-nav", phoneShell);
  document.body.classList.toggle("tk-minimal", state.minimal);
  document.body.classList.toggle("tk-disable-motion", state.static || reducedMotion.matches || !state.playing || document.hidden || !themeReady);
  document.querySelectorAll("[data-mode]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode)));
  document.querySelectorAll("[data-device]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.device === state.device)));
  document.querySelectorAll("[data-view]").forEach(button => {
    const selected = button.dataset.view === state.view;
    button.setAttribute("aria-pressed", String(selected));
    button.classList.toggle("is-active", selected);
  });
  document.querySelector("#motion-toggle").setAttribute("aria-pressed", String(state.static || reducedMotion.matches));
  document.querySelector("#motion-toggle").disabled = reducedMotion.matches;
  document.querySelector("#minimal-toggle").setAttribute("aria-pressed", String(state.minimal));
  document.querySelector("#motion-note").hidden = !reducedMotion.matches;
  // Match Obsidian's ordinary open tabs: keep both view roots, hide the leaf.
  // This intentionally does not imitate same-tab file replacement or plugins.
  document.querySelectorAll("[data-pane]").forEach(leaf => {
    const selected = leaf.dataset.pane === state.view;
    leaf.hidden = !selected;
    leaf.classList.toggle("mod-active", selected);
  });
  document.querySelectorAll("[data-sidebar]").forEach(button => {
    const selected = [state.leftModule, state.rightModule].includes(button.dataset.sidebar);
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  document.querySelectorAll("[data-module]").forEach(panel => { panel.hidden = ![state.leftModule, state.rightModule].includes(panel.dataset.module); });
  const mobileTitle = document.querySelector("#mobile-title");
  if (mobileTitle) mobileTitle.textContent = copy[state.view === "scene" ? "sceneFile" : "noteFile"];
  setDrawer(drawerOpen);
  syncFrame();
  scheduleDemo();
}
document.querySelectorAll("[data-sidebar]").forEach(button => button.addEventListener("click", () => {
  const module = button.dataset.sidebar;
  state[["files", "search", "bookmarks"].includes(module) ? "leftModule" : "rightModule"] = module;
  render();
}));
document.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => { state.mode = button.dataset.mode; render(); }));
document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => {
  state.view = button.dataset.view;
  setDrawer(false, drawerOpen);
  render();
  if (embedded) parent.postMessage({ type: "tsukuyomi-preview-view", view: state.view }, location.origin);
}));
document.querySelectorAll("[data-device]").forEach(button => button.addEventListener("click", () => {
  state.device = button.dataset.device;
  const url = new URL(location.href);
  url.searchParams.set("device", state.device);
  history.replaceState(null, "", url);
  setDrawer(false);
  fitStage();
  reloadFrame();
  render();
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
drawerToggles.forEach(button => button.addEventListener("click", () => {
  drawerReturnTarget = button;
  setDrawer(!drawerOpen);
}));
drawerClose?.addEventListener("click", () => setDrawer(false, true));
document.querySelector("#drawer-scrim")?.addEventListener("click", () => setDrawer(false, true));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && drawerOpen) {
    event.preventDefault();
    setDrawer(false, true);
    return;
  }
  if (event.key !== "Tab" || !drawerOpen) return;
  const focusable = drawerFocusableElements();
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || !drawer?.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !drawer?.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  }
});
window.addEventListener("message", event => {
  if (event.origin !== location.origin) return;
  const message = event.data;
  if (!message || typeof message !== "object") return;
  if (!embedded) {
    if (event.source === frame?.contentWindow && message.type === "tsukuyomi-preview-ready") syncFrame();
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
    if (["desktop", "phone"].includes(message.device)) state.device = message.device;
    if (["scene", "reading"].includes(message.view)) state.view = message.view;
    for (const key of ["minimal", "static", "playing"]) if (typeof message[key] === "boolean") state[key] = message[key];
  } else return;
  render();
});
reducedMotion.addEventListener("change", render);
document.addEventListener("visibilitychange", render);
if (!embedded) new IntersectionObserver(([entry]) => { state.playing = entry.isIntersecting; render(); }).observe(viewport);
render();


async function loadTheme() {
  try {
    const response = await fetch("./manifest.json", { cache: "no-cache", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Manifest unavailable");
    const manifest = await response.json();
    if (manifest.name !== "Tsukuyomi" || !/^\d+\.\d+\.\d+$/.test(manifest.version) || typeof manifest.minAppVersion !== "string") throw new Error("Invalid manifest");
    releaseManifest = manifest;
    let cssHash = "";
    try {
      const metadataResponse = await fetch("./release.json", { cache: "no-cache", signal: AbortSignal.timeout(4000) });
      const metadata = metadataResponse.ok ? await metadataResponse.json() : null;
      if (metadata?.version === manifest.version && /^[a-f0-9]{64}$/.test(metadata.cssSha256)) cssHash = metadata.cssSha256;
    } catch { /* Older deployments may only have the release manifest. */ }
    const cssUrl = new URL("./theme.css", location.href);
    cssUrl.searchParams.set("v", manifest.version);
    if (cssHash) cssUrl.searchParams.set("sha", cssHash);
    document.querySelector("#css-download").href = cssUrl.href;
    document.querySelector("#release-link").href = `https://github.com/kuguya-AI-app-develop/tsukuyomi-Obsidian-theme/releases/tag/${manifest.version}`;
    await new Promise((resolve, reject) => {
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = cssUrl.href;
      const timer = setTimeout(() => { style.remove(); reject(new Error("Theme stylesheet timed out")); }, 10000);
      style.onload = () => { clearTimeout(timer); resolve(); };
      style.onerror = () => { clearTimeout(timer); style.remove(); reject(new Error("Theme stylesheet unavailable")); };
      document.head.append(style);
    });
    themeReady = true;
  } catch {
    themeFailed = true;
  }
  if (frame) {
    frame.src = `./index.html?embed=1&device=${state.device}&lang=${state.lang}${releaseManifest ? `&v=${releaseManifest.version}` : ""}`;
  }
  render();
  if (embedded) parent.postMessage({ type: "tsukuyomi-preview-ready", version: releaseManifest?.version ?? null, ready: themeReady }, location.origin);
}
loadTheme();
