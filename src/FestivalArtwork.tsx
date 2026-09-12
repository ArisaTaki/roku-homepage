import { useEffect, useState } from "react";
import type { UiCopy } from "./i18n";
import { preloadPreviewImage, previewImageUrl } from "./lib/previewImages";

const FESTIVAL_VISUAL = "/assets/gallery-new/kaguya-visual-02.webp";

export function FestivalArtwork({
  className = "",
  copy,
}: {
  className?: string;
  copy: UiCopy["hero"];
}) {
  const [imageUrl, setImageUrl] = useState<string>();
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    void preloadPreviewImage(FESTIVAL_VISUAL, "high").then(() => {
      if (active) setImageUrl(previewImageUrl(FESTIVAL_VISUAL));
    }).catch(() => {
      if (active) setUnavailable(true);
    });
    return () => { active = false; };
  }, []);

  const stateClass = imageUrl ? "is-ready" : unavailable ? "is-unavailable" : "";

  return (
    <figure className={`festival-artwork ${className} ${stateClass}`} aria-label={copy.caption}>
      <div className="festival-portal">
        <div className="festival-portal-fallback" aria-hidden="true"><i /><i /><i /></div>
        {imageUrl && <img className="festival-keyvisual" src={imageUrl} alt="" decoding="async" />}
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
