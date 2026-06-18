import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CircleHelp, GitBranch, Mail, Orbit, Send, X } from "lucide-react";

const navItems = [
  ["home", "home"],
  ["spaces", "spaces"],
  ["projects", "projects"],
  ["notes", "notes"],
  ["contact", "contact"],
];

const spaces = [
  {
    kind: "feature",
    url: "https://blog.irop.one/",
    label: "blog.irop.one",
    title: "Arisa Blog",
    text: "149 篇文章，覆盖 AI、Hermes Agent、Shader、LangChain、TypeScript 与日常记录。",
    image: "/assets/screenshots/blog-irop.png",
    alt: "Arisa Blog homepage screenshot",
  },
  {
    kind: "gallery",
    url: "https://images.irop.one/",
    label: "images.irop.one",
    title: "念念的照片画廊",
    text: "胶片感影像空间，保留生活切片，也给个人门户加一层柔软的视觉记忆。",
  },
  {
    kind: "shader",
    url: "https://shader.irop.one/",
    label: "shader.irop.one",
    title: "WebGL Shader Demo",
    text: "Three/WebGL 方向的实验场，用可交互画面练习光照、材质和空间表达。",
  },
];

const projects = [
  {
    title: "Hermes-Yachiyo",
    meta: ["2026", "Electron + React + Python"],
    text: "桌面优先的本地个人 Agent 应用，让 Hermes 以主控台、聊天窗口、悬浮气泡或 Live2D 角色常驻本机。",
    tags: ["Local Agent", "Bridge", "Live2D"],
    filterTags: ["agent", "desktop", "visual"],
    url: "https://github.com/kuguya-AI-app-develop/Hermes-Yachiyo",
  },
  {
    title: "nature-live2d",
    meta: ["MVP", "Python + TypeScript"],
    text: "自然语言驱动 Live2D 表情与姿态控制，将情绪意图转换成白名单参数、热键和安全范围内的时间线。",
    tags: ["Expression Engine", "VTube Studio", "LLM"],
    filterTags: ["agent", "visual"],
    url: "https://github.com/kuguya-AI-app-develop/nature-live2d",
  },
  {
    title: "mimo-usage-watcher",
    meta: ["Desktop GUI", "Electron"],
    text: "小米 MiMo 模型额度监控工具，支持多账号 token-plan usage 与 API key balance 的本地监控。",
    tags: ["Quota Monitor", "Keychain", "DMG Release"],
    filterTags: ["desktop", "agent"],
    url: "https://github.com/kuguya-AI-app-develop/mimo-usage-watcher",
  },
];

const galleryImages = [
  "/assets/screenshots/gallery-000001.webp",
  "/assets/screenshots/gallery-000004.webp",
  "/assets/screenshots/gallery-000010.webp",
];

function useActiveSection() {
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const sections = [...document.querySelectorAll("[data-section]")];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target?.id) {
          setActiveSection(visible.target.id);
        }
      },
      { threshold: [0.28, 0.52, 0.72] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return activeSection;
}

function useFooterStatus() {
  const [status, setStatus] = useState({ progress: 0, time: "--:--" });

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
      const time = new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setStatus({ progress: Math.min(100, progress), time });
    };

    update();
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("scroll", update);
    };
  }, []);

  return status;
}

function useKeyboardShortcuts({ setShortcutsOpen }) {
  useEffect(() => {
    let sequence = "";

    const onKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen((open) => !open);
        return;
      }

      if (event.key === "Escape") {
        setShortcutsOpen(false);
        sequence = "";
        return;
      }

      if (event.key === "j") {
        window.scrollBy({ top: window.innerHeight * 0.72, behavior: "smooth" });
      }

      if (event.key === "k") {
        window.scrollBy({ top: -window.innerHeight * 0.72, behavior: "smooth" });
      }

      if (event.key === "g") {
        sequence = "g";
        window.setTimeout(() => {
          sequence = "";
        }, 900);
        return;
      }

      if (sequence === "g" && event.key === "h") {
        document.querySelector("#home")?.scrollIntoView({ behavior: "smooth" });
        sequence = "";
      }

      if (sequence === "g" && event.key === "p") {
        document.querySelector("#projects")?.scrollIntoView({ behavior: "smooth" });
        sequence = "";
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [setShortcutsOpen]);
}

function Header({ activeSection }) {
  return (
    <header className="site-header">
      <a className="brand" href="#home" aria-label="HacchiRoku home">
        <span className="brand-mark">八</span>
        <span>HacchiRoku.</span>
      </a>
      <nav className="nav-links" aria-label="Main navigation">
        {navItems.map(([id, label]) => (
          <a key={id} className={activeSection === id ? "active" : ""} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      <a className="header-mail" href="mailto:me@irop.one">
        <Send aria-hidden="true" />
        <span>reach out</span>
      </a>
    </header>
  );
}

function Hero() {
  return (
    <section id="home" className="hero section-block" data-section>
      <div className="section-number">01</div>
      <div className="hero-copy">
        <p className="eyebrow">// system.init · AI agent · Live2D · WebGL</p>
        <h1>
          Hello, I'm
          <span>HacchiRoku</span>
        </h1>
        <p className="role">前后端 / AI Agent Builder</p>
        <p className="intro">
          热爱 AI 相关技术，正在把 Agent workflow、RAG、Live2D 桌面入口和 WebGL 视觉实验串成自己的工具栈。
        </p>
        <div className="hero-actions">
          <a className="btn primary" href="#spaces">
            <Orbit aria-hidden="true" />
            <span>See my spaces</span>
          </a>
          <a className="btn secondary" href="#projects">
            <GitBranch aria-hidden="true" />
            <span>Open projects</span>
          </a>
        </div>
      </div>

      <figure className="hero-visual" aria-label="Portfolio visual preview">
        <img src="/assets/screenshots/blog-irop.png" alt="Arisa Blog screenshot" />
        <figcaption>
          <span>LIVE INDEX</span>
          <strong>blog.irop.one</strong>
        </figcaption>
      </figure>
    </section>
  );
}

function FocusBand() {
  return (
    <section className="problem-band section-block" aria-labelledby="focus-title">
      <div className="section-number">02</div>
      <div>
        <p className="eyebrow">0x01 // current focus</p>
        <h2 id="focus-title">把 AI 从聊天框里拎出来，放回真实桌面和真实工作流。</h2>
      </div>
      <div className="focus-grid">
        <article>
          <span>[01]</span>
          <h3>Agent as local companion</h3>
          <p>本地 Bridge、Electron 桌面壳、Bubble / Live2D 常驻入口，让 Agent 不只是网页对话。</p>
        </article>
        <article>
          <span>[02]</span>
          <h3>Expression as interface</h3>
          <p>用自然语言驱动 Live2D 表情和姿态，把情绪意图映射到安全参数范围。</p>
        </article>
        <article>
          <span>[03]</span>
          <h3>Visual systems</h3>
          <p>Shader、画廊、博客和日报系统，把技术学习与个人表达留在可访问的空间里。</p>
        </article>
      </div>
    </section>
  );
}

function ShaderPreview() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    let frame = 0;
    let frameId = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas;
      const image = ctx.createImageData(width, height);
      const time = frame * 0.018;

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const nx = (x / width - 0.5) * 2;
          const ny = (y / height - 0.5) * 2;
          const wave = Math.sin(nx * 9 + time) + Math.cos(ny * 7 - time * 1.4);
          const ring = Math.sin(Math.hypot(nx, ny) * 18 - time * 3);
          const value = (wave + ring + 3) / 6;
          const i = (y * width + x) * 4;
          image.data[i] = 8 + value * 36;
          image.data[i + 1] = 34 + value * 146;
          image.data[i + 2] = 42 + (1 - value) * 190;
          image.data[i + 3] = 255;
        }
      }

      ctx.putImageData(image, 0, 0);
      ctx.fillStyle = "rgba(244, 241, 234, 0.88)";
      ctx.font = `${13 * dpr}px SFMono-Regular, monospace`;
      ctx.fillText("fragment.glsl // irop shader lab", 18 * dpr, 28 * dpr);
      frame += 1;
      frameId = window.requestAnimationFrame(render);
    };

    resize();
    render();
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} width="720" height="360" />;
}

function Spaces() {
  return (
    <section id="spaces" className="section-block" data-section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">03 // public spaces</p>
          <h2>Online Spaces</h2>
        </div>
        <p>这些是已经在线的空间：记录、影像、Shader 实验。它们让门户不只展示代码，也展示持续维护的生活和技术现场。</p>
      </div>

      <div className="space-layout">
        <a className="space-feature" href={spaces[0].url} target="_blank" rel="noreferrer">
          <img src={spaces[0].image} alt={spaces[0].alt} />
          <div>
            <span>{spaces[0].label}</span>
            <h3>{spaces[0].title}</h3>
            <p>{spaces[0].text}</p>
          </div>
        </a>

        <div className="space-stack">
          <a className="space-card gallery-card" href={spaces[1].url} target="_blank" rel="noreferrer">
            <div className="gallery-strip" aria-hidden="true">
              {galleryImages.map((image) => (
                <img key={image} src={image} alt="" />
              ))}
            </div>
            <span>{spaces[1].label}</span>
            <h3>{spaces[1].title}</h3>
            <p>{spaces[1].text}</p>
          </a>

          <a className="space-card shader-card" href={spaces[2].url} target="_blank" rel="noreferrer">
            <div className="shader-preview" aria-hidden="true">
              <ShaderPreview />
            </div>
            <span>{spaces[2].label}</span>
            <h3>{spaces[2].title}</h3>
            <p>{spaces[2].text}</p>
          </a>
        </div>
      </div>
    </section>
  );
}

function Projects() {
  const [filter, setFilter] = useState("all");
  const filteredProjects = useMemo(
    () => projects.filter((project) => filter === "all" || project.filterTags.includes(filter)),
    [filter],
  );

  return (
    <section id="projects" className="section-block" data-section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">04 // repositories</p>
          <h2>Featured Projects</h2>
        </div>
        <div className="segmented" role="tablist" aria-label="Project filters">
          {["all", "agent", "desktop", "visual"].map((item) => (
            <button
              key={item}
              className={filter === item ? "active" : ""}
              type="button"
              onClick={() => setFilter(item)}
            >
              {item === "all" ? "All" : item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="project-grid">
        {filteredProjects.map((project) => (
          <article className="project-card" key={project.title}>
            <div className="project-meta">
              {project.meta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <h3>{project.title}</h3>
            <p>{project.text}</p>
            <div className="tags">
              {project.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <a href={project.url} target="_blank" rel="noreferrer">
              View repository <ArrowUpRight aria-hidden="true" />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

function Notes() {
  return (
    <section id="notes" className="section-block notes-section" data-section>
      <div className="section-number">05</div>
      <div className="note-copy">
        <p className="eyebrow">// notes</p>
        <h2>What I keep returning to</h2>
        <p>
          Transformer 的边界、world models 的可能性、RAG 的工程化、Prompt engineering、context、tools、Agent workflow。
          这些问题不是“学完就结束”的清单，而是反复靠近的坐标。
        </p>
      </div>
      <div className="terminal-panel" aria-label="Current interests">
        <div className="terminal-top">
          <span />
          <span />
          <span />
        </div>
        <pre>
          <code>{`$ current_stack --watch
AI Agent workflow ........ active
LangChain / RAG .......... learning in public
Live2D interface ......... building
WebGL Shader ............. sketching
Desktop automation ....... shipping small tools`}</code>
        </pre>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="contact-section section-block" data-section>
      <div>
        <p className="eyebrow">06 // contact</p>
        <h2>Let's build something that feels alive.</h2>
      </div>
      <a className="contact-link" href="mailto:me@irop.one">
        <Mail aria-hidden="true" />
        me@irop.one
      </a>
    </section>
  );
}

function Shortcuts({ open, onClose }) {
  return (
    <aside className="shortcuts" aria-label="Keyboard shortcuts" hidden={!open}>
      <div className="shortcuts-header">
        <h2>// keyboard.shortcuts</h2>
        <button type="button" aria-label="Close shortcuts" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </div>
      <dl>
        <div>
          <dt>j</dt>
          <dd>Scroll down</dd>
        </div>
        <div>
          <dt>k</dt>
          <dd>Scroll up</dd>
        </div>
        <div>
          <dt>g h</dt>
          <dd>Go home</dd>
        </div>
        <div>
          <dt>g p</dt>
          <dd>Go projects</dd>
        </div>
        <div>
          <dt>?</dt>
          <dd>Toggle this panel</dd>
        </div>
        <div>
          <dt>Esc</dt>
          <dd>Close overlays</dd>
        </div>
      </dl>
    </aside>
  );
}

function Footer() {
  const { progress, time } = useFooterStatus();

  return (
    <footer className="site-footer">
      <span>[MODE: EXPLORING]</span>
      <span>// irop.one</span>
      <span>{progress}%</span>
      <span>{time}</span>
      <a href="#home">top</a>
    </footer>
  );
}

export default function App() {
  const activeSection = useActiveSection();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  useKeyboardShortcuts({ setShortcutsOpen });

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <Header activeSection={activeSection} />
      <main id="main">
        <Hero />
        <FocusBand />
        <Spaces />
        <Projects />
        <Notes />
        <Contact />
      </main>
      <button
        className="help-button"
        type="button"
        aria-label="Show keyboard shortcuts"
        aria-expanded={shortcutsOpen}
        onClick={() => setShortcutsOpen((open) => !open)}
      >
        <CircleHelp aria-hidden="true" />
      </button>
      <Shortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <Footer />
    </>
  );
}
