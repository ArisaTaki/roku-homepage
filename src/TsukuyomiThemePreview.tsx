import { useEffect, useRef, useState } from "react";
import { usePreviewInteraction, type PreviewPlaybackProps } from "./usePreviewVisibility";
import type { Locale } from "./i18n";
import "./TsukuyomiThemePreview.css";

/** The original theme runs in its own document so its body selectors stay isolated. */
export function TsukuyomiThemePreview({ playing, locale }: PreviewPlaybackProps & { locale: Locale }) {
  const { previewRef, isPlaying, isVisible } = usePreviewInteraction({ playing });
  const desktopRef = useRef<HTMLIFrameElement>(null);
  const phoneRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0);
  const active = isPlaying && isVisible;

  const syncPlayback = () => {
    for (const frame of [desktopRef.current, phoneRef.current]) {
      frame?.contentWindow?.postMessage({
        type: "tsukuyomi-preview-playback", playing: active,
      }, window.location.origin);
    }
  };

  useEffect(() => {
    const element = previewRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / 1120));
    observer.observe(element);
    return () => observer.disconnect();
  }, [previewRef]);

  useEffect(syncPlayback, [active]);

  return (
    <div ref={previewRef} className="tsukuyomi-theme-preview" aria-hidden="true">
      <div className="tsukuyomi-preview-devices" style={{ transform: `scale(${scale})` }}>
        <span className="tsukuyomi-device-label desktop-label">{locale === "zh" ? "桌面 · 月读夜景" : locale === "ja" ? "デスクトップ · 月読の夜" : "DESKTOP · MOONLIT NIGHT"}</span>
        <iframe ref={desktopRef} className="tsukuyomi-desktop-frame"
          src={`/previews/tsukuyomi/index.html?v=1.0.4&embed=1&device=desktop&lang=${locale}`} title="Tsukuyomi desktop preview"
          tabIndex={-1} onLoad={syncPlayback} />
        <div className="tsukuyomi-phone-case">
          <iframe ref={phoneRef} src={`/previews/tsukuyomi/index.html?v=1.0.4&embed=1&device=phone&lang=${locale}`} title="Tsukuyomi phone preview"
            tabIndex={-1} onLoad={syncPlayback} />
        </div>
        <span className="tsukuyomi-device-label phone-label">{locale === "zh" ? "新增手机适配" : locale === "ja" ? "モバイル表示に対応" : "NOW ON SMALL SCREENS"}</span>
      </div>
      <div className="tsukuyomi-preview-caption"><span>月読 · TSUKUYOMI</span><span>OBSIDIAN / 1.0.4 ↗</span></div>
    </div>
  );
}
