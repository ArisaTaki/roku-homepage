import { useEffect, useMemo, useRef, useState } from "react";

const TRAVEL_DISTANCE = 9540;

const works = [
  {
    title: "AI Is Smart Enough, Let's Just Point and Talk to it ;)",
    description: "An exploration of multi-input interaction with AI Interfaces",
    meta: "Concept",
    image: "/assets/diana/point-talk.png",
    width: 579,
    left: 1500,
  },
  {
    title: "Bring Fun to Everyday Digital Products",
    description: "What is fun anyways?",
    meta: "Apps, Concept",
    image: "/assets/diana/fun-products.png",
    width: 599,
    left: 2479,
  },
  {
    title: "TikTok Intern",
    description: "Product Design for TikTok Mobile Effect Creation Tool",
    meta: "App Design",
    image: "/assets/diana/tiktok.png",
    width: 413,
    left: 3478,
    square: true,
  },
  {
    title: "Hyper Online",
    description: "Design for AI companion and V-Tubing experience.",
    meta: "App Design, Web Design",
    image: "/assets/diana/hyper-online.png",
    width: 387,
    left: 4291,
    square: true,
  },
  {
    title: "OKDive",
    description: "App made to improve freediver's diving experience.",
    meta: "App, Multiplatform, Concept",
    image: "/assets/diana/okdive.png",
    width: 669,
    left: 5078,
  },
  {
    title: "Yotype",
    description: "Easy typeface finding tool for creatives.",
    meta: "Web, Concept, AI",
    image: "/assets/diana/yotype.png",
    width: 423,
    left: 6147,
    square: true,
  },
  {
    title: "Magic",
    description: "Motion practice experimenting with complex transitions.",
    meta: "Motion",
    image: "/assets/diana/magic.png",
    width: 493,
    left: 6970,
    short: true,
  },
  {
    title: "This is what I love about music...",
    description: 'Kinetic typography animation narrating script from the movie "Begin Again".',
    meta: "Motion, Typography",
    image: "/assets/diana/music.png",
    width: 493,
    left: 7531,
    short: true,
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

function DoodlePerson({ className = "", variant = "walker" }) {
  if (variant === "standing") {
    return (
      <svg className={`doodle-person ${className}`} viewBox="0 0 190 440" aria-hidden="true">
        <path d="M80 103c16-24 50-33 78-18 20 11 26 30 11 44-15 13-49 14-76 3-20-8-24-16-13-29Z" />
        <path d="M96 93c-7-18 2-34 22-39m-36 62c21-6 50-4 78 4" />
        <path d="M105 108c8 5 27 10 52 10" />
        <path d="M119 112c7 19-14 37-38 31" />
        <path d="M91 143c-13 44-13 98-3 162 9 60 9 103-4 131" />
        <path d="M145 142c-2 52 2 113 12 181 9 58 4 94-15 113" />
        <path d="M104 82c-25-13-46-8-59 12m14-21c25-19 59-21 95-7M50 101c19-23 46-31 82-24" />
        <path d="M108 116h43c5 0 9 4 9 9v8c0 5-4 9-9 9h-43c-5 0-9-4-9-9v-8c0-5 4-9 9-9Z" />
        <path d="M133 127h-18m54 5c-9-2-18-2-27-1" />
        <path d="M110 345l9 9m9-9-9 9" />
      </svg>
    );
  }

  return (
    <svg className={`doodle-person ${className}`} viewBox="0 0 430 260" aria-hidden="true">
      <path d="M97 88c19-41 82-54 120-22 18 15 18 40-1 56-27 22-80 16-111-13-7-7-10-14-8-21Z" />
      <path d="M117 74c3-30 33-49 70-41m-57 83c22 12 59 12 93 1" />
      <path d="M109 97c-28 4-49 16-63 35" />
      <path d="M207 119c46 37 95 70 148 99m-126-83c28 37 62 72 101 105" />
      <path d="M231 147c-12 27-31 45-57 54m120 8c31 10 56 15 75 16" />
      <path d="M170 199c27 2 52 10 75 23m-97-22c-12 8-19 18-22 31" />
      <path d="M96 68c-7-24 4-42 34-52m3 39c-19-30-10-45 26-46m-4 49c-6-29 7-45 42-47m-19 56c11-23 30-31 58-25" />
      <path d="M105 116c7 17 27 26 58 27" />
      <circle cx="245" cy="221" r="10" />
      <path d="M238 222c-20 0-38-5-54-14" />
    </svg>
  );
}

function FloatingNav({ compact }) {
  return (
    <>
      <a className={`mini-logo ${compact ? "visible" : ""}`} href="#top" aria-label="Diana Lu home">
        <img src="/assets/diana/mini-logo.png" alt="" />
      </a>
      <nav className={`nav-card ${compact ? "compact" : ""}`} aria-label="Primary navigation">
        <a className="nav-row" href="#project">
          <span>Works</span>
          <span className="arrow">→</span>
          <span className="icon-strip" aria-hidden="true">
            <i>OK</i>
            <i>友</i>
            <i>♫</i>
            <i>☝︎</i>
            <i>?</i>
          </span>
        </a>
        <a className="nav-row" href="#about">
          <span>Me</span>
          <span className="arrow">→</span>
          <span className="icon-strip social-strip" aria-hidden="true">
            <i>in</i>
            <i>✉︎</i>
            <i>𝕏</i>
          </span>
        </a>
        <a className="nav-row resume" href="#resume">
          <span>Download Resume</span>
          <span className="download">↓</span>
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
    <div className="stage" aria-label="Diana Lu portfolio exhibition">
      <div className="desktop-track" style={{ transform }}>
        <h1 className="desktop-title">Diana.Lu</h1>
        <p className="desktop-intro">
          Diana Lu is an interaction
          <br />
          designer based in LA, this is an
          <br />
          exhibition of her works :DDD
        </p>
        <img className="ddd-mark" src="/assets/diana/ddd.svg" alt="" />
        <DoodlePerson className="walker" />
        <DoodlePerson className="standing" variant="standing" />
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
            href="#project"
            key={work.title}
            style={{ left: `${work.left}px`, width: `${work.width}px` }}
          >
            <img src={work.image} alt="" />
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
        <h1 id="mobile-title">Diana.Lu</h1>
        <p>
          Diana Lu is an interaction
          <br />
          designer based in LA, this is an
          <br />
          exhibition of her works :DDD
        </p>
        <div className="mobile-logo-wrap">
          <img src="/assets/diana/ddd.svg" alt="" />
          <DoodlePerson className="mobile-walker" />
        </div>
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
            href="#mobile-works"
            key={work.title}
          >
            <img src={work.image} alt="" />
            <h2>{work.title}</h2>
            <p>{work.description}</p>
            <small>{work.meta}</small>
          </a>
        ))}
      </section>
      <section id="about" className="mobile-about" aria-label="About Diana Lu">
        <div className="mobile-wave" aria-hidden="true" />
        <h2>
          Diana Lu is a designer.
          <br />
          She does <span className="blue">interaction</span> and <span className="green">product</span>
          <br />
          design to bring joy :D
        </h2>
        <DoodlePerson className="about-doodle" variant="standing" />
      </section>
    </div>
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
      </main>
    </>
  );
}
