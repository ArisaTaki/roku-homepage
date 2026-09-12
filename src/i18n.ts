export const locales = ["en", "zh", "ja"] as const;

export type Locale = (typeof locales)[number];

export const localeLabels: Record<Locale, string> = {
  en: "EN",
  zh: "中",
  ja: "日",
};

export const localeNames: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  ja: "日本語",
};

export function isLocale(value: string | null): value is Locale {
  return Boolean(value && locales.includes(value as Locale));
}

export type WorkId =
  | "hermes-yachiyo"
  | "nature-live2d"
  | "mimo-usage-watcher"
  | "blog"
  | "gallery"
  | "shader";

export type WorkCopy = {
  title: string;
  description: string;
  meta: string;
};

export const workCopies: Record<Locale, Record<WorkId, WorkCopy>> = {
  en: {
    "hermes-yachiyo": {
      title: "Hermes-Yachiyo",
      description: "A local desktop companion for chatting, running agents, popping up bubbles and showing Live2D.",
      meta: "Python, Electron, React, Local AI",
    },
    "nature-live2d": {
      title: "nature-live2d",
      description: "Describe an emotion in plain language, then turn it into safe Live2D expression controls.",
      meta: "Live2D, LLM, TypeScript, Python",
    },
    "mimo-usage-watcher": {
      title: "mimo-usage-watcher",
      description: "A small desktop dashboard for keeping MiMo quota, keys and balances visible.",
      meta: "Electron, Quota Watcher, macOS Keychain",
    },
    blog: {
      title: "blog.irop.one",
      description: "Notes on AI tools, frontend experiments and the bits worth keeping around.",
      meta: "Writing, Notes",
    },
    gallery: {
      title: "images.irop.one",
      description: "A self-hosted WebGL photo archive where seven albums unfold through cinematic, image-led navigation.",
      meta: "WebGL, Photo Archive, Self-hosted",
    },
    shader: {
      title: "shader.irop.one",
      description: "Tiny WebGL sketches for motion, color and shader play.",
      meta: "WebGL, Shader, Demo",
    },
  },
  zh: {
    "hermes-yachiyo": {
      title: "Hermes-Yachiyo",
      description: "一个放在桌面上的本地 AI 伙伴，可以聊天、跑 Agent、弹气泡，也能接 Live2D。",
      meta: "Python, Electron, React, 本地 AI",
    },
    "nature-live2d": {
      title: "nature-live2d",
      description: "用一句自然语言描述情绪，再把它变成安全可控的 Live2D 表情参数。",
      meta: "Live2D, LLM, TypeScript, Python",
    },
    "mimo-usage-watcher": {
      title: "mimo-usage-watcher",
      description: "一个小小的桌面看板，把 MiMo 额度、API Key 和余额状态放在眼前。",
      meta: "Electron, 额度看板, macOS Keychain",
    },
    blog: {
      title: "blog.irop.one",
      description: "写一些 AI 工具、前端实验，以及当下觉得值得留下来的东西。",
      meta: "写作, 笔记",
    },
    gallery: {
      title: "images.irop.one",
      description: "一个自托管的 WebGL 照片档案；七组相册用更像展览的动效逐层展开。",
      meta: "WebGL, 照片档案, 自托管",
    },
    shader: {
      title: "shader.irop.one",
      description: "放 WebGL 小实验的地方，主要玩运动、颜色和一点点渲染手感。",
      meta: "WebGL, Shader, 小实验",
    },
  },
  ja: {
    "hermes-yachiyo": {
      title: "Hermes-Yachiyo",
      description: "チャット、Agent 実行、バブル表示、Live2D までまとめた、デスクトップ常駐のローカル AI 相棒。",
      meta: "Python, Electron, React, Local AI",
    },
    "nature-live2d": {
      title: "nature-live2d",
      description: "ことばで伝えた感情を、Live2D の安全な表情パラメータへ落とし込むための仕組み。",
      meta: "Live2D, LLM, TypeScript, Python",
    },
    "mimo-usage-watcher": {
      title: "mimo-usage-watcher",
      description: "MiMo の利用量、API Key、残高まわりを手元で見ておくための小さな Electron ダッシュボード。",
      meta: "Electron, Quota Watcher, macOS Keychain",
    },
    blog: {
      title: "blog.irop.one",
      description: "AI ツールやフロントエンド実験、あとで読み返したいことを置いておくノート。",
      meta: "Writing, Notes",
    },
    gallery: {
      title: "images.irop.one",
      description: "7つのアルバムを、映像的な動きでめくっていくセルフホストの WebGL フォトアーカイブ。",
      meta: "WebGL, Photo Archive, Self-hosted",
    },
    shader: {
      title: "shader.irop.one",
      description: "動き、色、質感を少しずつ試す WebGL Shader の小さな実験場。",
      meta: "WebGL, Shader, Sketches",
    },
  },
};

export const uiCopy = {
  en: {
    skip: "Skip to works",
    nav: {
      works: "Works",
      me: "Me",
      email: "Email me",
      where: "Home",
      backHome: "Back to home",
      primary: "Primary navigation",
      language: "Language",
      home: "HacchiRoku home",
    },
    hero: {
      eyebrow: "CREATIVE AFTER HOURS",
      caption: "Make room for the extraordinary.",
      exploreHint: "Scroll or click to explore",
      indexAria: "Exhibition navigation",
      prologue: "Prologue",
      intro: ["AI tools, character interfaces,", "WebGL sketches, notes,", "and a few small experiments."],
      mobileIntro: ["AI tools, Live2D experiments,", "WebGL sketches, notes", "and small interface studies."],
      thisWay: ["Exhibition", "this way"],
      stageAria: "irop.one project exhibition",
    },
    pet: {
      aria: "Iroha pet assistant",
      title: "IROHA / GUIDE",
      idleRuntime: "LOCAL KB",
      queryingRuntime: "QUERYING",
      remoteRuntime: "REMOTE AI",
      fallbackRuntime: "LOCAL FALLBACK",
      initialText: "Welcome to my little exhibition. Which project would you like to see first? I can show you around.",
      initialSource: "HacchiRoku site notes",
      pendingText: "Looking through local notes...",
      pendingSource: "iroha skill",
      sourcePrefix: "Source",
      chipsAria: "Suggested questions",
      placeholder: "Ask HacchiRoku...",
      inputAria: "Ask Iroha pet about HacchiRoku",
      askButton: "Ask",
      thinkingButton: "...",
      questions: [
        { label: "What do you know?", query: "What can you answer?" },
        { label: "Hermes-Yachiyo?", query: "Hermes-Yachiyo?" },
        { label: "Live2D by language?", query: "自然语言 Live2D?" },
        { label: "Where are the links?", query: "All links?" },
      ],
    },
    aboutColumnsAria: "About HacchiRoku",
    aboutColumns: [
      {
        title: "Who",
        body: "I am HacchiRoku, building small AI tools, local agents, desktop companions and web interfaces with a bit of character.",
      },
      {
        title: "Why",
        body: "This site is a front door for work that is easier to show than summarize: projects, notes, images, shaders and little experiments.",
      },
      {
        title: "How",
        body: "I like practical AI and interfaces that feel alive: local-first workflows, Live2D controls, quota monitors and WebGL play.",
      },
      {
        title: "Hello",
        beforeEmail: "For project notes, questions or collaboration, write to",
        afterEmail: "GitHub and blog links are tucked into the Me menu.",
      },
    ],
    about: {
      aria: "About irop.one",
      kicker: "About",
      headline: ["HacchiRoku builds", "local AI tools,", "character interfaces", "and small visual labs."],
      mobileStart: "HacchiRoku builds",
      mobileBlue: "AI tools",
      mobileGreen: "character interfaces",
      mobileEnd: "and tiny visual labs.",
    },
    hermesMobile: {
      nav: ["对话", "Agent", "气泡", "Live2D"],
      status: "Ready · local agent",
      messages: [
        "What should we sync today?",
        "Turn the Agent update into release notes.",
        "Done: chat, Agent Studio, bubble mode and Live2D can be demoed.",
      ],
      tools: ["workspace", "changelog", "summary"],
    },
  },
  zh: {
    skip: "直接看作品",
    nav: {
      works: "作品",
      me: "关于",
      email: "联系我",
      where: "回首页",
      backHome: "返回首页",
      primary: "主导航",
      language: "语言",
      home: "HacchiRoku 首页",
    },
    hero: {
      eyebrow: "月夜创作现场",
      caption: "让想象，超越日常。",
      exploreHint: "滚动或点击，开始探索",
      indexAria: "展览导航",
      prologue: "序章",
      intro: ["做一点 AI 工具，", "也做角色界面、WebGL、", "笔记和图像实验。"],
      mobileIntro: ["AI 工具、Live2D 表情、", "WebGL 草图、笔记", "和一些小界面实验。"],
      thisWay: ["展览", "往这边"],
      stageAria: "irop.one 项目展览",
    },
    pet: {
      aria: "Iroha 像素宠物助手",
      title: "IROHA / GUIDE",
      idleRuntime: "本地知识库",
      queryingRuntime: "检索中",
      remoteRuntime: "远端 AI",
      fallbackRuntime: "本地回退",
      initialText: "欢迎来到我的小展厅。想先看哪个作品？我可以带路。",
      initialSource: "HacchiRoku 站点笔记",
      pendingText: "我翻一下本地笔记...",
      pendingSource: "iroha skill",
      sourcePrefix: "来源",
      chipsAria: "推荐问题",
      placeholder: "问点什么...",
      inputAria: "向 Iroha pet 询问 HacchiRoku",
      askButton: "提问",
      thinkingButton: "...",
      questions: [
        { label: "你知道什么？", query: "你知道什么？" },
        { label: "Hermes-Yachiyo？", query: "Hermes-Yachiyo 是什么？" },
        { label: "Live2D 怎么控制？", query: "自然语言 Live2D 怎么控制？" },
        { label: "入口都在哪？", query: "入口都在哪？" },
      ],
    },
    aboutColumnsAria: "关于 HacchiRoku",
    aboutColumns: [
      {
        title: "我是谁",
        body: "我是 HacchiRoku，喜欢做本地 AI、桌面伙伴、角色界面，以及一些有点手感的小 Web 工具。",
      },
      {
        title: "这个站点",
        body: "这里像一个小展厅，放项目、笔记、图像、Shader 草图，还有那些讲半天不如直接看一眼的实验。",
      },
      {
        title: "偏好",
        body: "我偏爱实用但不死板的 AI：本地优先、Live2D 表情控制、额度监控、WebGL，以及稍微像活着的界面。",
      },
      {
        title: "打个招呼",
        beforeEmail: "想聊项目、笔记或合作的话，可以写信到",
        afterEmail: "GitHub 和博客入口在「关于」里。",
      },
    ],
    about: {
      aria: "关于 irop.one",
      kicker: "关于",
      headline: ["HacchiRoku 做", "本地 AI 工具、", "角色界面", "和小型视觉实验。"],
      mobileStart: "HacchiRoku 做",
      mobileBlue: "AI 工具",
      mobileGreen: "角色界面",
      mobileEnd: "和小型视觉实验。",
    },
    hermesMobile: {
      nav: ["对话", "Agent", "气泡", "Live2D"],
      status: "就绪 · local agent",
      messages: ["今天要把哪些内容同步给我？", "把 Agent 更新整理成发布说明。", "已整理：对话、Agent Studio、气泡模式和 Live2D 演示。"],
      tools: ["workspace", "changelog", "summary"],
    },
  },
  ja: {
    skip: "作品を見る",
    nav: {
      works: "制作物",
      me: "私について",
      email: "メール",
      where: "ホーム",
      backHome: "ホームへ戻る",
      primary: "メインナビゲーション",
      language: "言語",
      home: "HacchiRoku ホーム",
    },
    hero: {
      eyebrow: "月夜のクリエイティブ",
      caption: "想像で、日常のその先へ。",
      exploreHint: "スクロールかクリックで、展示へ",
      indexAria: "展示ナビゲーション",
      prologue: "プロローグ",
      intro: ["ローカル AI と", "キャラクター UI、WebGL、", "メモや画像の小さな展示室。"],
      mobileIntro: ["AI ツール、Live2D 表情、", "WebGL スケッチ、メモ", "そして小さな UI 実験。"],
      thisWay: ["展示は", "こちら"],
      stageAria: "irop.one プロジェクト展示",
    },
    pet: {
      aria: "Iroha ピクセルペットアシスタント",
      title: "IROHA / GUIDE",
      idleRuntime: "ローカル知識",
      queryingRuntime: "検索中",
      remoteRuntime: "リモート AI",
      fallbackRuntime: "ローカル回答",
      initialText: "小さな展示室へようこそ。最初はどの作品を見てみたいですか？ご案内します。",
      initialSource: "HacchiRoku サイトメモ",
      pendingText: "ローカルメモを見ています...",
      pendingSource: "iroha skill",
      sourcePrefix: "出典",
      chipsAria: "質問候補",
      placeholder: "聞いてみる...",
      inputAria: "Iroha pet に HacchiRoku について質問する",
      askButton: "聞く",
      thinkingButton: "...",
      questions: [
        { label: "何がわかる？", query: "何がわかる？" },
        { label: "Hermes-Yachiyo?", query: "Hermes-Yachiyo とは？" },
        { label: "Live2D の制御は？", query: "自然言語で Live2D はどう制御する？" },
        { label: "リンクはどこ？", query: "リンクはどこ？" },
      ],
    },
    aboutColumnsAria: "HacchiRoku について",
    aboutColumns: [
      {
        title: "だれ？",
        body: "HacchiRoku です。ローカル AI、デスクトップ companion、キャラクター UI、手触りのある小さな Web ツールを作っています。",
      },
      {
        title: "ここは？",
        body: "制作物、メモ、画像、Shader スケッチ、説明するより見せたほうが早い実験を並べておく小さな展示室です。",
      },
      {
        title: "好きな作り方",
        body: "実用的だけど無機質すぎない AI が好きです。ローカル優先、Live2D 表情制御、quota monitor、WebGL、少し生きている感じの UI。",
      },
      {
        title: "連絡",
        beforeEmail: "制作物やコラボの相談は",
        afterEmail: "GitHub と blog は「私について」に置いてあります。",
      },
    ],
    about: {
      aria: "irop.one について",
      kicker: "About",
      headline: ["HacchiRoku は", "ローカル AI ツールと", "キャラクター UI、", "小さな視覚実験を作っています。"],
      mobileStart: "HacchiRoku は",
      mobileBlue: "AI ツール",
      mobileGreen: "キャラクター UI",
      mobileEnd: "と小さな視覚実験を作っています。",
    },
    hermesMobile: {
      nav: ["対話", "Agent", "バブル", "Live2D"],
      status: "準備完了 · local agent",
      messages: ["今日は何を同期しますか？", "Agent の更新をリリースノートにして。", "完了：対話、Agent Studio、バブル、Live2D をデモできます。"],
      tools: ["workspace", "changelog", "summary"],
    },
  },
} as const;

export type UiCopy = (typeof uiCopy)[Locale];
