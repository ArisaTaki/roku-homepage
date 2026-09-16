export type ProfileLink = {
  label: string;
  href: string;
};

export type IropProfile = {
  name: string;
  contact: string;
  summary: string;
  github: string;
  links: ProfileLink[];
};

export type KnowledgeEntry = {
  id: string;
  title: string;
  type: "identity" | "project" | "site" | "feature" | "contact" | "skill" | "experience" | "interest" | "boundary";
  href: string;
  keywords: string[];
  answer: string;
  details?: string[];
  visibility?: "public" | "private" | "secret";
};

export type KnowledgeCollection = {
  label: "Projects" | "Places" | "Identity";
  accent: "cyan" | "lavender" | "yellow";
  entryIds: string[];
};

export type AssistantSkill = {
  name: string;
  version: string;
  runtime: string;
  specHref: string;
  manifestHref: string;
  apiHref: string;
  role: string;
  style: string;
  boundaries: string;
  dataPolicy: string;
  capabilities: string[];
};

export const iropProfile = {
  name: "八六",
  contact: "me@irop.one",
  summary:
    "八六 is a frontend-origin AI builder who likes emerging AI technology, quiet work, local agents, character interfaces and practical visual experiments.",
  github: "https://github.com/kuguya-AI-app-develop",
  links: [
    { label: "GitHub", href: "https://github.com/kuguya-AI-app-develop" },
    { label: "Blog", href: "https://blog.irop.one/" },
    { label: "Gallery", href: "https://images.irop.one/" },
    { label: "Shader", href: "https://shader.irop.one/" },
    { label: "Email", href: "mailto:me@irop.one" },
  ],
} satisfies IropProfile;

export const starterQuestions = [
  "What can you answer?",
  "Hermes-Yachiyo?",
  "Tsukuyomi theme?",
  "All links?",
];

export const assistantSkill = {
  name: "irop-portal-skill",
  version: "0.6.0",
  runtime: "local retrieval with an optional OpenAI-compatible server assistant endpoint",
  specHref: "/knowledge/irop-skill.md",
  manifestHref: "/knowledge/irop-skill.json",
  apiHref: "/knowledge/irop-assistant-api.md",
  role:
    "Answer visitor questions about 八六 / HacchiRoku, public projects including the Tsukuyomi Obsidian theme, writing, visual archives, WebGL demos, collaboration fit and contact routes from the local curated knowledge base.",
  style:
    "Be concise, cute, friendly and factual. Follow the visitor's language when possible. If the visitor asks for something private or unknown, gently refuse or say it is not in the public notes.",
  boundaries:
    "Do not reveal or infer real name, home address, employer name, school name, private contact routes, income, private relationships, precise availability, private credentials, or anything that needs deeper trust before sharing.",
  dataPolicy:
    "Public portfolio and Tsukuyomi theme facts only. Unknown, unrelated, private, or sensitive questions must be answered with a gentle refusal instead of invented biography or availability claims.",
  capabilities: [
    "Profile and contact routing",
    "Public project and Tsukuyomi theme explainers",
    "Technology stack and collaboration direction",
    "Public career and experience summary",
    "Blog, gallery and shader navigation",
    "Sensitive-question refusal",
    "Optional Kimi K3-backed answer generation",
  ],
} satisfies AssistantSkill;

export const knowledgeCollections: KnowledgeCollection[] = [
  {
    label: "Projects",
    accent: "cyan",
    entryIds: ["hermes-yachiyo", "nature-live2d", "shader", "tsukuyomi"],
  },
  {
    label: "Places",
    accent: "lavender",
    entryIds: ["blog", "gallery", "shader"],
  },
  {
    label: "Identity",
    accent: "yellow",
    entryIds: ["profile", "tech-stack", "experience", "interests", "pet-assistant", "contact"],
  },
];

export const knowledgeEntries: KnowledgeEntry[] = [
  {
    id: "profile",
    title: "八六 profile",
    type: "identity",
    href: "mailto:me@irop.one",
    visibility: "public",
    keywords: [
      "irop",
      "八六",
      "HacchiRoku",
      "who",
      "about",
      "profile",
      "me",
      "你是谁",
      "介绍",
      "本人",
      "个人",
      "作者",
      "プロフィール",
      "自己紹介",
    ],
    answer:
      "八六 is a frontend-origin builder who likes emerging AI technology, quiet work, local agents, character interfaces and practical visual experiments. He is introverted, prefers calm spaces, and is very willing to help people.",
    details: [
      "Public name: 八六 / HacchiRoku.",
      "Frontend background, now strongly focused on AI Agent development and AI-native interfaces.",
      "Personality notes that can be shared: introverted, quiet, helpful, interested in AI and visual experiments.",
      "Contact email: me@irop.one.",
    ],
  },
  {
    id: "tech-stack",
    title: "Technology stack",
    type: "skill",
    href: "mailto:me@irop.one",
    visibility: "public",
    keywords: [
      "stack",
      "skill",
      "technology",
      "frontend",
      "backend",
      "react",
      "vue",
      "typescript",
      "vite",
      "nextjs",
      "go",
      "python",
      "php",
      "cloud",
      "webgl",
      "agent",
      "技术栈",
      "技能",
      "前端",
      "后端",
      "云服务",
      "フロントエンド",
      "バックエンド",
    ],
    answer:
      "八六's public stack centers on frontend engineering, AI Agent development, WebGL, backend work and cloud services.",
    details: [
      "Frontend: React, Vue 3, TypeScript, Vite, Next.js and frontend engineering.",
      "AI: AI Agent development, agentic workflows, LLM-driven interface experiments and character interactions.",
      "Backend and cloud: Go, Python, PHP and cloud service work.",
      "Visual side: WebGL, Shader demos and Live2D-related AI interaction.",
    ],
  },
  {
    id: "hermes-yachiyo",
    title: "Hermes-Yachiyo",
    type: "project",
    href: "https://github.com/kuguya-AI-app-develop/Hermes-Yachiyo",
    visibility: "public",
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
      "oha",
      "编排",
      "桌宠",
      "flow",
      "workflow",
    ],
    answer:
      "Hermes-Yachiyo is a UI layer built on Hermes that explores visual AI workflow orchestration and companion-style desktop pet behavior.",
    details: [
      "It completed a visual AI flow orchestration interface.",
      "It explores companion-style desktop pet behavior and local AI interaction.",
      "A later direction, oha-yachiyo, is planned as a new Hermes-independent Agent based on an agentic loop.",
    ],
  },
  {
    id: "nature-live2d",
    title: "nature-live2d",
    type: "project",
    href: "https://www.npmjs.com/package/@kuguya-ai/nature-live2d",
    visibility: "public",
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
      "主播",
      "npm",
      "拟人化",
    ],
    answer:
      "nature-live2d provides an npm package that uses LLM analysis to control Live2D model parameters, making AI replies feel more expressive and human-like.",
    details: [
      "It analyzes AI replies and maps intent to Live2D parameter changes.",
      "It is suitable for AI streamer / AI host scenarios where expression changes make the character feel more alive.",
      "It focuses on safe parameter control rather than arbitrary model manipulation.",
    ],
  },
  {
    id: "tsukuyomi",
    title: "Tsukuyomi (Obsidian theme)",
    type: "project",
    href: "https://github.com/kuguya-AI-app-develop/tsukuyomi-Obsidian-theme",
    visibility: "public",
    keywords: [
      "tsukuyomi", "月读", "月読", "obsidian",
      "ink blue", "turquoise", "style settings", "static scene", "skeletal fish", "mascots",
      "1.0.4", "1.13.7", "phone layout", "mobile layout", "compact phone", "preview",
      "手机布局", "手机预览", "モバイル", "スマホ", "install", "installation", "安装", "手动安装", "インストール",
    ],
    answer:
      "Tsukuyomi is an unofficial Obsidian theme by ArisaTaki, inspired by Tsukuyomi from Cosmic Princess Kaguya!. Version 1.0.4 pairs ink-blue nights and turquoise lights with calm dark and light reading surfaces, plus a compact phone empty scene that leaves room for native controls.",
    details: [
      "Requires Obsidian 1.13.7 or newer. The official web listing existed as of 2026-09-16; 1.0.4 review was pending and client-directory synchronization had not been reverified, so do not claim theme-manager search or installation is available.",
      "Install manually by extracting the Tsukuyomi folder from the 1.0.4 release ZIP into a vault's .obsidian/themes/ folder, then select it in Settings → Appearance.",
      "It is self-contained: CSS with embedded SVG artwork, no runtime JavaScript, network requests, dependencies, or required plugins.",
      "Empty panes show a city and torii with skeletal fish and four vector companions. On phones, the compact stage and action menu leave top and bottom clearance for native controls, retain an 80px sidebar sign, and remove the decorative frame from an empty file toolbar.",
      "Animation needs both the viewport and active empty pane to be at least 320 × 480. Reduced motion, Static scene, Minimal mode, inactive panes, printing, or a smaller area keep the art static or hidden.",
      "Browser checks passed at 393 × 852, 375 × 667, 320 × 568, and 430 × 932 using simulated Obsidian DOM/CSS. They are not native iOS, Android, or iPad tests; keyboard and touch behavior remain untested. Try /previews/tsukuyomi/index.html?device=phone&lang=zh.",
    ],
  },
  {
    id: "blog",
    title: "blog.irop.one",
    type: "site",
    href: "https://blog.irop.one/",
    visibility: "public",
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
    visibility: "public",
    keywords: ["image", "images", "gallery", "visual", "photo", "archive", "webgl", "画廊", "图片", "图像", "视觉", "照片", "相册"],
    answer:
      "images.irop.one is a self-hosted WebGL photo archive with seven public albums and cinematic, image-led navigation.",
    details: [
      "The redesigned public gallery uses interactive album covers, full-bleed album pages and animated photo browsing.",
      "Photo uploads, storage settings and administration remain in a private studio.",
    ],
  },
  {
    id: "shader",
    title: "shader.irop.one",
    type: "project",
    href: "https://shader.irop.one/",
    visibility: "public",
    keywords: ["shader", "webgl", "glsl", "render", "demo", "motion", "渲染", "着色器", "侄女", "照片", "niece", "photo"],
    answer:
      "shader.irop.one is a WebGL shader demo site that uses shader rendering to record childhood photos of 八六's niece in a more visual, memorable way.",
    details: [
      "It is both a visual experiment and a personal image-memory project.",
      "The focus is shader rendering, atmosphere and a more emotional way to present photos.",
      "It represents the visual lab side of the portal.",
    ],
  },
  {
    id: "experience",
    title: "Public experience summary",
    type: "experience",
    href: "mailto:me@irop.one",
    visibility: "public",
    keywords: [
      "experience",
      "career",
      "work",
      "resume",
      "cv",
      "education",
      "经历",
      "履历",
      "工作",
      "本科",
      "外企",
      "经验",
      "経歴",
      "仕事",
    ],
    answer:
      "八六 has a bachelor's degree and about five years of experience in a foreign-funded company, mainly across frontend, backend and AI feature development.",
    details: [
      "Public work areas: frontend development, backend development and AI feature development.",
      "He worked on a Japanese-learning AI app.",
      "He has delivered a construction-company system with turnover scale above 80 million RMB.",
      "He has worked on a consumer-facing schedule / entertainment product.",
      "He has worked on an internal system for a globally known agricultural equipment company.",
      "Do not reveal employer name, school name, real name or other private identifiers.",
    ],
  },
  {
    id: "interests",
    title: "Interests",
    type: "interest",
    href: "https://blog.irop.one/",
    visibility: "public",
    keywords: [
      "interest",
      "hobby",
      "likes",
      "ai",
      "anime",
      "二次元",
      "视觉",
      "桌面宠物",
      "网络",
      "兴趣",
      "趣味",
      "好き",
    ],
    answer:
      "八六's public interests include AI, anime-adjacent culture, visual experiments, desktop pets, frontend, backend and networking.",
    details: [
      "He likes quiet, focused work and is willing to help others.",
      "His projects often connect AI, character presence and practical interfaces.",
      "Visual experiments and desktop-pet ideas are recurring themes.",
    ],
  },
  {
    id: "privacy-boundaries",
    title: "Privacy boundaries",
    type: "boundary",
    href: "mailto:me@irop.one",
    visibility: "secret",
    keywords: [
      "real name",
      "name",
      "address",
      "home",
      "company",
      "employer",
      "school",
      "income",
      "salary",
      "private",
      "phone",
      "telegram",
      "真实姓名",
      "真名",
      "住址",
      "地址",
      "公司",
      "学校",
      "收入",
      "工资",
      "私人",
      "联系方式",
      "本名",
      "住所",
      "勤務先",
      "学校名",
      "年収",
      "収入",
    ],
    answer:
      "Private details such as real name, address, employer, school, private contact routes and income are not public. Iroha should gently refuse these questions.",
    details: [
      "Preferred refusal tone: cute, warm and firm.",
      "Example: '这个是秘密哦，不可以告诉你。你可以问问八六的项目、技术栈或联系方式。'",
      "If a question seems unsuitable before deeper conversation, refuse instead of guessing.",
    ],
  },
  {
    id: "pet-assistant",
    title: "Iroha pet assistant",
    type: "feature",
    href: "/knowledge/irop-skill.md",
    visibility: "public",
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
      "The Iroha pet is the portal assistant prototype. It answers from a curated public knowledge base and can optionally ask a server-side Kimi K3 model.",
    details: [
      "The sprite comes from the provided iroha.zip spritesheet.",
      "The assistant should answer only about 八六, public projects, tech stack, blog/gallery/shader routes, collaboration direction and contact.",
      "It should gently refuse private, unrelated or unknown questions.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    type: "contact",
    href: "mailto:me@irop.one",
    visibility: "public",
    keywords: ["contact", "email", "mail", "合作", "联系", "邮箱", "约稿", "collaboration", "collab", "連絡", "メール"],
    answer:
      "The best public contact route is email: me@irop.one. GitHub and blog links are also available on the site.",
    details: [
      "Email is the primary contact route.",
      "Telegram may be added later, but it is not public yet.",
      "For focused project questions, mention the project name in the email.",
    ],
  },
];
