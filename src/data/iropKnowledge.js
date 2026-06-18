export const iropProfile = {
  name: "irop",
  contact: "me@irop.one",
  summary:
    "irop builds AI-adjacent tools, local agent interfaces, Live2D expression experiments, WebGL sketches, image galleries and technical notes.",
  github: "https://github.com/kuguya-AI-app-develop",
  links: [
    { label: "GitHub", href: "https://github.com/kuguya-AI-app-develop" },
    { label: "Blog", href: "https://blog.irop.one/" },
    { label: "Gallery", href: "https://images.irop.one/" },
    { label: "Shader", href: "https://shader.irop.one/" },
    { label: "Email", href: "mailto:me@irop.one" },
  ],
};

export const starterQuestions = [
  "What can you answer?",
  "Hermes-Yachiyo?",
  "自然语言 Live2D?",
  "All links?",
];

export const assistantSkill = {
  name: "irop-portal-skill",
  version: "0.3.0",
  runtime: "local retrieval with optional remote assistant endpoint",
  specHref: "/knowledge/irop-skill.md",
  manifestHref: "/knowledge/irop-skill.json",
  apiHref: "/knowledge/irop-assistant-api.md",
  role:
    "Answer visitor questions about irop, projects, writing, visual archives, WebGL demos and contact routes from the local curated knowledge base.",
  style:
    "Be concise, friendly and factual. If the visitor asks for something unknown, say what is known and suggest a related project or contact route.",
  boundaries:
    "Do not invent private biographical details, availability, credentials, prices or project roadmaps that are not present in the knowledge base.",
  dataPolicy:
    "Public portfolio facts only. Unknown questions fall back to contact and public links instead of invented biography.",
  capabilities: [
    "Profile and contact routing",
    "Public project explainers",
    "Blog, gallery and shader navigation",
    "Optional remote AI/RAG endpoint",
    "Future backend or RAG replacement path",
  ],
};

export const knowledgeCollections = [
  {
    label: "Projects",
    accent: "cyan",
    entryIds: ["hermes-yachiyo", "nature-live2d", "mimo-usage-watcher"],
  },
  {
    label: "Places",
    accent: "lavender",
    entryIds: ["blog", "gallery", "shader"],
  },
  {
    label: "Identity",
    accent: "yellow",
    entryIds: ["profile", "pet-assistant", "contact"],
  },
];

export const knowledgeEntries = [
  {
    id: "profile",
    title: "irop profile",
    type: "identity",
    href: "mailto:me@irop.one",
    keywords: ["irop", "who", "about", "profile", "me", "你是谁", "介绍", "本人", "个人", "作者"],
    answer:
      "irop is an AI-focused builder and frontend tinkerer. This portal gathers local agent work, Live2D expression control, MiMo quota monitoring, writing, image archives and WebGL shader experiments.",
    details: [
      "Loves AI-related technology and character interfaces.",
      "Uses irop.one as a compact front door for projects, notes and visual experiments.",
      "Contact email: me@irop.one.",
    ],
  },
  {
    id: "hermes-yachiyo",
    title: "Hermes-Yachiyo",
    type: "project",
    href: "https://github.com/kuguya-AI-app-develop/Hermes-Yachiyo",
    keywords: [
      "hermes",
      "yachiyo",
      "agent",
      "desktop",
      "bubble",
      "local",
      "electron",
      "react",
      "本地",
      "桌面",
      "助手",
      "八千代",
    ],
    answer:
      "Hermes-Yachiyo is a desktop-first local personal Agent app. It turns Hermes into a desktop console, chat window, floating bubble or Live2D character that can stay on the machine.",
    details: [
      "Built around Electron + React frontend and Python backend.",
      "Has console, chat, bubble mode, Live2D mode and local bridge concepts.",
      "Its visual direction is related to the Cosmic Princess Kaguya / Tsukuyomi feeling.",
    ],
  },
  {
    id: "nature-live2d",
    title: "nature-live2d",
    type: "project",
    href: "https://github.com/kuguya-AI-app-develop/nature-live2d",
    keywords: [
      "live2d",
      "nature",
      "expression",
      "emotion",
      "timeline",
      "vtube",
      "parameter",
      "自然语言",
      "表情",
      "模型",
      "情绪",
    ],
    answer:
      "nature-live2d is a rule-first engine that converts natural-language emotion intent into safe Live2D parameter output and simple expression timelines.",
    details: [
      "It scans model resources, VTube Studio ranges, CDI metadata, physics dependencies and expression presets.",
      "It whitelists parameters and clamps outputs to safe ranges.",
      "It can use a deterministic analyzer or an OpenAI-compatible chat completions endpoint.",
    ],
  },
  {
    id: "mimo-usage-watcher",
    title: "mimo-usage-watcher",
    type: "project",
    href: "https://github.com/kuguya-AI-app-develop/mimo-usage-watcher",
    keywords: ["mimo", "usage", "quota", "token", "balance", "xiaomi", "monitor", "额度", "监控", "余额"],
    answer:
      "mimo-usage-watcher is an Electron dashboard for monitoring Xiaomi MiMo token-plan usage and API key balance across multiple accounts.",
    details: [
      "It tracks token-plan usage and API key balance side by side.",
      "Sensitive cookie headers and saved API keys are stored in macOS Keychain.",
      "Non-sensitive metadata and snapshots live under the local MiMo watcher config.",
    ],
  },
  {
    id: "blog",
    title: "blog.irop.one",
    type: "site",
    href: "https://blog.irop.one/",
    keywords: ["blog", "writing", "notes", "article", "文章", "博客", "笔记", "记录"],
    answer:
      "blog.irop.one is the writing and note-taking side of the portal: AI-tool experiments, frontend observations and things worth remembering.",
    details: ["Use it when you want longer-form context instead of only project cards."],
  },
  {
    id: "gallery",
    title: "images.irop.one",
    type: "site",
    href: "https://images.irop.one/",
    keywords: ["image", "images", "gallery", "visual", "画廊", "图片", "图像", "视觉"],
    answer:
      "images.irop.one is a personal gallery and visual archive for generated images, references and small visual fragments.",
    details: ["It is the visual companion to the more technical projects and writing."],
  },
  {
    id: "shader",
    title: "shader.irop.one",
    type: "site",
    href: "https://shader.irop.one/",
    keywords: ["shader", "webgl", "glsl", "render", "demo", "motion", "渲染", "着色器"],
    answer:
      "shader.irop.one is a WebGL shader demo space for motion, color and tiny rendering experiments.",
    details: ["It represents the visual lab side of the portal."],
  },
  {
    id: "pet-assistant",
    title: "Iroha pet assistant",
    type: "feature",
    href: "/knowledge/irop-skill.md",
    keywords: [
      "skill",
      "knowledge",
      "kb",
      "assistant",
      "ai",
      "pet",
      "iroha",
      "知识库",
      "技能",
      "宠物",
      "问答",
    ],
    answer:
      "The Iroha pet is the portal assistant prototype. It currently answers from a local curated knowledge base and is structured so it can later connect to a real retrieval-backed AI endpoint or become an irop skill.",
    details: [
      "The sprite comes from the provided iroha.zip spritesheet.",
      "The current frontend retrieval is local, deterministic and privacy-friendly.",
      "Future upgrades can replace answer generation while keeping the same knowledge entries and UI shell.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    type: "contact",
    href: "mailto:me@irop.one",
    keywords: ["contact", "email", "mail", "合作", "联系", "邮箱", "约稿"],
    answer:
      "The best contact route is email: me@irop.one. Project links are also collected through GitHub, blog.irop.one, images.irop.one and shader.irop.one.",
    details: ["For focused project questions, mention the project name in the email."],
  },
];
