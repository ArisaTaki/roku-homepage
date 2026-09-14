const ORIGINAL_ASPECT = 1715 / 1382;
const IMAGE_OVERSCAN = 1.04;
const IMAGE_WIDTHS = [960, 1280, 1715] as const;

/** Select real source pixels; never fabricate detail beyond the official image. */
export function selectFestivalArtwork(width: number, height: number, pixelRatio: number) {
  const ratio = Number.isFinite(pixelRatio) ? Math.max(1, pixelRatio) : 1;
  const required = Math.max(width, height * ORIGINAL_ASPECT) * IMAGE_OVERSCAN * ratio;
  const pixels = IMAGE_WIDTHS.find((candidate) => candidate >= required) ?? 1715;
  return { src: `/assets/hero/kaguya-visual-${pixels}.webp`, pixels };
}

// Read the actual rendered frame so desktop scaling and tablet grid widths use
// the same resource decision as the opening, without copying CSS breakpoints.
export function currentFestivalArtwork(element: Element | null = document.querySelector(".festival-artwork")) {
  const rect = element?.getBoundingClientRect();
  return selectFestivalArtwork(rect?.width ?? 720, rect?.height ?? 740, window.devicePixelRatio || 1);
}
