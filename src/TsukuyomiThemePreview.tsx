import { useCallback, useEffect, useRef, useState } from "react";
import { usePreviewInteraction, type PreviewPlaybackProps } from "./usePreviewVisibility";
import type { Locale } from "./i18n";
import "./TsukuyomiThemePreview.css";
import manifest from "./data/tsukuyomi-release.json";

/** The original theme runs in its own document so its body selectors stay isolated. */
export function TsukuyomiThemePreview({ playing, locale }: PreviewPlaybackProps & { locale: Locale }) {
  const { previewRef, isPlaying, isVisible } = usePreviewInteraction({ playing });
  const desktopRef = useRef<HTMLIFrameElement>(null);
  const phoneRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0);
  const active = isPlaying && isVisible;

  const syncPlayback = useCallback(() => {
    for (const frame of [desktopRef.current, phoneRef.current]) {
      frame?.contentWindow?.postMessage({
        type: "tsukuyomi-preview-playback", playing: active,
      }, window.location.origin);
    }
  }, [active]);

  useEffect(() => {
    const element = previewRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / 1120));
    observer.observe(element);
    return () => observer.disconnect();
  }, [previewRef]);

  useEffect(syncPlayback, [syncPlayback]);
  useEffect(() => {
    const ready = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "tsukuyomi-preview-ready") return;
      if ([desktopRef.current?.contentWindow, phoneRef.current?.contentWindow].includes(event.source as Window)) syncPlayback();
    };
    window.addEventListener("message", ready);
    return () => window.removeEventListener("message", ready);
  }, [syncPlayback]);

  return (
    <div ref={previewRef} className="tsukuyomi-theme-preview" aria-hidden="true">
      <div className="tsukuyomi-preview-devices" style={{ transform: `scale(${scale})` }}>
        <span className="tsukuyomi-device-label desktop-label">{locale === "zh" ? "桌面 · 月读夜景" : locale === "ja" ? "デスクトップ · 月読の夜" : "DESKTOP · MOONLIT NIGHT"}</span>
        <iframe ref={desktopRef} className="tsukuyomi-desktop-frame"
          src={`/previews/tsukuyomi/index.html?v=${manifest.version}&embed=1&demo=1&device=desktop&lang=${locale}`} title="Tsukuyomi desktop preview"
          tabIndex={-1} onLoad={syncPlayback} />
        <div className="tsukuyomi-phone-case">
          <iframe ref={phoneRef} src={`/previews/tsukuyomi/index.html?v=${manifest.version}&embed=1&demo=1&device=phone&lang=${locale}`} title="Tsukuyomi phone preview"
            tabIndex={-1} onLoad={syncPlayback} />
        </div>
        <span className="tsukuyomi-device-label phone-label">{locale === "zh" ? "手机 · 场景与阅读" : locale === "ja" ? "モバイル · 風景と読書" : "PHONE · SCENE & READING"}</span>
      </div>
      <div className="tsukuyomi-preview-caption"><span>月読 · TSUKUYOMI</span><span>OBSIDIAN / {manifest.version} ↗</span></div>
    </div>
  );
}
