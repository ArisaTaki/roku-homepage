import { useEffect, useRef, useState, type RefObject } from "react";
import type { PlayerRef } from "@remotion/player";

export type PreviewPlaybackProps = {
  /** Omit for device-appropriate playback; an explicit value overrides it. */
  playing?: boolean;
};

/** Keep prepared previews mounted, but only animate while actually on screen. */
export function usePreviewVisibility() {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;

    const stage = preview.closest<HTMLElement>(".stage");
    let previewEntry: IntersectionObserverEntry | undefined;
    let stageEntry: IntersectionObserverEntry | undefined;
    const updateVisibility = () => {
      if (document.hidden || !previewEntry?.isIntersecting || (stage && !stageEntry?.isIntersecting)) {
        setIsVisible(false);
        return;
      }

      const area = previewEntry.intersectionRect;
      const viewport = stageEntry?.intersectionRect;
      const left = Math.max(0, area.left, viewport?.left ?? 0);
      const top = Math.max(0, area.top, viewport?.top ?? 0);
      const right = Math.min(window.innerWidth, area.right, viewport?.right ?? window.innerWidth);
      const bottom = Math.min(window.innerHeight, area.bottom, viewport?.bottom ?? window.innerHeight);
      const visibleArea = Math.max(0, right - left) * Math.max(0, bottom - top);
      // Tall tablet previews need only fill a quarter of their possible visible
      // area; a card touching the viewport edge should not start animating.
      const availableArea = Math.min(previewEntry.boundingClientRect.width, window.innerWidth)
        * Math.min(previewEntry.boundingClientRect.height, window.innerHeight);
      setIsVisible(availableArea > 0 && visibleArea >= availableArea * 0.25);
    };
    const thresholds = Array.from({ length: 21 }, (_, index) => index / 20);
    const previewObserver = new IntersectionObserver(([entry]) => {
      previewEntry = entry;
      updateVisibility();
    }, { root: stage, threshold: thresholds });
    // An explicit root handles the horizontal track's clipping, while this
    // second observer also checks whether the stage itself left the viewport.
    const stageObserver = stage ? new IntersectionObserver(([entry]) => {
      stageEntry = entry;
      updateVisibility();
    }, { threshold: thresholds }) : null;

    previewObserver.observe(preview);
    if (stage) stageObserver?.observe(stage);
    document.addEventListener("visibilitychange", updateVisibility);

    return () => {
      previewObserver.disconnect();
      stageObserver?.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  return { previewRef, isVisible };
}

/** Touch layouts play on view; hover and keyboard focus work on desktop. */
export function usePreviewInteraction({ playing }: PreviewPlaybackProps = {}) {
  const { previewRef, isVisible } = usePreviewVisibility();
  const [shouldPlay, setShouldPlay] = useState(false);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;

    const card = preview.closest<HTMLElement>("[data-work-id]") ?? preview;
    const touch = window.matchMedia("(hover: none), (pointer: coarse)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const verticalLayout = Boolean(preview.closest(".mobile-page"));
    let hovered = card.matches(":hover");
    let focused = card.contains(document.activeElement);
    const updatePlayback = () => {
      setShouldPlay(!reducedMotion.matches && (verticalLayout || touch.matches || hovered || focused));
    };
    const enter = () => { hovered = true; updatePlayback(); };
    const leave = () => { hovered = false; updatePlayback(); };
    const focus = () => { focused = true; updatePlayback(); };
    const blur = (event: FocusEvent) => {
      focused = event.relatedTarget instanceof Node && card.contains(event.relatedTarget);
      updatePlayback();
    };

    updatePlayback();
    card.addEventListener("mouseenter", enter);
    card.addEventListener("mouseleave", leave);
    card.addEventListener("focusin", focus);
    card.addEventListener("focusout", blur);
    touch.addEventListener("change", updatePlayback);
    reducedMotion.addEventListener("change", updatePlayback);

    return () => {
      card.removeEventListener("mouseenter", enter);
      card.removeEventListener("mouseleave", leave);
      card.removeEventListener("focusin", focus);
      card.removeEventListener("focusout", blur);
      touch.removeEventListener("change", updatePlayback);
      reducedMotion.removeEventListener("change", updatePlayback);
    };
  }, [previewRef]);

  return { previewRef, isVisible, isPlaying: playing ?? shouldPlay };
}

export function usePreviewPlayback({
  playerRef,
  isPlaying,
  isVisible,
  playSession,
  fps,
  durationInFrames,
}: {
  playerRef: RefObject<PlayerRef | null>;
  isPlaying: boolean;
  isVisible: boolean;
  playSession: number;
  fps: number;
  durationInFrames: number;
}) {
  const playback = useRef({ elapsedMs: 0, lastFrame: 0, session: playSession });

  useEffect(() => {
    // Visibility suspension must not seek or reset the model's current pose.
    if (!isVisible) return;

    const clock = playback.current;
    if (clock.session !== playSession) {
      clock.elapsedMs = 0;
      clock.session = playSession;
      if (clock.lastFrame !== 0) {
        playerRef.current?.seekTo(0);
        clock.lastFrame = 0;
      }
    }
    if (!isPlaying) return;

    let raf = 0;
    let previousTimestamp: number | null = null;
    const tick = (timestamp: number) => {
      if (previousTimestamp !== null) clock.elapsedMs += timestamp - previousTimestamp;
      previousTimestamp = timestamp;
      const nextFrame = Math.floor(clock.elapsedMs * fps / 1000) % durationInFrames;
      // Displays can refresh faster than the composition's 30 fps.
      if (nextFrame !== clock.lastFrame) {
        playerRef.current?.seekTo(nextFrame);
        clock.lastFrame = nextFrame;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(raf);
  }, [durationInFrames, fps, isPlaying, isVisible, playSession, playerRef]);
}
