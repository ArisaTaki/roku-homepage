import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bot,
  Cpu,
  MessageCircle,
  MessagesSquare,
  Monitor,
  Radio,
  Sparkles,
} from "lucide-react";
import {
  assistantSkill,
  knowledgeCollections,
  knowledgeEntries,
  starterQuestions,
} from "./data/iropKnowledge";
import { askIroha } from "./lib/iropAssistantClient";

const TRAVEL_DISTANCE = 7200;

const works = [
  {
    title: "Hermes-Yachiyo",
    description: "Desktop-first local personal Agent app with console, chat, bubble and Live2D modes.",
    meta: "Python, Electron, React, Local Agent",
    href: "https://github.com/kuguya-AI-app-develop/Hermes-Yachiyo",
    visual: "visual-hermes",
    width: 620,
    left: 1500,
  },
  {
    title: "nature-live2d",
    description: "Rule-first engine that turns natural language emotion into safe Live2D expression output.",
    meta: "Live2D, LLM, TypeScript, Python",
    href: "https://github.com/kuguya-AI-app-develop/nature-live2d",
    visual: "visual-live2d",
    width: 560,
    left: 2440,
  },
  {
    title: "mimo-usage-watcher",
    description: "Electron dashboard for monitoring MiMo token-plan usage and API key balance.",
    meta: "Electron, Quota Monitor, macOS Keychain",
    href: "https://github.com/kuguya-AI-app-develop/mimo-usage-watcher",
    visual: "visual-mimo",
    width: 540,
    left: 3290,
  },
  {
    title: "blog.irop.one",
    description: "Long-form notes for AI tools, frontend experiments and things worth remembering.",
    meta: "Writing, Research Notes",
    href: "https://blog.irop.one/",
    image: "/assets/screenshots/blog-irop.png",
    width: 640,
    left: 4150,
  },
  {
    title: "images.irop.one",
    description: "A personal gallery for generated images, references and visual fragments.",
    meta: "Gallery, Visual Archive",
    href: "https://images.irop.one/",
    image: "/assets/screenshots/gallery-000001.webp",
    width: 540,
    left: 5110,
  },
  {
    title: "shader.irop.one",
    description: "WebGL shader demo space for motion, color and tiny rendering experiments.",
    meta: "WebGL, Shader, Demo",
    href: "https://shader.irop.one/",
    visual: "visual-shader",
    width: 580,
    left: 6030,
  },
  {
    title: "A small portal",
    description: "One page that keeps projects, writing, visual demos and contact routes in the same orbit.",
    meta: "irop.one, AI, Frontend",
    href: "mailto:me@irop.one",
    visual: "visual-portal",
    width: 520,
    left: 6880,
  },
];

const knowledgeEntryMap = new Map(knowledgeEntries.map((entry) => [entry.id, entry]));

const hermesDemoModes = [
  { id: "chat", label: "对话", Icon: MessageCircle },
  { id: "studio", label: "Agent Studio", Icon: Bot },
  { id: "bubble", label: "气泡模式", Icon: MessagesSquare },
  { id: "live2d", label: "Live2D 模式", Icon: Sparkles },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function useSceneProgress(sceneRef) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return undefined;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = scene.getBoundingClientRect();
      const range = Math.max(1, scene.offsetHeight - window.innerHeight);
      setProgress(clamp(-rect.top / range, 0, 1));
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [sceneRef]);

  return progress;
}

function HeroMark({ className = "" }) {
  return (
    <div className={`hero-mark ${className}`} aria-hidden="true">
      <span className="mark-i">i</span>
      <span className="mark-r">r</span>
      <span className="mark-o">o</span>
      <span className="mark-p">p</span>
    </div>
  );
}

function PixelPet({ className = "" }) {
  return <span className={`pixel-pet ${className}`} aria-hidden="true" />;
}

function PetAssistant({ className = "", compact = false }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Iroha pet online. I know the local irop.one knowledge base.",
      source: "irop portal skill",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [runtimeLabel, setRuntimeLabel] = useState("LOCAL KB");
  const messagesRef = useRef(null);

  useEffect(() => {
    const messagePanel = messagesRef.current;
    if (!messagePanel) return;
    messagePanel.scrollTop = 0;
  }, [messages]);

  const ask = async (question) => {
    const normalized = question.trim();
    if (!normalized || isThinking) return;
    setInput("");
    setIsThinking(true);
    setRuntimeLabel("QUERYING");
    setMessages(
      compact
        ? [{ role: "assistant", text: "Indexing local memories...", source: "iroha skill", pending: true }]
        : [
            { role: "user", text: normalized },
            { role: "assistant", text: "Indexing local memories...", source: "iroha skill", pending: true },
          ]
    );

    try {
      const answer = await askIroha(normalized);
      setRuntimeLabel(answer.runtimeLabel || "LOCAL KB");
      setMessages(
        compact
          ? [{ role: "assistant", ...answer }]
          : [
              { role: "user", text: normalized },
              { role: "assistant", ...answer },
            ]
      );
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <section className={`pet-assistant ${compact ? "compact" : ""} ${className}`} aria-label="Iroha pet assistant">
      <div className="pet-stage">
        <PixelPet />
        <div className="pet-signal" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="pet-console">
        <div className="pet-console-top">
          <span>IROHA PET</span>
          <b>{runtimeLabel}</b>
        </div>
        <div className="pet-messages" aria-live="polite" aria-busy={isThinking} ref={messagesRef}>
          {messages.map((message, index) => (
            <p
              className={`pet-message ${message.role} ${message.pending ? "pending" : ""}`}
              key={`${message.role}-${index}-${message.text}`}
            >
              <span>{message.text}</span>
              {message.role === "assistant" && message.source ? (
                <small>
                  Source: {message.source}
                  {message.confidence ? ` · ${message.confidence}` : ""}
                </small>
              ) : null}
              {!compact && message.role === "assistant" && message.details?.length ? (
                <span className="pet-message-detail">{message.details[0]}</span>
              ) : null}
              {message.role === "assistant" && message.links?.length ? (
                <span className="pet-message-links">
                  {message.links.slice(0, 2).map((link) => (
                    <a
                      href={link.href}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                      key={link.href}
                    >
                      {link.label}
                    </a>
                  ))}
                </span>
              ) : null}
            </p>
          ))}
        </div>
        <div className="pet-chips" aria-label="Suggested questions">
          {starterQuestions.map((question) => (
            <button type="button" onClick={() => ask(question)} key={question} disabled={isThinking}>
              {question}
            </button>
          ))}
        </div>
        <form
          className="pet-form"
          onSubmit={(event) => {
            event.preventDefault();
            ask(input);
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about irop..."
            aria-label="Ask Iroha pet about irop"
            disabled={isThinking}
          />
          <button type="submit" disabled={isThinking}>{isThinking ? "..." : "Ask"}</button>
        </form>
      </div>
    </section>
  );
}

function KnowledgeDeck({ className = "" }) {
  return (
    <section className={`knowledge-deck ${className}`} aria-label="Iroha skill memory index">
      <div className="knowledge-head">
        <span>IROHA SKILL</span>
        <b>{assistantSkill.version}</b>
      </div>
      <p className="knowledge-summary">{assistantSkill.role}</p>
      <div className="knowledge-status" aria-label="Skill status">
        <span>
          <b>{knowledgeEntries.length}</b>
          memories
        </span>
        <span>
          <b>{knowledgeCollections.length}</b>
          indexes
        </span>
        <span>
          <b>hybrid</b>
          runtime
        </span>
      </div>
      <div className="knowledge-clusters">
        {knowledgeCollections.map((collection) => (
          <div className={`knowledge-cluster ${collection.accent}`} key={collection.label}>
            <div className="cluster-title">
              <span>{collection.label}</span>
              <b>{collection.entryIds.length}</b>
            </div>
            <div className="cluster-links">
              {collection.entryIds.map((entryId) => {
                const entry = knowledgeEntryMap.get(entryId);
                if (!entry) return null;
                return (
                  <a
                    href={entry.href}
                    target={entry.href.startsWith("http") ? "_blank" : undefined}
                    rel={entry.href.startsWith("http") ? "noreferrer" : undefined}
                    key={entry.id}
                  >
                    <span>{entry.type}</span>
                    <strong>{entry.title}</strong>
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="knowledge-actions">
        <a href={assistantSkill.specHref}>Skill spec</a>
        <a href={assistantSkill.manifestHref}>Manifest</a>
        <a href={assistantSkill.apiHref}>API</a>
      </div>
    </section>
  );
}

function HermesReplay() {
  return (
    <div className="hermes-demo" aria-hidden="true">
      <div className="hermes-window">
        <div className="hermes-window-bar">
          <span className="hermes-lights">
            <i />
            <i />
            <i />
          </span>
          <b>
            <img src="/assets/hermes/logo.png" alt="" />
            <span className="hermes-title-modes">
              <span>Hermes Yachiyo — 对话</span>
              <span>Hermes Yachiyo — Agent Studio</span>
              <span>Hermes Yachiyo — 气泡模式</span>
              <span>Hermes Yachiyo — Live2D 模式</span>
            </span>
          </b>
          <span className="hermes-window-tools">
            <Activity size={10} />
            <Monitor size={10} />
          </span>
        </div>
        <div className="hermes-window-body">
          <aside className="hermes-rail">
            <div className="hermes-brand">
              <span><img src="/assets/hermes/logo.png" alt="" /></span>
              <b>Hermes Yachiyo</b>
            </div>
            <div className="hermes-profile">
              <span><img src="/assets/hermes/yachiyo-default.jpg" alt="" /></span>
              <div>
                <b>月见八千代</b>
                <small><i /> 八千代待机中</small>
              </div>
            </div>
            <div className="hermes-nav-list">
              <span className="hermes-nav-cursor" />
              <strong>初始化</strong>
              <span className="hermes-nav-item">
                <Monitor size={12} strokeWidth={2.3} />
                主控台
              </span>
              <span className="hermes-nav-item">
                <Activity size={12} strokeWidth={2.3} />
                模型配置
                <em>ok</em>
              </span>
              <strong>日常桌面</strong>
              {hermesDemoModes.map(({ id, label, Icon }) => (
                <span className={`hermes-nav-item hermes-nav-${id}`} key={id}>
                  <Icon size={12} strokeWidth={2.3} />
                  {label}
                </span>
              ))}
              <strong>资源</strong>
              <span className="hermes-nav-item">
                <Cpu size={12} strokeWidth={2.3} />
                工作区
                <em>ok</em>
              </span>
            </div>
          </aside>
          <main className="hermes-main">
            <section className="hermes-scene hermes-scene-chat">
              <div className="hermes-chat-layout">
                <div className="hermes-thread-list">
                  <b>会话列表</b>
                  <input value="搜索会话..." readOnly />
                  <span className="hermes-tabs"><i>Agent</i><i>群组</i><i>＋</i></span>
                  <span className="is-active">
                    <img src="/assets/hermes/yachiyo-default.jpg" alt="" />
                    <strong>发布说明整理</strong>
                    <small>~6.4k tok</small>
                  </span>
                  <span>
                    <img src="/assets/hermes/yachiyo-default.jpg" alt="" />
                    <strong>模型配置</strong>
                    <small>~51 tok</small>
                  </span>
                  <span>
                    <img src="/assets/hermes/yachiyo-default.jpg" alt="" />
                    <strong>图像识别测试</strong>
                    <small>~5.9k tok</small>
                  </span>
                </div>
                <div className="hermes-chat-feed">
                  <div className="hermes-chat-head">
                    <img src="/assets/hermes/yachiyo-default.jpg" alt="" />
                    <div>
                      <b>把 Agent 更新整理成发布说明</b>
                      <small>就绪 · Hermes · ~6.4k tok</small>
                    </div>
                  </div>
                  <p className="hermes-bubble agent">今天要把哪些内容同步给我？</p>
                  <p className="hermes-bubble user">
                    <span>把 Agent 更新整理成发布说明。</span>
                  </p>
                  <div className="hermes-tool-stack">
                    <span>读取 workspace</span>
                    <span>整理 changelog</span>
                    <span>生成摘要</span>
                  </div>
                  <p className="hermes-bubble agent answer">
                    已整理：对话、Agent Studio、气泡模式和 Live2D 工作流都可直接演示。
                  </p>
                  <label className="hermes-composer">
                    <span>输入消息...</span>
                    <b>↑</b>
                  </label>
                </div>
              </div>
            </section>
            <section className="hermes-scene hermes-scene-studio">
              <div className="hermes-scene-head">
                <span>Agent Studio</span>
                <b>agents · skills · runs</b>
              </div>
              <div className="hermes-studio-tabs">
                <span className="active">Agents</span>
                <span>Skills</span>
                <span>Runs</span>
              </div>
              <div className="hermes-studio-grid">
                <div className="hermes-node source">
                  <Cpu size={15} />
                  <b>月见八千代</b>
                  <span>主 Agent · system prompt · tools</span>
                </div>
                <div className="hermes-node runner">
                  <Bot size={15} />
                  <b>Skill Mounts</b>
                  <span>browser · workspace · memory</span>
                </div>
                <div className="hermes-node output">
                  <Radio size={15} />
                  <b>Run Console</b>
                  <span>streaming · tool trace · summary</span>
                </div>
                <div className="hermes-connection" />
              </div>
              <div className="hermes-studio-log">
                <span>agent loaded</span>
                <span>bridge running</span>
                <span>workspace initialized</span>
              </div>
            </section>
            <section className="hermes-scene hermes-scene-bubble">
              <div className="hermes-scene-head">
                <span>气泡模式</span>
                <b>desktop bubble</b>
              </div>
              <div className="hermes-desktop-preview">
                <div className="hermes-float-bubble">
                  <span><img src="/assets/hermes/yachiyo-default.jpg" alt="" /></span>
                  <p>我在桌面边缘待机，需要时叫我。</p>
                </div>
                <div className="hermes-mini-reply">提醒：发布前检查图片链接和构建状态。</div>
                <div className="hermes-dock">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </section>
            <section className="hermes-scene hermes-scene-live2d">
              <div className="hermes-scene-head">
                <span>Live2D 模式</span>
                <b>口型同步 · 表情动作</b>
              </div>
              <div className="hermes-live2d-grid">
                <div className="hermes-model-stage">
                  <span className="hermes-model-aura" />
                  <span className="hermes-model">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
                <div className="hermes-live2d-panel">
                  <b>Live2D 模式</b>
                  <p>虚拟形象互动，让八千代在桌面上活起来。</p>
                  <span>4 个表情</span>
                  <span>动作摘要</span>
                  <span>月光舞台</span>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function WorkVisual({ work }) {
  if (work.image) {
    return <img src={work.image} alt="" />;
  }

  if (work.visual === "visual-hermes") {
    return <HermesReplay />;
  }

  return (
    <div className={`work-visual ${work.visual}`} aria-hidden="true">
      <span className="visual-kicker">{work.meta.split(",")[0]}</span>
      <strong>{work.title}</strong>
      <em>{work.description}</em>
      <div className="visual-grid">
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

function FloatingNav({ compact }) {
  return (
    <>
      <a className={`mini-logo ${compact ? "visible" : ""}`} href="#top" aria-label="irop.one home">
        <span>irop</span>
      </a>
      <nav className={`nav-card ${compact ? "compact" : ""}`} aria-label="Primary navigation">
        <a className="nav-row" href="#project">
          <span>Works</span>
          <span className="arrow">→</span>
          <span className="icon-strip" aria-hidden="true">
            <i>AI</i>
            <i>2D</i>
            <i>GL</i>
            <i>画</i>
            <i>?</i>
          </span>
        </a>
        <a className="nav-row" href="#about">
          <span>Me</span>
          <span className="arrow">→</span>
          <span className="icon-strip social-strip" aria-hidden="true">
            <i>gh</i>
            <i>✉︎</i>
            <i>rss</i>
          </span>
        </a>
        <a className="nav-row resume" href="mailto:me@irop.one">
          <span>Email me</span>
          <span className="download">→</span>
        </a>
      </nav>
      <a className={`where-card ${compact ? "visible" : ""}`} href="#top" aria-label="Back to beginning">
        <span>Where</span>
        <span>?</span>
      </a>
    </>
  );
}

function DesktopScene({ progress }) {
  const transform = useMemo(() => `translate3d(${-progress * TRAVEL_DISTANCE}px, 0, 0)`, [progress]);

  return (
    <div className="stage" aria-label="irop.one project exhibition">
      <div className="desktop-track" style={{ transform }}>
        <h1 className="desktop-title">irop.one</h1>
        <p className="desktop-intro">
          AI toolmaker and frontend tinkerer.
          <br />
          A compact portal for agents,
          <br />
          Live2D, WebGL, notes and images.
        </p>
        <HeroMark className="desktop-mark" />
        <PetAssistant className="hero-assistant" />
        <div className="this-way">
          <span>
            Exhibition
            <br />
            this way
          </span>
          <b aria-hidden="true">→</b>
        </div>
        {works.map((work) => (
          <a
            className={`work-card ${work.square ? "square" : ""} ${work.short ? "short" : ""}`}
            href={work.href}
            key={work.title}
            style={{ left: `${work.left}px`, width: `${work.width}px` }}
            target={work.href?.startsWith("http") ? "_blank" : undefined}
            rel={work.href?.startsWith("http") ? "noreferrer" : undefined}
          >
            <WorkVisual work={work} />
            <h2>{work.title}</h2>
            <p>{work.description}</p>
            <small>{work.meta}</small>
          </a>
        ))}
      </div>
    </div>
  );
}

function MobilePage() {
  return (
    <div className="mobile-page">
      <section className="mobile-hero" aria-labelledby="mobile-title">
        <h1 id="mobile-title">irop.one</h1>
        <p>
          AI projects, Live2D expression
          <br />
          experiments, WebGL sketches,
          <br />
          notes and small tools.
        </p>
        <div className="mobile-logo-wrap">
          <HeroMark className="mobile-mark" />
        </div>
        <PetAssistant className="mobile-hero-assistant" compact />
        <a className="mobile-this-way" href="#mobile-works">
          <span>
            Exhibition
            <br />
            this way
          </span>
          <b aria-hidden="true">↓</b>
        </a>
      </section>
      <section id="mobile-works" className="mobile-works" aria-label="Works">
        {works.map((work) => (
          <a
            className={`mobile-work ${work.square ? "square" : ""} ${work.short ? "short" : ""}`}
            href={work.href}
            key={work.title}
            target={work.href?.startsWith("http") ? "_blank" : undefined}
            rel={work.href?.startsWith("http") ? "noreferrer" : undefined}
          >
            <WorkVisual work={work} />
            <h2>{work.title}</h2>
            <p>{work.description}</p>
            <small>{work.meta}</small>
          </a>
        ))}
      </section>
      <section id="mobile-about" className="mobile-about" aria-label="About irop.one">
        <div className="mobile-wave" aria-hidden="true" />
        <h2>
          irop.one is a small front door.
          <br />
          It points to <span className="blue">AI tools</span>, <span className="green">Live2D</span>
          <br />
          and visual experiments.
        </h2>
        <PetAssistant className="mobile-about-assistant" compact />
        <KnowledgeDeck className="mobile-skill-deck" />
        <a className="mobile-mail" href="mailto:me@irop.one">
          me@irop.one
        </a>
      </section>
    </div>
  );
}

function AboutPanel() {
  return (
    <section id="about" className="about-panel" aria-label="About irop.one">
      <div>
        <p className="about-kicker">About</p>
        <h2>
          Building AI-native tools,
          <br />
          character interfaces and
          <br />
          small visual labs.
        </h2>
        <p>
          This portal collects projects around local agents, natural-language Live2D control, quota
          monitoring, WebGL shader sketches, image archives and writing. For contact, notes or
          collaboration, email me at <a href="mailto:me@irop.one">me@irop.one</a>.
        </p>
        <div className="about-links">
          <a href="https://github.com/kuguya-AI-app-develop" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="https://blog.irop.one/" target="_blank" rel="noreferrer">
            Blog
          </a>
          <a href="https://images.irop.one/" target="_blank" rel="noreferrer">
            Gallery
          </a>
          <a href="https://shader.irop.one/" target="_blank" rel="noreferrer">
            Shader
          </a>
        </div>
        <KnowledgeDeck />
      </div>
      <PetAssistant className="about-assistant" />
    </section>
  );
}

export default function App() {
  const sceneRef = useRef(null);
  const progress = useSceneProgress(sceneRef);
  const compactNav = progress > 0.13;

  return (
    <>
      <a className="skip-link" href="#project">
        Skip to works
      </a>
      <div id="top" />
      <FloatingNav compact={compactNav} />
      <main>
        <section id="project" ref={sceneRef} className="scroll-scene">
          <DesktopScene progress={progress} />
          <MobilePage />
        </section>
        <AboutPanel />
      </main>
      <footer className="site-footer">
        <span>irop.one</span>
        <a href="mailto:me@irop.one">me@irop.one</a>
      </footer>
    </>
  );
}
