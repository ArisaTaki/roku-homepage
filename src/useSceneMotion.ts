import Lenis from "lenis";
import { useEffect, useState, type RefObject } from "react";
import type { SceneLayout } from "./sceneLayout";

export const SCENE_PROGRESS_EVENT = "irop:fish-progress";

/** Move the exhibition in the scroll callback; React only tracks the current work. */
export function useSceneMotion({ sceneRef, layout, flow, enabled, workCenters, progressRef, readingAnchorRef, resizeAnchorRef }: {
  sceneRef: RefObject<HTMLElement | null>;
  layout: SceneLayout;
  flow: boolean;
  enabled: boolean;
  workCenters: readonly number[];
  progressRef: RefObject<number>;
  readingAnchorRef: RefObject<string>;
  resizeAnchorRef: RefObject<string | null>;
}) {
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !enabled) return;
    const track = scene.querySelector<HTMLElement>(".desktop-track");
    const cards = [...scene.querySelectorAll<HTMLElement>("[data-work-id]")];
    const about = flow ? scene.querySelector<HTMLElement>("#mobile-about") : scene.nextElementSibling;
    const measuredWidth = layout.viewportWidth * layout.scale;
    const measuredHeight = layout.sectionHeight - layout.scrollRange;
    let cardPositions: { id: string; top: number; bottom: number }[] = [];
    let aboutTop = Infinity;
    let range = layout.scrollRange;
    let sceneTop = scene.offsetTop;
    let lastIndex = -2;
    let frame = 0;
    const update = (scroll = window.scrollY) => {
      const canTrackReading = !resizeAnchorRef.current
        && Math.abs(window.innerWidth - measuredWidth) <= 2
        && Math.abs(window.innerHeight - measuredHeight) <= 2;
      const progress = Math.max(0, Math.min(1, (scroll - sceneTop) / Math.max(1, range)));
      if (track) {
        track.style.transform = `translate3d(${-progress * layout.travel * layout.scale}px, 0, 0) scale(${layout.scale})`;
      }
      if (progressRef.current !== progress) {
        progressRef.current = progress;
        window.dispatchEvent(new Event(SCENE_PROGRESS_EVENT));
      }
      if (!flow) {
        const center = progress * layout.travel + layout.viewportWidth / 2;
        const next = progress < 0.06 ? -1 : workCenters.reduce((nearest, value, index) => (
          Math.abs(value - center) < Math.abs(workCenters[nearest] - center) ? index : nearest
        ), 0);
        if (next !== lastIndex) { lastIndex = next; setActiveIndex(next); }
        if (canTrackReading) {
          readingAnchorRef.current = scroll + window.innerHeight / 2 >= aboutTop ? "about"
            : next < 0 ? "top" : `work-${cards[next].dataset.workId}`;
        }
      } else if (canTrackReading) {
        const center = scroll + window.innerHeight / 2;
        if (!cardPositions.length || center < cardPositions[0].top) {
          readingAnchorRef.current = "top";
        } else if (center >= aboutTop) {
          readingAnchorRef.current = "about";
        } else {
          const nearest = cardPositions.reduce((best, card) => (
            Math.abs((card.top + card.bottom) / 2 - center)
              < Math.abs((best.top + best.bottom) / 2 - center) ? card : best
          ));
          readingAnchorRef.current = nearest.id;
        }
      }
    };
    const measure = () => {
      sceneTop = scene.offsetTop;
      range = flow ? scene.offsetHeight - window.innerHeight : layout.scrollRange;
      aboutTop = about ? about.getBoundingClientRect().top + window.scrollY : Infinity;
      // Cache vertical geometry when content sizes change; scrolling only reads
      // these numbers and never measures every preview on every frame.
      if (flow) cardPositions = cards.map((card) => {
        const rect = card.getBoundingClientRect();
        return { id: `work-${card.dataset.workId}`, top: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY };
      });
      update();
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(() => { frame = 0; update(); });
    };

    // Native touch scrolling retains the OS's momentum. Desktop wheels and
    // trackpads get one gently decaying glide, including horizontal gestures.
    const lenis = flow ? null : new Lenis({
      anchors: true,
      autoRaf: true,
      lerp: 0.085,
      wheelMultiplier: 1,
      gestureOrientation: "both",
      syncTouch: false,
      overscroll: false,
      stopInertiaOnNavigate: true,
    });
    const onSmoothScroll = (instance: Lenis) => update(instance.animatedScroll);
    lenis?.on("scroll", onSmoothScroll);
    // Lenis emits its scroll updates in the same RAF as its position write.
    // Flow layouts use native scrolling and coalesce their background work.
    if (!lenis) window.addEventListener("scroll", schedule, { passive: true });
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(scene);
    if (flow) {
      cards.forEach((card) => resizeObserver.observe(card));
      if (about) resizeObserver.observe(about);
    }
    measure();
    return () => {
      lenis?.off("scroll", onSmoothScroll);
      lenis?.destroy();
      resizeObserver.disconnect();
      window.removeEventListener("scroll", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enabled, flow, layout, progressRef, readingAnchorRef, resizeAnchorRef, sceneRef, workCenters]);

  return activeIndex;
}
