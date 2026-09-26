export const FLOW_LAYOUT_QUERY = "(max-width: 1100px), (pointer: coarse) and (max-width: 1400px), (max-width: 1400px) and (orientation: portrait)";
export const PHONE_NAV_QUERY = "(max-width: 699px), (pointer: coarse) and (max-width: 1000px) and (max-height: 500px)";

const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 900;

/** One coordinate system for the scaled scene, scroll range and project anchors. */
export function getSceneLayout(width: number, height: number, lastWork: { left: number; width: number }) {
  const safeWidth = Number.isFinite(width) ? Math.max(1, width) : DESIGN_WIDTH;
  const safeHeight = Number.isFinite(height) ? Math.max(1, height) : DESIGN_HEIGHT;
  const scale = Math.min(safeWidth / DESIGN_WIDTH, safeHeight / DESIGN_HEIGHT);
  const viewportWidth = safeWidth / scale;
  const workOffset = viewportWidth - DESIGN_WIDTH;
  const heroOffset = workOffset / 2;
  const travel = lastWork.left + workOffset + lastWork.width / 2 - viewportWidth / 2;
  const scrollRange = travel * scale * 2;

  return {
    scale,
    viewportWidth,
    heroOffset,
    workOffset,
    travel,
    scrollRange,
    sectionHeight: safeHeight + scrollRange,
    trackWidth: Math.max(lastWork.left + workOffset + lastWork.width, viewportWidth),
  };
}

export type SceneLayout = ReturnType<typeof getSceneLayout>;
