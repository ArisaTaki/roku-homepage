import { useEffect, useRef, useState, type RefObject } from "react";
import type { PlayerRef } from "@remotion/player";

/** Keep prepared previews mounted, but only animate while actually on screen. */
export function usePreviewVisibility() {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;

    const stage = preview.closest<HTMLElement>(".stage");
    let intersectsPreview = false;
    let intersectsStage = !stage;
    const updateVisibility = () => {
      setIsVisible(!document.hidden && intersectsPreview && intersectsStage);
    };
    const hasArea = (entry: IntersectionObserverEntry) => (
      entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0
    );
    const previewObserver = new IntersectionObserver(([entry]) => {
      intersectsPreview = hasArea(entry);
      updateVisibility();
    }, { root: stage, threshold: [0, 0.001] });
    // An explicit root handles the horizontal track's clipping, while this
    // second observer also checks whether the stage itself left the viewport.
    const stageObserver = stage ? new IntersectionObserver(([entry]) => {
      intersectsStage = hasArea(entry);
      updateVisibility();
    }, { threshold: [0, 0.001] }) : null;

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
    if (clock.session !== playSession || !isPlaying) {
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
