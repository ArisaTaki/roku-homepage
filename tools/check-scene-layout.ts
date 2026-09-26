// Run with: npx tsx --test tools/check-scene-layout.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { getSceneLayout } from "../src/sceneLayout";

const displays = [
  [820, 1180], [1180, 820], [1024, 1366], [1366, 1024],
  [1280, 720], [1440, 900], [1920, 1080], [2560, 1440],
  [3440, 1440], [3840, 2160],
] as const;
const projects = [
  [1500, 620], [2440, 620], [3290, 540],
  [4150, 640], [5110, 594], [6030, 580],
  [6970, 620], [7910, 620], [8850, 620],
  [9790, 620], [10730, 620],
] as const;
const finalProject = projects[projects.length - 1];
const lastWork = { left: finalProject[0], width: finalProject[1] };

function near(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} should equal ${expected}`);
}

test("the opening fills its intended viewport without exposing the first project", () => {
  for (const [width, height] of displays) {
    const layout = getSceneLayout(width, height, lastWork);
    near((layout.heroOffset + 720) * layout.scale, width / 2);
    assert.ok(1440 * layout.scale <= width + 0.00001);
    assert.ok(900 * layout.scale <= height + 0.00001);
    assert.ok((1500 + layout.workOffset) * layout.scale > width);
  }
});

test("all eleven project links and the final stop stay centered after resize", () => {
  for (const [width, height] of displays) {
    const layout = getSceneLayout(width, height, lastWork);
    let previousProgress = -1;
    for (const [left, cardWidth] of projects) {
      const center = left + layout.workOffset + cardWidth / 2;
      const progress = (center - layout.viewportWidth / 2) / layout.travel;
      assert.ok(progress > previousProgress && progress <= 1);
      // The real section scroll range must produce the same track translation.
      const anchorTop = progress * layout.scrollRange;
      const actualProgress = anchorTop / (layout.sectionHeight - height);
      near((center - actualProgress * layout.travel) * layout.scale, width / 2);
      previousProgress = progress;
    }
    near(previousProgress, 1);
    near(layout.trackWidth, lastWork.left + layout.workOffset + lastWork.width);
  }
});

test("equivalent aspect ratios keep the same composition at 4K", () => {
  const normal = getSceneLayout(1920, 1080, lastWork);
  const large = getSceneLayout(3840, 2160, lastWork);
  near(large.scale, normal.scale * 2);
  near(large.viewportWidth, normal.viewportWidth);
  near(large.scrollRange, normal.scrollRange * 2);
  assert.ok(large.scale > 1, "large screens must scale up instead of keeping fixed pixel content");
});

test("transient invalid dimensions never create NaN or an empty scroll range", () => {
  for (const [width, height] of [[0, 0], [-1, 500], [NaN, Infinity]]) {
    const layout = getSceneLayout(width, height, lastWork);
    assert.ok(Object.values(layout).every(Number.isFinite));
    assert.ok(layout.scale > 0 && layout.scrollRange > 0);
  }
});
