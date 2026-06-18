import { useEffect, useMemo, useRef, useState } from "react";
import { starterQuestions } from "./data/iropKnowledge";
import { answerVisitorQuestion } from "./lib/iropAssistant";

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
  const messagesRef = useRef(null);

  useEffect(() => {
    const messagePanel = messagesRef.current;
    if (!messagePanel) return;
    messagePanel.scrollTop = compact ? 0 : messagePanel.scrollHeight;
  }, [compact, messages]);

  const ask = (question) => {
    const normalized = question.trim();
    if (!normalized) return;
    const answer = answerVisitorQuestion(normalized);
    setMessages((current) => (
      compact
        ? [{ role: "assistant", ...answer }]
        : [
            ...current.slice(-3),
            { role: "user", text: normalized },
            { role: "assistant", ...answer },
          ]
    ));
    setInput("");
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
          <b>LOCAL KB</b>
        </div>
        <div className="pet-messages" aria-live="polite" ref={messagesRef}>
          {messages.map((message, index) => (
            <p className={`pet-message ${message.role}`} key={`${message.role}-${index}-${message.text}`}>
              <span>{message.text}</span>
              {message.role === "assistant" && message.source ? <small>Source: {message.source}</small> : null}
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
            <button type="button" onClick={() => ask(question)} key={question}>
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
          />
          <button type="submit">Ask</button>
        </form>
      </div>
    </section>
  );
}

function WorkVisual({ work }) {
  if (work.image) {
    return <img src={work.image} alt="" />;
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
