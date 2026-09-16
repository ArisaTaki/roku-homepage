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
    noteEnd: "写下此刻，留待重逢。", status: "本地主题预览", disclaimer: "此页面用主题原始 CSS 展示浏览器中的示例界面，并非完整 Obsidian 或 iOS 原生测试。",
    motionNote: "系统已开启减少动态效果，场景保持静止。", download: "下载主题 1.0.4 ↗", repository: "GitHub 源码 ↗", listing: "官方网页条目 ↗",
    install: "适用于 Obsidian 1.13.7+。下载 1.0.4 压缩包并将 Tsukuyomi 文件夹放入笔记库的 .obsidian/themes/，然后在外观中选择主题。",
    credit: "ArisaTaki 的非官方粉丝主题 · 免费分享", notice: "素材与权利说明", controls: "预览设置", modeGroup: "配色模式", viewGroup: "预览视图", deviceGroup: "设备", desktop: "桌面", phone: "手机", drawer: "文件", closeDrawer: "关闭文件栏",
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
    noteEnd: "Keep this moment for another day.", status: "Local theme preview", disclaimer: "A sample browser interface rendered with the original theme CSS, not the full Obsidian app or a native iOS test.",
    motionNote: "Your system prefers reduced motion, so the scene stays still.", download: "Download theme 1.0.4 ↗", repository: "Source on GitHub ↗", listing: "Official web listing ↗",
    install: "Requires Obsidian 1.13.7+. Download the 1.0.4 archive, place its Tsukuyomi folder in your vault’s .obsidian/themes/, then select the theme in Appearance.",
    credit: "An unofficial fan theme by ArisaTaki · Shared free of charge", notice: "Artwork & rights", controls: "Preview controls", modeGroup: "Color mode", viewGroup: "Preview view", deviceGroup: "Device", desktop: "Desktop", phone: "Phone", drawer: "Files", closeDrawer: "Close navigation",
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
    noteEnd: "今を書き留めて、また会う日へ。", status: "ローカルテーマプレビュー", disclaimer: "テーマ本来の CSS を使ったブラウザー上のサンプル画面です。Obsidian 本体や iOS ネイティブテストではありません。",
    motionNote: "システムで動きを減らす設定が有効なため、風景は静止します。", download: "テーマ 1.0.4 をダウンロード ↗", repository: "GitHub ソース ↗", listing: "公式ウェブ掲載ページ ↗",
    install: "Obsidian 1.13.7 以降に対応。1.0.4 のアーカイブをダウンロードし、Tsukuyomi フォルダーを保管庫の .obsidian/themes/ に入れてから外観で選択してください。",
    credit: "ArisaTaki による非公式ファンテーマ · 無料配布", notice: "素材と権利について", controls: "プレビュー設定", modeGroup: "配色", viewGroup: "表示", deviceGroup: "デバイス", desktop: "デスクトップ", phone: "スマートフォン", drawer: "ファイル", closeDrawer: "ナビゲーションを閉じる",
  },
};
const candidate = query.get("lang") || navigator.language.slice(0, 2);
const requestedDevice = query.get("device");
const initialDevice = ["desktop", "phone"].includes(requestedDevice)
  ? requestedDevice
  : (!embedded && matchMedia("(max-width: 650px)").matches ? "phone" : "desktop");
const state = { lang: Object.hasOwn(text, candidate) ? candidate : "en", device: initialDevice, mode: "dark", view: "scene", minimal: false, static: reducedMotion.matches, playing: !embedded };
document.body.classList.toggle("is-embed", embedded);

// Standalone uses fixed CSS-pixel frames so each device mode exercises the
// original theme rules at its intended viewport; embedded callers supply theirs.
const viewport = document.querySelector(".stage-viewport");
let stage = document.querySelector(".preview-window");
let frame;
if (!embedded) {
  frame = document.createElement("iframe");
  frame.className = "preview-window";
  frame.title = "Tsukuyomi · Obsidian theme";
  frame.src = `./index.html?embed=1&device=${state.device}&lang=${state.lang}&v=1.0.4`;
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
  url.searchParams.set("v", "1.0.4");
  frame.src = url.href;
}

function render() {
  const copy = text[state.lang];
  const phoneShell = embedded && state.device === "phone";
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : state.lang;
  document.querySelectorAll("[data-copy]").forEach(element => { element.textContent = copy[element.dataset.copy]; });
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
  document.body.classList.toggle("tk-disable-motion", state.static || reducedMotion.matches || !state.playing || document.hidden);
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
  const scenePane = document.querySelector("#scene-pane");
  const readingPane = document.querySelector("#reading-pane");
  if (scenePane) scenePane.hidden = state.view !== "scene";
  if (readingPane) readingPane.hidden = state.view !== "reading";
  const mobileTitle = document.querySelector("#mobile-title");
  if (mobileTitle) mobileTitle.textContent = copy[state.view === "scene" ? "sceneFile" : "noteFile"];
  setDrawer(drawerOpen);
  syncFrame();
}
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
