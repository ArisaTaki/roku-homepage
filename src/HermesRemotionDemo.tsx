import { Player, type PlayerRef } from "@remotion/player";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
} from "remotion";
import { useEffect, useRef, useState, type ReactNode } from "react";

const FPS = 30;
const DURATION_IN_FRAMES = 600;
const COMPOSITION_WIDTH = 1280;
const COMPOSITION_HEIGHT = 880;

const promptText = "把 Agent 更新整理成发布说明。";
const replyText = "已整理：对话、Agent Studio、气泡模式和 Live2D 工作流都可直接演示。";

function clampFrame(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function range(frame: number, input: number[], output: number[]): number {
  return interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
}

function Cursor() {
  const frame = useCurrentFrame();
  const x = range(
    frame,
    [0, 42, 84, 116, 132, 164, 184, 216, 236, 252, 276, 300, 324, 348, 372, 388, 396, 424, 488, 504],
    [742, 918, 1132, 1132, 1132, 186, 186, 186, 186, 496, 496, 626, 626, 734, 734, 186, 186, 186, 186, 186],
  );
  const y = range(
    frame,
    [0, 42, 84, 116, 132, 164, 184, 216, 236, 252, 276, 300, 324, 348, 372, 388, 396, 424, 488, 504],
    [734, 734, 782, 782, 782, 586, 586, 586, 586, 247, 247, 247, 247, 247, 247, 610, 610, 610, 686, 686],
  );
  const clickFrames = [84, 216, 252, 300, 348, 388, 488];
  const clickPress = Math.max(
    ...clickFrames.map((clickFrame) => {
      if (frame < clickFrame || frame > clickFrame + 10) return 0;
      return spring({
        frame: frame - clickFrame,
        fps: FPS,
        config: { damping: 18, stiffness: 220 },
      });
    }),
  );
  const scale = 1 - clickPress * 0.14;

  return (
    <div className="hy-demo-cursor" style={{ transform: `translate(${x - 3}px, ${y - 3}px) scale(${scale})` }}>
      <span />
    </div>
  );
}

function WindowFrame({
  activeNav,
  title,
  subtitle,
  children,
}: {
  activeNav: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
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
  const isProcessing = frame >= 98;
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
            <button className={isProcessing ? "is-processing" : ""} style={{ transform: `scale(${sendScale})` }}>
              <span className={isProcessing ? "hy-demo-stop-icon" : "hy-demo-send-icon"} />
            </button>
          </div>
        </div>
      </div>
    </WindowFrame>
  );
}

const studioTabs = ["Agents", "Skill Library", "Workflow Studio", "Runs"];

function StudioTabs({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="hy-demo-studio-tabs">
      {studioTabs.map((tab, index) => (
        <span className={activeIndex === index ? "is-active" : ""} key={tab}>
          {tab}
        </span>
      ))}
    </div>
  );
}

function MiniInput({ label, wide = false }: { label: string; wide?: boolean }) {
  return (
    <label className={wide ? "is-wide" : ""}>
      <span>{label}</span>
      <i />
    </label>
  );
}

function AgentStudioAgentsScreen() {
  const agents: Array<[string, string, string, string]> = [
    ["编码Agent Iroha", "Coding Agent", "coding", "/assets/iroha/iroha.png"],
    ["Custom Agent", "Custom Agent", "custom", ""],
    ["设计Agent Kaguya", "Design Agent", "design", "/assets/hermes/yachiyo-default.jpg"],
    ["Yachiyo Orchestrator", "Yachiyo Orchestrator", "orchestrator", ""],
  ];

  return (
    <section className="hy-demo-studio-grid hy-demo-agent-screen">
      <aside className="hy-demo-studio-card">
        <header>
          <h4>Agents</h4>
          <div>
            <span>管理</span>
            <span>新建</span>
          </div>
        </header>
        <div className="hy-demo-agent-list">
          {agents.map(([name, base, category, avatar], index) => (
            <article className={index === 0 ? "is-active" : ""} key={name}>
              {avatar ? <img src={avatar} alt="" /> : <b>{name.slice(0, 1)}</b>}
              <div>
                <strong>{name}</strong>
                <small>{base}</small>
                <em>{category} · Chat Profile</em>
              </div>
            </article>
          ))}
        </div>
      </aside>
      <div className="hy-demo-studio-card hy-demo-agent-editor-mini">
        <header>
          <h4>新建 Agent</h4>
        </header>
        <div className="hy-demo-agent-profile-row">
          <div className="hy-demo-agent-letter">A</div>
          <div className="hy-demo-mini-form">
            <MiniInput label="Name" />
            <MiniInput label="Nickname" />
            <MiniInput label="Avatar" wide />
            <MiniInput label="Description" wide />
          </div>
        </div>
        <div className="hy-demo-mini-form is-two">
          <MiniInput label="Category" />
          <MiniInput label="Output Contract" />
        </div>
        <div className="hy-demo-form-block">
          <span>Functional Instructions</span>
        </div>
        <div className="hy-demo-capability-row">
          {["Read workspace", "Write files", "Run commands", "Write artifacts"].map((item, index) => (
            <span className={index === 3 ? "is-on" : ""} key={item}>
              {item}
            </span>
          ))}
        </div>
        <p>保存 Agent 后即可直接运行，并在 Runs 中查看结果和 artifacts。</p>
      </div>
    </section>
  );
}

function AgentStudioSkillsScreen() {
  return (
    <section className="hy-demo-studio-grid hy-demo-skill-screen">
      <aside className="hy-demo-studio-card hy-demo-skill-import">
        <header>
          <h4>Yachiyo Skills</h4>
        </header>
        <p>安装或上传的 Skills 会进入 Yachiyo 管理区。</p>
        <div className="hy-demo-select-row">
          <span>导入到文件夹</span>
          <b>无需分组</b>
        </div>
        <div className="hy-demo-command-box">
          <span>Skill 来源或安装命令</span>
          <i>owner/repo --skill skill-name</i>
          <button>安装并同步</button>
        </div>
        <div className="hy-demo-drop-zone">
          <strong>拖拽 Skill 目录或 zip 到这里</strong>
          <span>自动校验 SKILL.md</span>
        </div>
        <div className="hy-demo-source-root">
          <strong>Hermes Global</strong>
          <em>89 skills</em>
          <code>/Users/hacchiroku/.hermes/skills</code>
        </div>
      </aside>
      <div className="hy-demo-studio-card hy-demo-skill-library">
        <header>
          <h4>Yachiyo Skill Library</h4>
          <em>0 Yachiyo / 89 Hermes</em>
        </header>
        <div className="hy-demo-filter-row">
          <span>Yachiyo</span>
          <span className="is-active">Hermes Agent</span>
          <i>全部文件夹</i>
        </div>
        <div className="hy-demo-search-line">搜索 Skill 名称、路径或摘要</div>
        <div className="hy-demo-skill-list">
          {[
            ["workspace", "Read files, list dirs, apply patches"],
            ["browser", "Capture pages and inspect UI states"],
            ["memory", "Lookup durable assistant context"],
          ].map(([name, desc], index) => (
            <article className={index === 0 ? "is-active" : ""} key={name}>
              <div>
                <strong>{name}</strong>
                <span>Hermes Agent</span>
              </div>
              <p>{desc}</p>
              <code>~/.hermes/skills/{name}</code>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AgentStudioWorkflowScreen() {
  const nodes: Array<[string, string, number, number]> = [
    ["start", "Start", 4, 34],
    ["orchestrator", "Yachiyo", 20, 28],
    ["research", "Research", 36, 42],
    ["design", "Design", 52, 24],
    ["coding", "Iroha", 68, 40],
    ["review", "Review", 82, 28],
  ];

  return (
    <section className="hy-demo-studio-grid hy-demo-workflow-screen">
      <aside className="hy-demo-studio-card hy-demo-workflow-list">
        <header>
          <h4>Workflows</h4>
          <div>
            <span>管理</span>
            <span>新建</span>
          </div>
        </header>
        {[
          ["Phase 4 Agent 全线流通测试", "8 nodes · 7 edges"],
          ["网页点子全流程", "5 nodes · 4 edges"],
          ["design-coding-test", "3 nodes · 2 edges"],
        ].map(([name, meta], index) => (
          <article className={index === 0 ? "is-active" : ""} key={name}>
            <strong>{name}</strong>
            <span>{meta}</span>
          </article>
        ))}
      </aside>
      <div className="hy-demo-studio-card hy-demo-workflow-editor">
        <div className="hy-demo-workflow-toolbar">
          <b>Phase 4 Agent 全线流通测试</b>
          <span>启用</span>
          {["全线测试模板", "Agent", "Approval", "Artifact", "保存"].map((item) => (
            <em key={item}>{item}</em>
          ))}
        </div>
        <div className="hy-demo-workflow-palette">
          {["编码Agent Iroha", "设计Agent Kaguya", "Yachiyo Orchestrator"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="hy-demo-flow-canvas">
          <svg className="hy-demo-flow-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M11 41 C18 41 17 35 24 35" />
            <path d="M30 35 C36 35 34 49 40 49" />
            <path d="M46 49 C52 49 50 31 56 31" />
            <path d="M62 31 C68 31 66 47 72 47" />
            <path d="M77 47 C82 47 81 35 86 35" />
          </svg>
          {nodes.map(([id, label, left, top], index) => (
            <div className={`hy-demo-flow-node is-${id}`} style={{ left: `${left}%`, top: `${top}%` }} key={id}>
              <strong>{label}</strong>
              <span>{index === 0 ? "input" : "agent"}</span>
            </div>
          ))}
          <div className="hy-demo-flow-controls">
            <span>+</span>
            <span>-</span>
            <span>fit</span>
          </div>
          <div className="hy-demo-minimap">
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="hy-demo-workflow-bottom">
          <div>
            <strong>节点设置</strong>
            <span>8 nodes / 7 edges</span>
          </div>
          <div>
            <strong>运行顺序</strong>
            <span>7 steps · Flow Summary Artifact</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function AgentStudioRunsScreen() {
  return (
    <section className="hy-demo-studio-grid hy-demo-runs-screen">
      <aside className="hy-demo-studio-card hy-demo-run-browser">
        <header>
          <h4>Run Agent / Workflow</h4>
        </header>
        <div className="hy-demo-select-row">
          <span>Target</span>
          <b>选择 Agent 或 Workflow</b>
        </div>
        <div className="hy-demo-goal-box">Goal</div>
        <div className="hy-demo-run-head">
          <strong>Run History · 50</strong>
          <span>管理</span>
        </div>
        <div className="hy-demo-filter-row">
          <span className="is-active">All 50</span>
          <span>Workflows 28</span>
          <span>Agents 22</span>
        </div>
        <div className="hy-demo-run-groups">
          {[
            ["design-coding-test", "Workflow · 4 runs · 4 failed", "做一个获取今日新闻的网页", "failed"],
            ["Coding Agent", "Agent · 1 runs · 1 done", "round-two-iroha-marker", "done"],
            ["workflow multi-agent", "Workflow · 2 runs · 2 done", "Design child should write design.md", "done"],
          ].map(([group, meta, run, status], index) => (
            <article className={index === 1 ? "is-active" : ""} key={group}>
              <header>
                <strong>{group}</strong>
                <span>{meta}</span>
              </header>
              <p>
                <i className={`is-${status}`} />
                {run}
              </p>
            </article>
          ))}
        </div>
      </aside>
      <div className="hy-demo-studio-card hy-demo-run-detail">
        <header>
          <h4>Run Detail</h4>
        </header>
        <div className="hy-demo-run-hero">
          <img src="/assets/iroha/iroha.png" alt="" />
          <div>
            <span>Agent Run · 06/07 00:29</span>
            <strong>Coding Agent</strong>
            <p>这是 Codex multi-turn smoke test 第二轮。</p>
          </div>
          <em>已完成</em>
        </div>
        <div className="hy-demo-run-meta">
          <span>Updated 06/07</span>
          <span>Session linked</span>
          <span>Artifacts ready</span>
        </div>
        <section>
          <h5>Result</h5>
          <p>round-two-iroha-marker — 编码Agent Iroha 第二轮回复就位。</p>
        </section>
        <section className="hy-demo-run-timeline">
          <h5>Timeline</h5>
          {["Run created", "Agent responded", "Artifacts synced"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </section>
      </div>
    </section>
  );
}

function AgentStudioScene() {
  const frame = useCurrentFrame();
  const local = frame;
  const activeIndex = local < 36 ? 0 : local < 84 ? 1 : local < 132 ? 2 : 3;
  const tabStart = [0, 36, 84, 132][activeIndex];
  const enter = spring({
    frame: Math.max(0, local - tabStart),
    fps: FPS,
    config: { damping: 22, stiffness: 160 },
  });

  return (
    <WindowFrame activeNav="Agent Studio" title="Agent Studio" subtitle="Agent Runtime">
      <div className="hy-demo-studio">
        <StudioTabs activeIndex={activeIndex} />
        <div
          className="hy-demo-studio-viewport"
          style={{
            opacity: 0.68 + enter * 0.32,
            transform: `translateY(${(1 - enter) * 12}px)`,
          }}
        >
          {activeIndex === 0 ? <AgentStudioAgentsScreen /> : null}
          {activeIndex === 1 ? <AgentStudioSkillsScreen /> : null}
          {activeIndex === 2 ? <AgentStudioWorkflowScreen /> : null}
          {activeIndex === 3 ? <AgentStudioRunsScreen /> : null}
        </div>
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
  const imageScale = 0.92 + range(local, [0, 56], [0, 0.04]);
  const chipOpacity = range(local, [28, 68], [0, 1]);

  return (
    <WindowFrame activeNav="Live2D 模式" title="Live2D 模式" subtitle="Model stage">
      <div className="hy-demo-live2d-page">
        <div className="hy-demo-live2d-stage">
          <span className="hy-demo-live2d-aura" />
          <span className="hy-demo-live2d-guide" />
          <img src="/assets/hermes/hermes-live2d-character.png" alt="" style={{ transform: `scale(${imageScale})` }} />
        </div>
        <section className="hy-demo-live2d-copy">
          <h4>Live2D 模式</h4>
          <p>虚拟形象互动，让八千代在你的桌面上活起来。支持口型同步、表情动作、语音合成等功能。</p>
          <div style={{ opacity: chipOpacity }}>
            {["口型同步", "4 个表情", "2 组动作", "语音合成", "自定义 · 60 FPS", "月光舞台"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>
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
      <Sequence from={216} durationInFrames={180}>
        <AgentStudioScene />
      </Sequence>
      <Sequence from={396} durationInFrames={108}>
        <BubbleScene />
      </Sequence>
      <Sequence from={504} durationInFrames={96}>
        <Live2DScene />
      </Sequence>
      <Cursor />
    </AbsoluteFill>
  );
}

export function HermesReplay() {
  const playerRef = useRef<PlayerRef | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSession, setPlaySession] = useState(0);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!window.matchMedia("(hover: none)").matches) return undefined;

    isPlayingRef.current = true;
    setPlaySession((current) => current + 1);
    setIsPlaying(true);
    return undefined;
  }, []);

  useEffect(() => {
    let raf = 0;
    let startedAt = 0;

    const tick = (timestamp: number) => {
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
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    setPlaySession((current) => current + 1);
    setIsPlaying(true);
  };

  const stopReplay = () => {
    isPlayingRef.current = false;
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
        ref={playerRef}
        className="hermes-remotion-player"
        component={HermesDemoComposition}
        compositionWidth={COMPOSITION_WIDTH}
        compositionHeight={COMPOSITION_HEIGHT}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        acknowledgeRemotionLicense
        loop
        controls={false}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
