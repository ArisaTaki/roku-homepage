import { Player } from "@remotion/player";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
} from "remotion";
import { useEffect, useRef, useState } from "react";

const FPS = 30;
const DURATION_IN_FRAMES = 540;
const COMPOSITION_WIDTH = 1280;
const COMPOSITION_HEIGHT = 880;

const promptText = "把 Agent 更新整理成发布说明。";
const replyText = "已整理：对话、Agent Studio、气泡模式和 Live2D 工作流都可直接演示。";

function clampFrame(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function range(frame, input, output) {
  return interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
}

function Cursor() {
  const frame = useCurrentFrame();
  const x = range(frame, [0, 42, 96, 150, 246, 360, 468], [872, 940, 1030, 814, 212, 214, 214]);
  const y = range(frame, [0, 42, 96, 150, 246, 360, 468], [780, 780, 780, 485, 498, 558, 616]);
  const press = spring({
    frame: Math.max(0, frame - 84),
    fps: FPS,
    config: { damping: 18, stiffness: 220 },
  });
  const scale = frame > 78 && frame < 92 ? 1 - press * 0.16 : 1;

  return (
    <div className="hy-demo-cursor" style={{ transform: `translate(${x}px, ${y}px) scale(${scale})` }}>
      <span />
    </div>
  );
}

function WindowFrame({ activeNav, title, subtitle, children }) {
  return (
    <AbsoluteFill className="hy-demo-canvas">
      <div className="hy-demo-window">
        <header className="hy-demo-titlebar">
          <div className="hy-demo-lights">
            <span />
            <span />
            <span />
          </div>
          <b>
            <img src="/assets/hermes/logo.png" alt="" />
            Hermes Yachiyo — {activeNav}
          </b>
          <div className="hy-demo-top-actions">
            <span />
            <span />
          </div>
        </header>
        <div className="hy-demo-body">
          <aside className="hy-demo-sidebar">
            <div className="hy-demo-brand">
              <img src="/assets/hermes/logo.png" alt="" />
              <strong>Hermes Yachiyo</strong>
            </div>
            <div className="hy-demo-persona">
              <img src="/assets/hermes/yachiyo-default.jpg" alt="" />
              <div>
                <b>月見八千代</b>
                <span>八千代待机中</span>
              </div>
            </div>
            <nav>
              <small>启动</small>
              <button className={activeNav === "主控台" ? "is-active" : ""}>主控台</button>
              <button>模型配置 <em>ok</em></button>
              <small>日常桌面</small>
              <button className={activeNav === "对话" ? "is-active" : ""}>对话</button>
              <button className={activeNav === "Agent Studio" ? "is-active" : ""}>Agent Studio</button>
              <button className={activeNav === "气泡模式" ? "is-active" : ""}>气泡模式</button>
              <button className={activeNav === "Live2D 模式" ? "is-active" : ""}>Live2D 模式</button>
            </nav>
          </aside>
          <main className="hy-demo-main">
            <div className="hy-demo-page-title">
              <span>{subtitle}</span>
              <h3>{title}</h3>
            </div>
            {children}
          </main>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function ChatScene() {
  const frame = useCurrentFrame();
  const typedCount = Math.floor(range(frame, [18, 74], [0, promptText.length]));
  const typed = promptText.slice(0, typedCount);
  const sendScale = frame > 84 && frame < 98 ? 1.08 : 1;
  const showUser = frame >= 92;
  const showReply = frame >= 126;
  const replyChars = Math.floor(range(frame, [126, 178], [0, replyText.length]));
  const toolProgress = clampFrame(frame - 154, 0, 72);

  return (
    <WindowFrame activeNav="对话" title="对话" subtitle="Chat with local Agent">
      <div className="hy-demo-chat-layout">
        <div className="hy-demo-session-list">
          <b>会话列表</b>
          <span className="hy-demo-search">搜索会话...</span>
          <div className="hy-demo-tabs">
            <span>Agent</span>
            <span>群组</span>
            <span>+</span>
          </div>
          {["发布说明整理", "博客账号记录", "图像识别测试"].map((item, index) => (
            <article className={index === 0 ? "is-active" : ""} key={item}>
              <img src="/assets/hermes/yachiyo-default.jpg" alt="" />
              <div>
                <strong>{item}</strong>
                <p>{index === 0 ? "正在输入新的问题..." : "已完成"}</p>
              </div>
              <small>{index === 0 ? "now" : `~${index + 3}.1k tok`}</small>
            </article>
          ))}
        </div>
        <div className="hy-demo-chat-panel">
          <header>
            <img src="/assets/hermes/yachiyo-default.jpg" alt="" />
            <div>
              <b>把 Agent 更新整理成发布说明</b>
              <span>就绪 · Hermes · ~6.4k tok</span>
            </div>
          </header>
          <div className="hy-demo-message assistant">今天要把哪些内容同步给我？</div>
          {showUser ? <div className="hy-demo-message user">{promptText}</div> : null}
          {showReply ? (
            <div className="hy-demo-message assistant answer">
              {replyText.slice(0, replyChars)}
              {replyChars < replyText.length ? <i /> : null}
            </div>
          ) : null}
          <div className="hy-demo-tools">
            {["读取 workspace", "整理 changelog", "生成摘要"].map((tool, index) => (
              <span className={toolProgress > index * 18 ? "is-done" : ""} key={tool}>
                {tool}
              </span>
            ))}
          </div>
          <div className="hy-demo-composer">
            <p>
              {typed}
              {typedCount < promptText.length ? <i /> : null}
            </p>
            <button style={{ transform: `scale(${sendScale})` }}>↑</button>
          </div>
        </div>
      </div>
    </WindowFrame>
  );
}

function AgentStudioScene() {
  const frame = useCurrentFrame();
  const local = frame;
  const glow = range(local, [0, 40, 96], [0, 1, 0.35]);

  return (
    <WindowFrame activeNav="Agent Studio" title="Agent Studio" subtitle="Agent Runtime">
      <div className="hy-demo-studio">
        <div className="hy-demo-studio-tabs">
          {["Agents", "Skill Library", "Workflow Studio", "Runs"].map((tab, index) => (
            <span className={index === 0 ? "is-active" : ""} key={tab}>
              {tab}
            </span>
          ))}
        </div>
        <section>
          <aside>
            <h4>Agents</h4>
            {["编码Agent Iroha", "Yachiyo Orchestrator", "设计Agent Kaguya"].map((agent, index) => (
              <article className={index === 0 ? "is-active" : ""} key={agent}>
                <img src={index === 0 ? "/assets/iroha/iroha.png" : "/assets/hermes/yachiyo-default.jpg"} alt="" />
                <div>
                  <strong>{agent}</strong>
                  <p>{index === 0 ? "coding · Chat Profile" : "system · Chat Profile"}</p>
                </div>
              </article>
            ))}
          </aside>
          <div className="hy-demo-agent-form" style={{ boxShadow: `0 0 ${48 * glow}px rgba(101, 205, 222, ${0.24 * glow})` }}>
            <h4>编码Agent Iroha</h4>
            <div className="hy-demo-form-grid">
              <label>Name<span>编码Agent Iroha</span></label>
              <label>Nickname<span>Iroha</span></label>
              <label>Output Contract<span>chat</span></label>
              <label>Tools<span>workspace · browser · memory</span></label>
            </div>
            <p>把功能要求、人格提示、工具策略和模型配置放在同一个可运行 Agent 配置里。</p>
            <div className="hy-demo-run-strip">
              <span>读取 workspace</span>
              <span>整理 changelog</span>
              <span>生成摘要</span>
            </div>
          </div>
        </section>
      </div>
    </WindowFrame>
  );
}

function BubbleScene() {
  const frame = useCurrentFrame();
  const local = frame;
  const firstBubble = range(local, [0, 24], [0, 1]);
  const secondBubble = range(local, [22, 46], [0, 1]);
  const thirdBubble = range(local, [34, 64], [0, 1]);
  const avatarLift = range(local, [28, 66], [44, 0]);

  return (
    <WindowFrame activeNav="气泡模式" title="气泡模式" subtitle="Desktop bubble">
      <div className="hy-demo-bubble-page">
        <div className="hy-demo-bubble-copy">
          <h4>轻量桌面入口</h4>
          <p>同步聊天处理、未读、最新回复和主动关怀状态。</p>
        </div>
        <div className="hy-demo-bubble-window">
          <header>
            <img src="/assets/hermes/yachiyo-default.jpg" alt="" />
            <div>
              <b>月見八千代</b>
              <span>就绪</span>
            </div>
          </header>
          <div className="hy-demo-bubble-thread">
            <p className="is-agent" style={{ opacity: firstBubble }}>
              今晚的月光很安静，要一起整理工作区吗？
            </p>
            <p className="is-user" style={{ opacity: secondBubble }}>
              帮我看一下最近的状态。
            </p>
            <p className="is-agent is-long" style={{ opacity: thirdBubble }}>
              好~记住了！让我更新一下相关配置~现在更新发布脚本中的域名，搞定啦。
            </p>
          </div>
          <div className="hy-demo-bubble-avatar" style={{ transform: `translateY(${avatarLift}px)` }}>
            <img src="/assets/hermes/yachiyo-default.jpg" alt="" />
          </div>
        </div>
      </div>
    </WindowFrame>
  );
}

function Live2DScene() {
  const frame = useCurrentFrame();
  const local = frame;
  const imageScale = 1.03 + range(local, [0, 56], [0, 0.06]);
  const chipOpacity = range(local, [28, 68], [0, 1]);

  return (
    <WindowFrame activeNav="Live2D 模式" title="Live2D 模式" subtitle="Model stage">
      <div className="hy-demo-live2d-page">
        <div className="hy-demo-live2d-stage">
          <span className="hy-demo-live2d-aura" />
          <img src="/assets/hermes/hermes-live2d-character.png" alt="" style={{ transform: `scale(${imageScale})` }} />
          <div style={{ opacity: chipOpacity }}>
            {["口型同步", "4 个表情", "2 组动作", "月光舞台"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </div>
    </WindowFrame>
  );
}

function HermesDemoComposition() {
  return (
    <AbsoluteFill className="hy-demo-root">
      <Sequence from={0} durationInFrames={216}>
        <ChatScene />
      </Sequence>
      <Sequence from={216} durationInFrames={120}>
        <AgentStudioScene />
      </Sequence>
      <Sequence from={336} durationInFrames={108}>
        <BubbleScene />
      </Sequence>
      <Sequence from={444} durationInFrames={96}>
        <Live2DScene />
      </Sequence>
      <Cursor />
    </AbsoluteFill>
  );
}

export function HermesReplay() {
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSession, setPlaySession] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!window.matchMedia("(hover: none)").matches) return undefined;

    setPlaySession((current) => current + 1);
    setIsPlaying(true);
    return undefined;
  }, []);

  useEffect(() => {
    let raf = 0;
    let startedAt = 0;

    const tick = (timestamp) => {
      if (!startedAt) startedAt = timestamp;
      const elapsedSeconds = (timestamp - startedAt) / 1000;
      const nextFrame = Math.floor(elapsedSeconds * FPS) % DURATION_IN_FRAMES;
      playerRef.current?.seekTo(nextFrame);
      raf = window.requestAnimationFrame(tick);
    };

    if (isPlaying) {
      playerRef.current?.seekTo(0);
      raf = window.requestAnimationFrame(tick);
    } else {
      playerRef.current?.seekTo(0);
    }

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [isPlaying, playSession]);

  const startReplay = () => {
    setPlaySession((current) => current + 1);
    setIsPlaying(true);
  };

  const stopReplay = () => {
    setIsPlaying(false);
  };

  return (
    <div
      className={`hermes-remotion-shell ${isPlaying ? "is-playing" : "is-idle"}`}
      aria-hidden="true"
      onMouseEnter={startReplay}
      onMouseLeave={stopReplay}
      onFocus={startReplay}
      onBlur={stopReplay}
    >
      <Player
        key={isPlaying ? `playing-${playSession}` : "idle"}
        ref={playerRef}
        className="hermes-remotion-player"
        component={HermesDemoComposition}
        compositionWidth={COMPOSITION_WIDTH}
        compositionHeight={COMPOSITION_HEIGHT}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        loop
        controls={false}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
