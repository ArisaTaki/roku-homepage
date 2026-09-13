import { Player, type PlayerRef } from "@remotion/player";
import { usePreviewInteraction, usePreviewPlayback, type PreviewPlaybackProps } from "./usePreviewVisibility";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame } from "remotion";
import { useRef } from "react";
import { previewImageUrl } from "./lib/previewImages";

const FPS = 30;
const DURATION_IN_FRAMES = 510;
const COMPOSITION_WIDTH = 1280;
const COMPOSITION_HEIGHT = 880;

type GalleryAlbum = {
  title: string;
  image: string;
};

type GalleryPhoto = {
  title: string;
  image: string;
};

const albums: GalleryAlbum[] = [
  { title: "超时空辉夜姬!", image: "/assets/gallery-new/cover-kaguya.webp" },
  { title: "天气之子", image: "/assets/gallery-new/weathering-main.webp" },
  { title: "你的名字", image: "/assets/gallery-new/cover-your-name.webp" },
  { title: "魔女之旅", image: "/assets/gallery-new/cover-wandering-witch.webp" },
  { title: "孤独摇滚", image: "/assets/gallery-new/cover-bocchi.webp" },
  { title: "少女哭泣乐队", image: "/assets/gallery-new/cover-girls-band-cry.webp" },
  { title: "败犬女主", image: "/assets/gallery-new/cover-makeine.webp" },
];

const kaguyaPhotos: GalleryPhoto[] = [
  { title: "辉夜 · 主视觉 01", image: "/assets/gallery-new/cover-kaguya.webp" },
  { title: "彩叶与辉夜 · 主视觉 02", image: "/assets/gallery-new/kaguya-visual-02.webp" },
  { title: "月见八千代 · 主视觉 03", image: "/assets/gallery-new/kaguya-visual-03.webp" },
  { title: "虚拟空间月读 · 场景视觉", image: "/assets/gallery-new/kaguya-story.webp" },
  { title: "辉夜 · 角色视觉", image: "/assets/gallery-new/kaguya-character.webp" },
  { title: "酒寄彩叶 · 角色视觉", image: "/assets/gallery-new/kaguya-iroha.webp" },
];

function range(frame: number, input: number[], output: number[]): number {
  return interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
}

function selectedAlbum(frame: number): number {
  if (frame < 14) return -1;
  return 0;
}

function selectedPhoto(frame: number): number {
  if (frame < 278) return 0;
  if (frame < 342) return 2;
  if (frame < 406) return 3;
  return 4;
}

function GalleryLogo() {
  return (
    <div className="gallery-demo-logo">
      <b>IROP</b>
      <span>IMAGES</span>
    </div>
  );
}

function GalleryTopbar({ detail = false }: { detail?: boolean }) {
  return (
    <header className="gallery-demo-topbar">
      <GalleryLogo />
      <div className="gallery-demo-counter">
        <span>01</span>
        <span>07</span>
        <b>{detail ? "01 × 07" : "01 / 07"}</b>
      </div>
      <span className="gallery-demo-about">ABOUT</span>
    </header>
  );
}

function AlbumIndex({ frame }: { frame: number }) {
  const activeAlbum = selectedAlbum(frame);
  const opacity = range(frame, [72, 102], [1, 0]);
  const scale = range(frame, [72, 102], [1, 1.035]);

  return (
    <AbsoluteFill className="gallery-demo-index" style={{ opacity, transform: `scale(${scale})` }}>
      <GalleryTopbar />
      <div className="gallery-demo-ticks" aria-hidden="true">
        {Array.from({ length: 27 }, (_, index) => <i key={index} />)}
      </div>
      <div className="gallery-demo-albums">
        {albums.map((album, index) => {
          const isActive = index === activeAlbum;
          return (
            <div className={`gallery-demo-album ${isActive ? "is-active" : ""}`} key={album.title}>
              <img src={previewImageUrl(album.image)} alt="" />
              <span>{String(index + 1).padStart(2, "0")}</span>
            </div>
          );
        })}
      </div>
      <div className="gallery-demo-index-meta">
        <p>ALBUM COLLECTION<br />07 ALBUMS</p>
        <p>
          <strong>{activeAlbum >= 0 ? albums[activeAlbum].title : "超时空辉夜姬!"}</strong><br />
          06 PHOTOS<br />
          {String(Math.max(0, activeAlbum) + 1).padStart(2, "0")} / 07
        </p>
      </div>
    </AbsoluteFill>
  );
}

function AlbumTransition({ frame }: { frame: number }) {
  const progress = range(frame, [70, 108], [0, 1]);
  const opacity = range(frame, [68, 76, 104, 116], [0, 1, 1, 0]);
  const left = range(frame, [70, 108], [310, 294]);
  const top = range(frame, [70, 108], [264, 214]);
  const width = range(frame, [70, 108], [106, 692]);
  const height = range(frame, [70, 108], [286, 392]);

  return (
    <div
      className="gallery-demo-album-transition"
      style={{
        left,
        top,
        width,
        height,
        opacity,
        clipPath: `inset(0 ${Math.max(0, (1 - progress) * 8)}% 0 0)`,
      }}
    >
      <img src={previewImageUrl("/assets/gallery-new/cover-kaguya.webp")} alt="" />
      <i style={{ transform: `translateX(${progress * 108}%)` }} />
    </div>
  );
}

function GalleryFooter({ photoMode = false }: { photoMode?: boolean }) {
  return (
    <footer className="gallery-demo-footer">
      <p>ALBUM COLLECTION<br />07 ALBUMS</p>
      <dl>
        <div><dt>A</dt><dd>UPDATED</dd><strong>2026.07.11</strong></div>
        <div><dt>B</dt><dd>PHOTOS</dd><strong>06 PHOTOS</strong></div>
        <div><dt>C</dt><dd>ACCESS</dd><strong>PUBLIC ALBUM</strong></div>
        <div><dt>D</dt><dd>ALBUM</dd><strong>001 / 007</strong></div>
      </dl>
      <div className="gallery-demo-view-label">
        <span>↗</span>
        <b>{photoMode ? "OPEN IMAGE" : "VIEW PHOTOS"}</b>
      </div>
      <p>官方宣传图收藏 · SOURCE: CHO-KAGUYAHIME.COM</p>
      <p>超时空辉夜姬!<br />06 PHOTOS<br />01 / 07</p>
    </footer>
  );
}

function AlbumDetail({ frame }: { frame: number }) {
  const opacity = range(frame, [88, 112, 202, 226], [0, 1, 1, 0]);
  const titleX = range(frame, [90, 122], [-80, 0]);
  const imageY = range(frame, [92, 120], [30, 0]);

  return (
    <AbsoluteFill className="gallery-demo-detail" style={{ opacity }}>
      <GalleryTopbar detail />
      <h3 className="is-kaguya" style={{ transform: `translateX(${titleX}px)` }}>超时空辉夜姬!</h3>
      <div className="gallery-demo-detail-image" style={{ transform: `translateY(${imageY}px)` }}>
        <img src={previewImageUrl("/assets/gallery-new/cover-kaguya.webp")} alt="" />
      </div>
      <PhotoRail activeIndex={0} muted />
      <GalleryFooter />
    </AbsoluteFill>
  );
}

function PhotoRail({ activeIndex, muted = false }: { activeIndex: number; muted?: boolean }) {
  return (
    <div className={`gallery-demo-photo-rail ${muted ? "is-muted" : ""}`}>
      {kaguyaPhotos.map((photo, index) => (
        <div className={index === activeIndex ? "is-active" : ""} key={photo.title}>
          <img src={previewImageUrl(photo.image)} alt="" />
        </div>
      ))}
    </div>
  );
}

function PhotoStage({ frame }: { frame: number }) {
  const opacity = range(frame, [202, 228], [0, 1]);
  const activePhoto = selectedPhoto(frame);
  const photoSwitchFrames = [214, 278, 342, 406];
  const passedSwitchFrames = photoSwitchFrames.filter((switchFrame) => switchFrame <= frame);
  const latestSwitch = passedSwitchFrames[passedSwitchFrames.length - 1] ?? 214;
  const reveal = spring({
    frame: Math.max(0, frame - latestSwitch),
    fps: FPS,
    config: { damping: 24, stiffness: 120, mass: 0.8 },
  });

  return (
    <AbsoluteFill className="gallery-demo-photo-stage" style={{ opacity }}>
      <GalleryTopbar detail />
      <h3 className="is-kaguya">超时空辉夜姬!</h3>
      <div className={`gallery-demo-photo-main ${activePhoto >= 4 ? "is-character" : ""}`}>
        {kaguyaPhotos.map((photo, index) => (
          <img
            src={previewImageUrl(photo.image)}
            alt=""
            className={index === activePhoto ? "is-active" : ""}
            style={index === activePhoto ? {
              clipPath: `inset(0 ${(1 - reveal) * 100}% 0 0)`,
              transform: `scale(${1.035 - reveal * 0.035})`,
            } : undefined}
            key={photo.title}
          />
        ))}
      </div>
      <PhotoRail activeIndex={activePhoto} />
      <GalleryFooter photoMode />
    </AbsoluteFill>
  );
}

function GalleryCursor() {
  const frame = useCurrentFrame();
  const x = range(
    frame,
    [0, 14, 32, 42, 68, 94, 142, 164, 176, 218, 246, 272, 292, 310, 336, 356, 374, 400, 430, 470, 500],
    [1010, 360, 360, 360, 360, 360, 640, 640, 640, 640, 1192, 1192, 1192, 1192, 1192, 1192, 1192, 1192, 1192, 1192, 1010],
  );
  const y = range(
    frame,
    [0, 14, 32, 42, 68, 94, 142, 164, 176, 218, 246, 272, 292, 310, 336, 356, 374, 400, 430, 470, 500],
    [690, 430, 430, 430, 430, 430, 720, 720, 720, 720, 384, 384, 384, 442, 442, 442, 500, 500, 500, 690, 690],
  );
  const clickFrames = [68, 176, 272, 336, 400];
  const clickPress = Math.max(
    ...clickFrames.map((clickFrame) => {
      if (frame < clickFrame || frame > clickFrame + 9) return 0;
      return spring({ frame: frame - clickFrame, fps: FPS, config: { damping: 18, stiffness: 230 } });
    }),
  );

  return (
    <div
      className="gallery-demo-cursor"
      style={{ transform: `translate(${x}px, ${y}px) scale(${1 - clickPress * 0.14})` }}
    >
      <span />
      <i style={{ opacity: clickPress, transform: `scale(${0.5 + clickPress * 1.15})` }} />
    </div>
  );
}

function GalleryComposition() {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill className="gallery-demo-root">
      <AlbumIndex frame={frame} />
      <AlbumDetail frame={frame} />
      <PhotoStage frame={frame} />
      <AlbumTransition frame={frame} />
      <GalleryCursor />
    </AbsoluteFill>
  );
}

export function GalleryReplay({ playing }: PreviewPlaybackProps = {}) {
  const playerRef = useRef<PlayerRef | null>(null);
  const { previewRef, isVisible, isPlaying } = usePreviewInteraction({ playing });

  usePreviewPlayback({
    playerRef,
    isPlaying,
    isVisible,
    playSession: 0,
    fps: FPS,
    durationInFrames: DURATION_IN_FRAMES,
  });

  return (
    <div
      className={`gallery-remotion-shell ${isPlaying ? "is-playing" : "is-idle"}`}
      ref={previewRef}
      data-preview-active={isPlaying && isVisible}
      aria-hidden="true"
    >
      <Player
        ref={playerRef}
        className="gallery-remotion-player"
        component={GalleryComposition}
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
