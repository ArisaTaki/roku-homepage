import type { Locale, WorkId } from "./i18n";
import { previewImageUrl } from "./lib/previewImages";
import "./ProjectShowcase.css";

const labels = {
  zh: { play: "打开试玩", levels: "500 关 · 染色解谜", guild: "宝石 · 商路 · 声望", local: "本地短视频创作", draft: "开发中的作品", plan: "分镜", voice: "配音", video: "成片", cards: "轮抽 · 出牌 · 传牌", record: "口播场记", cover: "封面草稿" },
  en: { play: "Explore & play", levels: "500 levels · Color puzzles", guild: "Gems · Trade · Prestige", local: "Local video creation", draft: "A work in progress", plan: "Storyboard", voice: "Narration", video: "Video", cards: "Draft · Play · Pass", record: "Recording notes", cover: "Cover drafts" },
  ja: { play: "詳細とプレイ", levels: "500 ステージ · 色のパズル", guild: "宝石 · 交易 · 名声", local: "ローカル動画制作", draft: "開発中の作品", plan: "絵コンテ", voice: "ナレーション", video: "動画", cards: "ドラフト · 出す · 渡す", record: "収録メモ", cover: "表紙の下書き" },
};

export function ProjectShowcase({ id, locale }: { id: WorkId; locale: Locale }) {
  const copy = labels[locale];
  if (id === "ranlu" || id === "jingang-guild") {
    const ranlu = id === "ranlu";
    return (
      <div className={`project-showcase showcase-${id}`} aria-hidden="true">
        <div className="showcase-caption">
          <span>{ranlu ? "COLOR STUDIES / 500" : "CRYSTAL HARBOR GUILD"}</span>
          <strong>{ranlu ? <>染<br />路</> : <>晶港<br />商会</>}</strong>
          <p>{ranlu ? copy.levels : copy.guild}</p>
        </div>
        <img className="showcase-screen showcase-screen-back" src={previewImageUrl(`/assets/projects/${ranlu ? "ranlu-map" : "jingang-home"}.png`)} alt="" loading="lazy" decoding="async" />
        <img className="showcase-screen showcase-screen-front" src={previewImageUrl(`/assets/projects/${ranlu ? "ranlu-board" : "jingang-board"}.png`)} alt="" loading="lazy" decoding="async" />
        <span className="showcase-footer">{copy.play}<b>↗</b></span>
      </div>
    );
  }

  if (id === "yki-video-generator") {
    return (
      <div className="project-showcase showcase-yki" aria-hidden="true">
        <div className="showcase-caption"><span>YKI / VIDEO GENERATOR</span><strong>From idea<br />to a little film.</strong><p>{copy.local}</p></div>
        <div className="showcase-film"><span className="film-time">9:16</span><div className="film-sun" /><div className="film-landscape" /><div className="film-subtitle">A story begins.</div></div>
        <div className="showcase-timeline">
          <div><b>01</b><span>{copy.plan}</span><i className="timeline-shots"><i /><i /><i /></i></div>
          <div><b>02</b><span>{copy.voice}</span><i className="timeline-wave">{Array.from({ length: 22 }, (_, n) => <i key={n} style={{ height: `${6 + (n * 13 % 21)}px` }} />)}</i></div>
          <div><b>03</b><span>{copy.video}</span><i className="timeline-export">MP4 + SRT <b>↗</b></i></div>
        </div>
      </div>
    );
  }

  if (id === "naiwa-yuushiya") {
    return (
      <div className="project-showcase showcase-naiwa" aria-hidden="true">
        <div className="showcase-caption"><span>NAIWA / TABLE GAME</span><strong>如果有勇者<br />在的话就好了</strong><p>{copy.cards}</p></div>
        <div className="showcase-hand">{["♜", "♛", "♟"].map((mark, index) => <div key={mark}><small>0{index + 1}</small><b>{mark}</b><span>NAIWA</span></div>)}</div>
        <span className="showcase-footer">{copy.draft}<b>↗</b></span>
      </div>
    );
  }

  return (
    <div className="project-showcase showcase-reflex" aria-hidden="true">
      <div className="showcase-caption"><span>REFLEX LABS / CREATIVE TOOLS</span><strong>Take a breath.<br />Make a draft.</strong><p>{copy.draft}</p></div>
      <div className="reflex-note"><span>LiveTake</span><b>00:24<span>●</span></b><div className="reflex-wave" /><small>{copy.record}</small></div>
      <div className="reflex-cover"><span>Cover Pause</span><b>A<br />NEW<br />DAY.</b><small>{copy.cover}</small></div>
    </div>
  );
}
