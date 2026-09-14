import { useEffect, useRef, useState } from "react";
import type { UiCopy } from "./i18n";
import { preloadPreviewImage, previewImageUrl } from "./lib/previewImages";
import { currentFestivalArtwork } from "./festivalArtworkSource";

export function FestivalArtwork({
  className = "",
  copy,
  resolutionScale = 1,
}: {
  className?: string;
  copy: UiCopy["hero"];
  resolutionScale?: number;
}) {
  const figureRef = useRef<HTMLElement | null>(null);
  const displayedPixels = useRef(0);
  const [image, setImage] = useState<{ url: string; src: string }>();
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    const requested = new Set<string>();
    const prepare = () => {
      const { src, pixels } = currentFestivalArtwork(figureRef.current);
      if (pixels <= displayedPixels.current || requested.has(src)) return;
      requested.add(src);
      void preloadPreviewImage(src, "high").then(() => {
        // Retain the decoded image while a larger window requests more detail.
        if (!active || pixels < displayedPixels.current) return;
        displayedPixels.current = pixels;
        setImage({ url: previewImageUrl(src), src });
        setUnavailable(false);
      }).catch(() => {
        requested.delete(src);
        if (active && !displayedPixels.current) setUnavailable(true);
      });
    };
    prepare();
    const observer = new ResizeObserver(prepare);
    if (figureRef.current) observer.observe(figureRef.current);
    // Desktop artwork scales with its stage while its own CSS box stays 720px.
    const stage = figureRef.current?.closest(".stage");
    if (stage) observer.observe(stage);
    // Moving a window to another display can change DPR without its CSS width.
    window.addEventListener("resize", prepare);
    return () => {
      active = false;
      observer.disconnect();
      window.removeEventListener("resize", prepare);
    };
  // Transform-only desktop scaling does not change ResizeObserver's CSS box.
  }, [resolutionScale]);

  const stateClass = image ? "is-ready" : unavailable ? "is-unavailable" : "";

  return (
    <figure ref={figureRef} className={`festival-artwork ${className} ${stateClass}`} aria-label={copy.caption}>
      <div className="festival-portal">
        <div className="festival-portal-fallback" aria-hidden="true"><i /><i /><i /></div>
        {image && <img className="festival-keyvisual" src={image.url} data-source={image.src} alt="" decoding="async" />}
        <div className="festival-portal-shade" aria-hidden="true" />
      </div>
      <div className="festival-orbit" aria-hidden="true" />
      <figcaption className="festival-art-credit">
        <span>VISUAL INSPIRATION</span>
        <a href="https://www.cho-kaguyahime.com/" target="_blank" rel="noreferrer">超かぐや姫！</a>
      </figcaption>
    </figure>
  );
}
