import { useEffect, useRef, useState } from "react";
import { usePreviewInteraction, type PreviewPlaybackProps } from "./usePreviewVisibility";
import type { Locale } from "./i18n";
import "./TsukuyomiThemePreview.css";

/** The original theme runs in its own document so its body selectors stay isolated. */
export function TsukuyomiThemePreview({ playing, locale }: PreviewPlaybackProps & { locale: Locale }) {
  const { previewRef, isPlaying, isVisible } = usePreviewInteraction({ playing });
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0);
  const active = isPlaying && isVisible;

  const syncPlayback = () => frameRef.current?.contentWindow?.postMessage({
    type: "tsukuyomi-preview-playback", playing: active,
  }, window.location.origin);

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
      <iframe ref={frameRef} src={`/previews/tsukuyomi/index.html?embed=1&lang=${locale}`} title="Tsukuyomi theme preview"
        tabIndex={-1} onLoad={syncPlayback} style={{ transform: `scale(${scale})` }} />
      <div className="tsukuyomi-preview-caption"><span>月読 · TSUKUYOMI</span><span>OBSIDIAN / 1.0.2 ↗</span></div>
    </div>
  );
}
