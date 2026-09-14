// Run with: node --import tsx --test tools/check-festival-artwork-source.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { selectFestivalArtwork } from "../src/festivalArtworkSource";

test("small screens request the smaller file while dense phone displays retain detail", () => {
  assert.equal(selectFestivalArtwork(344, 319, 1).pixels, 960);
  assert.equal(selectFestivalArtwork(344, 319, 3).pixels, 1280);
});

test("portrait cropping accounts for the image height rather than only frame width", () => {
  assert.equal(selectFestivalArtwork(720, 800, 1).pixels, 1280);
  assert.equal(selectFestivalArtwork(720, 740, 2).pixels, 1715);
});

test("large displays use the real original resolution without inventing larger files", () => {
  assert.equal(selectFestivalArtwork(1728, 1776, 1).pixels, 1715);
  assert.equal(selectFestivalArtwork(1728, 1776, 3).src, "/assets/hero/kaguya-visual-1715.webp");
});
