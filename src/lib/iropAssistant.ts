import tsukuyomiManifest from "../data/tsukuyomi-release.json";
import {
  assistantSkill,
  iropProfile,
  knowledgeCollections,
  knowledgeEntries,
  type KnowledgeEntry,
  type ProfileLink,
} from "../data/iropKnowledge";

export type AnswerConfidence = "prompt" | "guide" | "fallback" | "medium" | "high" | "remote" | "refusal";

export type AnswerMood = "idle" | "thinking" | "happy" | "confused" | "shy" | "error";

export type AnswerKind = "prompt" | "guide" | "answer" | "refusal" | "unknown";

export type MatchedEntry = {
  id: string;
  title: string;
  type: KnowledgeEntry["type"];
  score: number;
};

export type AssistantAnswer = {
  text: string;
  source: string;
  confidence: AnswerConfidence | string;
  kind: AnswerKind;
  mood: AnswerMood;
  details?: string[];
  links?: ProfileLink[];
  matchedEntries: MatchedEntry[];
  debug?: {
    question: string;
  };
};

export const MAX_ASSISTANT_QUESTION_LENGTH = 280;

type ScoredEntry = {
  entry: KnowledgeEntry;
  score: number;
};

const fallbackKeywords = ["project", "game", "video", "ai", "tool", "live2d", "webgl", "blog", "gallery", "contact"];
const privateQuestionPattern =
  /(真实姓名|真名|住址|家庭住址|地址在哪|住在哪里|现居|公司名|哪家公司|所在公司|任职公司|雇主|学校名|哪个学校|哪所学校|收入|工资|薪资|私人|手机号|电话号码|私人电话|telegram|real name|home address|where do you live|where are you based|company name|which company|current employer|where do you work|school name|which school|income|salary|private|phone number|personal phone|本名|住所|どこに住|勤務先|会社名|どの会社|学校名|どこの学校|年収|収入|個人情報|電話番号)/i;

export type QuestionLanguage = "zh" | "ja" | "en";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function tokenize(value: string): string[] {
  const normalized = normalize(value);
  if (!normalized) return [];
  const words = normalized.split(/\s+/).filter(Boolean);
  const cjkSegments = Array.from(value.matchAll(/[\p{Script=Han}]+/gu), (match) => match[0]);
  const cjk = cjkSegments.flatMap((segment) => {
    const chars = Array.from(segment);
    const grams: string[] = [];

    for (let length = 2; length <= Math.min(5, chars.length); length += 1) {
      for (let index = 0; index <= chars.length - length; index += 1) {
        grams.push(chars.slice(index, index + length).join(""));
      }
    }

    return [segment, ...grams];
  });
  return [...new Set([...words, ...cjk])];
}

export function detectQuestionLanguage(question: string): QuestionLanguage {
  if (/[\u3040-\u30ff]/.test(question)) return "ja";
  if (/[\u4e00-\u9fff]/.test(question)) return "zh";
  return "en";
}

function refusalText(language: QuestionLanguage, reason: "private" | "unknown" | "too-long"): string {
  if (reason === "too-long") {
    if (language === "ja") {
      return "質問が少し長すぎます。Iroha が迷子になりそうなので、八六の制作物、技術スタック、連絡先などに絞って短く聞いてください。";
    }

    if (language === "zh") {
      return "这个问题有点太长啦，Iroha 会迷路。请缩短一点，围绕八六的项目、技术栈、合作方向或联系方式来问。";
    }

    return "That question is a bit too long for this tiny assistant. Please shorten it and ask about HacchiRoku's projects, stack, collaboration fit or contact route.";
  }

  if (language === "ja") {
    return reason === "private"
      ? "それは秘密です。Iroha からはお話しできません。制作物、技術スタック、連絡先なら答えられます。"
      : "そのことは公開メモにありません。八六のプロジェクト、技術スタック、ブログ、連絡先についてなら聞いてください。";
  }

  if (language === "zh") {
    return reason === "private"
      ? "这个是秘密哦，不可以告诉你。可以问问八六的项目、技术栈、博客入口或联系方式。"
      : "这个我不知道，八六没有把它写进公开笔记里。可以问问项目、技术栈、合作方向或联系方式。";
  }

  return reason === "private"
    ? "That part is a little secret, so I cannot share it. I can help with HacchiRoku's projects, stack, blog or contact route."
    : "I do not have that in the public notes. Try asking about projects, tech stack, collaboration fit, blog or contact.";
}

function greetingText(language: QuestionLanguage): string {
  if (language === "ja") {
    return "こんにちは、Iroha です。八六 / HacchiRoku の制作物、技術スタック、Hermes-Yachiyo、Live2D、ブログや連絡先について聞けます。";
  }

  if (language === "zh") {
    return "你好呀，我是 Iroha。可以问我八六 / HacchiRoku 的项目、技术栈、Hermes-Yachiyo、Live2D、博客入口或联系方式。";
  }

  return "Hi, I am Iroha. You can ask me about HacchiRoku's projects, tech stack, Hermes-Yachiyo, Live2D, blog, gallery or contact route.";
}

function guideText(language: QuestionLanguage): string {
  if (language === "ja") {
    return "八六 / HacchiRoku の公開プロジェクト、技術スタック、協力できそうな方向、ブログ・ギャラリー・Shader の入口、連絡先について答えられます。非公開のことや関係ないことは、やさしく断ります。";
  }

  if (language === "zh") {
    return "可以问我八六 / HacchiRoku 的公开项目、技术栈、合作方向、博客 / 画廊 / Shader 入口和联系方式。私人信息或无关内容，我会礼貌地拒绝。";
  }

  return "You can ask me about HacchiRoku's public projects, tech stack, collaboration fit, blog/gallery/shader links and contact route. I gently refuse private or unrelated questions.";
}

function projectsGuideText(language: QuestionLanguage): string {
  if (language === "ja") {
    return "ゲームなら色塗りパズルの染路と戦略カードゲームの晶港商会、創作ツールならベータ版の YKI Video Generator があります。Hermes-Yachiyo、nature-live2d、Tsukuyomi、WebGL Shader の展示も見られます。奶蛙と、音声・カバー制作ツールの Reflex Labs は開発中です。";
  }

  if (language === "zh") {
    return "想玩游戏可以先看染路和晶港商会：一个是色彩解谜，一个是宝石策略卡牌。创作工具有测试版的 YKI 视频生成器；原有作品还有 Hermes-Yachiyo、nature-live2d、Tsukuyomi 和 WebGL Shader。奶蛙与录音、封面创作工具 Reflex Labs 仍在完善中。";
  }

  return "Start with Ranlu for color puzzles, Crystal Harbor Guild for strategy cards, or the beta YKI Video Generator for local video creation. The portfolio also includes Hermes-Yachiyo, nature-live2d, Tsukuyomi and WebGL Shader experiments. Naiwa and the audio/cover workbench Reflex Labs are still in development.";
}

function linksGuideText(language: QuestionLanguage): string {
  if (language === "ja") {
    return "公開リンクは、GitHub、blog.irop.one、images.irop.one、shader.irop.one、それから連絡用の me@irop.one です。";
  }

  if (language === "zh") {
    return "公开入口包括 GitHub、blog.irop.one、images.irop.one、shader.irop.one，以及联系邮箱 me@irop.one。";
  }

  return "Useful irop links: GitHub, blog.irop.one, images.irop.one, shader.irop.one and me@irop.one.";
}

function localizedEntryAnswer(entry: KnowledgeEntry, language: QuestionLanguage): string {
  if (language === "en") return entry.answer;

  const localized: Partial<Record<QuestionLanguage, Record<string, string>>> = {
    zh: {
      ranlu:
        "染路（Ranlu）是一个有 500 关的色彩解谜游戏：在有限步数里合并相邻色块，把颜色铺满棋盘。支持撤销、提示、星级评价与本地进度保存，项目详情页可以试玩。",
      "jingang-guild":
        "晶港商会（Crystal Harbor Guild）是离线策略卡牌游戏。你会与三位 AI 对手收集宝石、积累卡牌折扣，再争夺声望；项目详情页可以试玩。",
      "yki-video-generator":
        "YKI 视频生成器是面向 Windows 与 NVIDIA 显卡的本地短视频创作工具，串联分镜、中文配音、竖屏视频和字幕，也支持逐镜头编辑、重做与历史版本。当前为测试版，Windows 真实模型完整链路仍待实机验收。",
      "naiwa-yuushiya":
        "奶蛙《如果有勇者在的话就好了》是一款围绕同时出牌、轮抽和传牌的卡牌游戏，目前仍在完善。项目详情页提供与机器人对局的开发预览，暂不承诺公开联机房间服务。",
      "reflex-labs":
        "Reflex Labs（Jev_project）是仍待完善的本地创作工具。LiveTake 用于录音或导入音频、整理带时间点的重录笔记、编辑和导出音频、CSV 与 Audacity 标签；Cover Pause Canvas 用于制作封面草稿并导出 PNG，不是 AI 图片生成器。",
      profile:
        "八六 / HacchiRoku 是前端出身的 AI 工具创作者，喜欢新兴 AI 技术、安静的工作方式、本地 Agent、角色界面和实用的视觉实验。他偏 I 人，喜欢安静，也很乐意帮助别人。",
      "tech-stack":
        "八六的公开技术栈主要是前端工程、AI Agent 开发、WebGL、后端和云服务。",
      "hermes-yachiyo":
        "Hermes-Yachiyo 是基于 Hermes 做的 UI 层，探索可视化 AI 流程编排和陪伴型桌面宠物。",
      "nature-live2d":
        "nature-live2d 提供了一个 npm 包，用 LLM 分析回复并控制 Live2D 模型参数，让 AI 回复更有表情和拟人感。",
      tsukuyomi:
        `Tsukuyomi（月读）是 ArisaTaki 维护的非官方 Obsidian 主题，灵感来自《超时空辉夜姬！》月读。${tsukuyomiManifest.version} 以墨蓝夜景和海青灯光提供安静的深浅阅读界面与紧凑手机场景，并有导航回弹、文章视图入场动效。同一标签内换文件不保证重复播放。`,
      blog: "blog.irop.one 是八六写 AI 工具、前端实验和一些值得留下来的笔记的地方。",
      gallery: "images.irop.one 是个人画廊和视觉归档，收着生成图、参考图和一些零散的视觉片段。",
      shader: "shader.irop.one 是一个 WebGL Shader demo 站点，用 Shader 渲染记录侄女小时候的照片。",
      experience:
        "八六本科学历，在外企工作约五年，主要做前端、后端和 AI 功能开发，也做过日语学习 AI App、建筑公司系统、赛程娱乐软件和农作设备公司内部系统。",
      interests:
        "八六公开提到的兴趣包括 AI、二次元、视觉实验、桌面宠物、前端、后端和网络。",
      "pet-assistant":
        "Iroha pet 是这个门户里的像素宠物助手原型，会根据公开知识库回答关于八六、项目、技术栈、入口和联系方式的问题。",
      contact: "最适合公开联系八六的方式是邮件：me@irop.one。GitHub 和博客入口也在站点里。",
    },
    ja: {
      ranlu:
        "染路（Ranlu）は全500面の色塗りパズルです。限られた手数で隣接する色の領域をつなぎ、盤面を埋めていきます。取り消し、ヒント、星評価、ローカル進捗保存に対応し、作品ページで試遊できます。",
      "jingang-guild":
        "晶港商会（Crystal Harbor Guild）は、3人の AI と競うオフライン戦略カードゲームです。宝石を集め、カードの割引を積み重ねて名声を獲得します。作品ページで試遊できます。",
      "yki-video-generator":
        "YKI Video Generator は Windows と NVIDIA GPU 向けのローカル動画制作ツールです。絵コンテ、中国語ナレーション、縦型動画、字幕をつなぎ、ショット単位の編集や再生成、履歴管理に対応します。現在はベータ版で、Windows の実モデルを使う全工程の実機検証は未完了です。",
      "naiwa-yuushiya":
        "奶蛙『勇者がいればいいのに』は、同時選択、ドラフト、手札の受け渡しを中心としたカードゲームです。まだ開発中で、作品ページにはボットと遊べる開発プレビューがあります。公開オンラインルームの提供は保証していません。",
      "reflex-labs":
        "Reflex Labs（Jev_project）は開発中のローカル制作ツールです。LiveTake では録音や音声の取り込み、時刻付きの録り直しメモ、編集、音声・CSV・Audacity ラベルの書き出しができます。Cover Pause Canvas はカバーの下書きと PNG 書き出し用で、AI 画像生成ツールではありません。",
      profile:
        "八六 / HacchiRoku はフロントエンド出身の AI ツール制作者です。新しい AI 技術、静かな作業、ローカル Agent、キャラクター UI、実用的なビジュアル実験が好きです。",
      "tech-stack":
        "八六の公開技術スタックは、フロントエンド、AI Agent 開発、WebGL、バックエンド、クラウドサービスが中心です。",
      "hermes-yachiyo":
        "Hermes-Yachiyo は Hermes 上に作った UI レイヤーで、視覚的な AI ワークフロー編成とデスクトップペット的な体験を試しています。",
      "nature-live2d":
        "nature-live2d は、LLM が返答を分析して Live2D モデルのパラメータを制御する npm パッケージです。",
      tsukuyomi:
        `Tsukuyomi（月読）は ArisaTaki が個人で制作・管理する非公式 Obsidian テーマです。『超時空輝夜姫！』の月読に着想を得て、${tsukuyomiManifest.version} では落ち着いた明暗の読書面とコンパクトなスマホ向けシーンに、ナビゲーションのバウンスとノートビューの表示時アニメーションを添えています。同じタブでファイルを切り替える場合は再生を保証しません。`,
      blog: "blog.irop.one は、AI ツールやフロントエンド実験、あとで読み返したいメモを書く場所です。",
      gallery: "images.irop.one は、生成画像や参考画像、小さな視覚の断片を並べる個人ギャラリーです。",
      shader: "shader.irop.one は、WebGL Shader で姪の幼いころの写真を見せるビジュアル実験サイトです。",
      experience:
        "八六は学士号を持ち、外資系企業で約 5 年、主にフロントエンド、バックエンド、AI 機能開発に携わってきました。",
      interests:
        "八六が公開している興味は、AI、アニメ寄りの文化、ビジュアル実験、デスクトップペット、フロントエンド、バックエンド、ネットワークです。",
      "pet-assistant":
        "Iroha pet はこのポータルのピクセルペット型アシスタントで、公開知識ベースから八六やプロジェクト、技術スタック、リンク、連絡先について答えます。",
      contact: "八六への公開連絡先はメール me@irop.one です。GitHub と blog への入口もサイト内にあります。",
    },
  };

  return localized[language]?.[entry.id] || entry.answer;
}

function isGreetingIntent(normalizedQuestion: string): boolean {
  const compactQuestion = normalizedQuestion.replace(/\s+/g, "");
  return /^(你好|您好|你好呀|你好啊|嗨|哈喽|hello|hi|hey|hiya|こんにちは|こんばんは|おはよう|おはようございます|やほ)$/.test(compactQuestion);
}

function entryHaystack(entry: KnowledgeEntry): string {
  return [
    entry.title,
    entry.type,
    entry.answer,
    ...(entry.details || []),
    ...(entry.keywords || []),
  ].join(" ");
}

function scoreEntry(entry: KnowledgeEntry, tokens: string[], normalizedQuestion: string): number {
  if (entry.id === "tsukuyomi" && !/(tsukuyomi|月读|月読|obsidian)/i.test(normalizedQuestion)) {
    return 0;
  }

  const haystack = normalize(entryHaystack(entry));
  let score = 0;

  for (const token of tokens) {
    if (token.length <= 1) continue;
    if (entry.keywords?.some((keyword) => normalize(keyword) === token)) score += 6;
    else if (entry.keywords?.some((keyword) => normalize(keyword).includes(token))) score += 4;
    if (haystack.includes(token)) score += token.length > 4 ? 3 : 1;
  }

  if (normalizedQuestion.includes(normalize(entry.title))) score += 8;
  if (entry.id === "profile" && /(who|about|介绍|是谁|profile)/i.test(normalizedQuestion)) score += 6;
  if (entry.id === "contact" && /(contact|email|mail|联系|邮箱)/i.test(normalizedQuestion)) score += 8;

  return score;
}

function entriesForCollection(label: string): KnowledgeEntry[] {
  const collection = knowledgeCollections.find((item) => item.label === label);
  if (!collection) return [];
  return collection.entryIds
    .map((entryId) => knowledgeEntries.find((entry) => entry.id === entryId))
    .filter((entry): entry is KnowledgeEntry => Boolean(entry));
}

function linkedEntries(entries: KnowledgeEntry[]): ProfileLink[] {
  return entries.map((entry) => ({ label: entry.title, href: entry.href }));
}

function buildMatchedEntries(entries: KnowledgeEntry[], score = 99): MatchedEntry[] {
  return entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    type: entry.type,
    score,
  }));
}

function answerIntent(question: string, normalizedQuestion: string): AssistantAnswer | null {
  const language = detectQuestionLanguage(question);

  if (isGreetingIntent(normalizedQuestion)) {
    return {
      text: greetingText(language),
      source: "Iroha greeting",
      confidence: "guide",
      kind: "guide",
      mood: "happy",
      details: ["Greeting handled locally so it does not spend remote model quota."],
      links: iropProfile.links.slice(0, 3),
      matchedEntries: buildMatchedEntries(
        knowledgeEntries.filter((entry) => ["profile", "pet-assistant", "contact"].includes(entry.id)),
        15
      ),
    };
  }

  const namedProjectPatterns: Array<[string, RegExp]> = [
    ["ranlu", /\branlu\b|染路/i],
    ["jingang-guild", /\bjingang\b|crystal harbor|晶港/i],
    ["naiwa-yuushiya", /\bnaiwa\b|\byuushiya\b|奶蛙|勇者/i],
    ["reflex-labs", /\breflex\b|\bjev\b|jev_project|livetake|live take|cover pause canvas/i],
    ["yki-video-generator", /\byki\b|video generator|视频生成器|動画生成/i],
  ];
  const namedProjectMatches = namedProjectPatterns
    .filter(([, pattern]) => pattern.test(question))
    .map(([id]) => knowledgeEntries.find((entry) => entry.id === id))
    .filter((entry): entry is KnowledgeEntry => Boolean(entry));
  if (namedProjectMatches.length) {
    return composeAnswer(namedProjectMatches.map((entry) => ({ entry, score: 99 })), question);
  }

  const asksForTsukuyomi = /(tsukuyomi|月读|月読|obsidian)/i.test(question);
  if (!asksForTsukuyomi && /(what can|what do you know|help|capabilit|你会|能问|可以问|知道什么|帮助|怎么用)/i.test(question)) {
    const projectEntries = entriesForCollection("Projects");
    const placeEntries = entriesForCollection("Places");

    return {
      text: guideText(language),
      source: "irop portal skill",
      confidence: "guide",
      kind: "guide",
      mood: "happy",
      details: assistantSkill.capabilities,
      links: [
        { label: "Skill spec", href: assistantSkill.specHref },
        { label: "Manifest", href: assistantSkill.manifestHref },
        { label: "Email", href: `mailto:${iropProfile.contact}` },
      ],
      matchedEntries: buildMatchedEntries([...projectEntries, ...placeEntries], 20),
    };
  }

  if (asksForTsukuyomi) {
    const themeEntry = knowledgeEntries.find((entry) => entry.id === "tsukuyomi");
    if (themeEntry) return composeAnswer([{ entry: themeEntry, score: 99 }], question);
  }

  if (/(tech stack|technology stack|skills?|frontend|backend|react|vue|typescript|webgl|cloud|技术栈|技能|会什么|用什么技术|前端|后端|云服务|技術スタック|スキル)/i.test(normalizedQuestion)) {
    const stackEntry = knowledgeEntries.find((entry) => entry.id === "tech-stack");

    if (stackEntry) {
      return {
        text: localizedEntryAnswer(stackEntry, language),
        source: stackEntry.title,
        confidence: "high",
        kind: "answer",
        mood: "happy",
        details: stackEntry.details,
        links: [{ label: "Email", href: `mailto:${iropProfile.contact}` }],
        matchedEntries: buildMatchedEntries([stackEntry], 99),
      };
    }
  }

  if (/(projects?|works?|repo|github|games?|creative tools?|项目|作品|仓库|代码|游戏|创作工具|制作物|ゲーム)/i.test(question)) {
    const projectEntries = entriesForCollection("Projects");

    return {
      text: projectsGuideText(language),
      source: "Projects",
      confidence: "guide",
      kind: "guide",
      mood: "happy",
      details: projectEntries.map((entry) => entry.answer),
      links: linkedEntries(projectEntries),
      matchedEntries: buildMatchedEntries(projectEntries, 30),
    };
  }

  if (/(all links|links|sites?|where|导航|链接|入口|站点|网址|全部)/i.test(normalizedQuestion)) {
    return {
      text: linksGuideText(language),
      source: "irop links",
      confidence: "guide",
      kind: "guide",
      mood: "happy",
      details: ["Public links only; private details are not inferred."],
      links: iropProfile.links,
      matchedEntries: buildMatchedEntries(knowledgeEntries, 10),
    };
  }

  return null;
}

function composeAnswer(matches: ScoredEntry[], question: string): AssistantAnswer {
  const language = detectQuestionLanguage(question);

  if (!matches.length) {
    return {
      text: refusalText(language, "unknown"),
      source: "irop profile",
      confidence: "refusal",
      kind: "unknown",
      mood: "confused",
      links: iropProfile.links.slice(0, 2),
      details: [assistantSkill.dataPolicy, `Try asking about ${fallbackKeywords.join(", ")}.`],
      matchedEntries: [],
    };
  }

  const [primary, secondary] = matches;
  if (primary.entry.visibility === "secret" || primary.entry.type === "boundary") {
    return {
      text: refusalText(language, "private"),
      source: "Privacy boundaries",
      confidence: "refusal",
      kind: "refusal",
      mood: "shy",
      details: ["Private details are not part of the public portfolio knowledge base."],
      matchedEntries: buildMatchedEntries([primary.entry], primary.score),
    };
  }

  const relatedEntry = secondary
    && !["profile", "contact"].includes(secondary.entry.id)
    && secondary.entry.visibility !== "secret"
    && secondary.score >= Math.max(5, primary.score * 0.45)
    ? secondary.entry
    : null;
  const related = relatedEntry
    ? language === "zh"
      ? ` 也可以看看：${relatedEntry.title}。`
      : language === "ja"
        ? ` 関連：${relatedEntry.title}。`
        : ` Related: ${relatedEntry.title}.`
    : "";
  const isTsukuyomiPhoneQuestion = primary.entry.id === "tsukuyomi"
    && /(phone|mobile|compact|iphone|android|ipad|手机|手機|移动端|モバイル|スマホ)/i.test(question);
  const isTsukuyomiMotionQuestion = primary.entry.id === "tsukuyomi"
    && /(motion|animation|transition|jelly|bounce|动效|動畫|动画|切换|アニメーション)/i.test(question);
  const details = isTsukuyomiPhoneQuestion
    ? primary.entry.details?.slice(3)
    : isTsukuyomiMotionQuestion
      ? primary.entry.details?.slice(4, 6)
      : primary.entry.details?.slice(0, 2);
  const previewLinks = primary.entry.id === "tsukuyomi"
    ? [{ label: language === "zh" ? "手机预览" : language === "ja" ? "スマホプレビュー" : "Phone preview", href: `/previews/tsukuyomi/index.html?device=phone&lang=${language}` }]
    : [];

  return {
    text: `${localizedEntryAnswer(primary.entry, language)}${related}`,
    source: primary.entry.title,
    confidence: primary.score > 12 ? "high" : "medium",
    kind: "answer",
    mood: "happy",
    details: details || [],
    links: [
      { label: primary.entry.title, href: primary.entry.href },
      ...previewLinks,
      ...(relatedEntry?.href ? [{ label: relatedEntry.title, href: relatedEntry.href }] : []),
    ].filter((link, index, list) => link.href && list.findIndex((item) => item.href === link.href) === index),
    matchedEntries: matches.map((match) => ({
      id: match.entry.id,
      title: match.entry.title,
      type: match.entry.type,
      score: match.score,
    })),
    debug: { question },
  };
}

export function answerVisitorQuestion(rawQuestion: string): AssistantAnswer {
  const question = rawQuestion.trim();
  const normalizedQuestion = normalize(question);

  if (!question) {
    return {
      text: "Ask me about projects, AI tools, Live2D, WebGL, writing, galleries, or how to contact irop.",
      source: "irop portal skill",
      confidence: "prompt",
      kind: "prompt",
      mood: "idle",
      links: iropProfile.links.slice(0, 3),
      details: assistantSkill.capabilities.slice(0, 2),
      matchedEntries: [],
    };
  }

  if (Array.from(question).length > MAX_ASSISTANT_QUESTION_LENGTH) {
    return {
      text: refusalText(detectQuestionLanguage(question), "too-long"),
      source: "Question length guard",
      confidence: "refusal",
      kind: "refusal",
      mood: "confused",
      details: [`Please keep questions under ${MAX_ASSISTANT_QUESTION_LENGTH} characters.`],
      matchedEntries: [],
    };
  }

  if (privateQuestionPattern.test(question)) {
    return {
      text: refusalText(detectQuestionLanguage(question), "private"),
      source: "Privacy boundaries",
      confidence: "refusal",
      kind: "refusal",
      mood: "shy",
      details: ["Private details are not part of the public portfolio knowledge base."],
      matchedEntries: buildMatchedEntries(
        knowledgeEntries.filter((entry) => entry.id === "privacy-boundaries"),
        99
      ),
    };
  }

  const intentAnswer = answerIntent(question, normalizedQuestion);
  if (intentAnswer) return intentAnswer;

  const tokens = tokenize(question);
  const matches = knowledgeEntries
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens, normalizedQuestion) }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return composeAnswer(matches, question);
}

export function isLocalOnlyAnswer(answer: Pick<AssistantAnswer, "kind" | "source">): boolean {
  return answer.kind === "prompt"
    || answer.source === "Iroha greeting"
    || answer.source === "Question length guard";
}
