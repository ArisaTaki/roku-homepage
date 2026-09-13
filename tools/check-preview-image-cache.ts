// Run with: node --import tsx --test tools/check-preview-image-cache.ts
import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import * as previews from "../src/lib/previewImages";

function mockImageBrowser(context: TestContext) {
  let fetchCount = 0;
  let decodeCount = 0;
  const revoked: string[] = [];
  const created: string[] = [];
  const decodes: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
  const decodeWaiters = new Map<number, () => void>();
  let started!: () => void;
  const decoding = new Promise<void>((resolve) => { started = resolve; });
  const restoreGlobal = (name: "window" | "Image", value: unknown) => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    context.after(() => {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    });
  };
  restoreGlobal("window", { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout });
  restoreGlobal("Image", class {
    decoding = "";
    src = "";
    decode() {
      decodeCount += 1;
      const pending = new Promise<void>((resolve, reject) => { decodes.push({ resolve, reject }); });
      started();
      decodeWaiters.get(decodeCount)?.();
      return pending;
    }
  });
  context.mock.method(globalThis, "fetch", async () => {
    fetchCount += 1;
    return new Response(new Uint8Array([1, 2, 3]));
  });
  context.mock.method(URL, "createObjectURL", () => {
    const url = `blob:preview-test-${created.length}`;
    created.push(url);
    return url;
  });
  context.mock.method(URL, "revokeObjectURL", (url: string) => { revoked.push(url); });
  return {
    get fetchCount() { return fetchCount; },
    get decodeCount() { return decodeCount; },
    waitForDecode(count: number) {
      if (decodeCount >= count) return Promise.resolve();
      return new Promise<void>((resolve) => { decodeWaiters.set(count, resolve); });
    },
    decodes, decoding, created, revoked,
  };
}

test("concurrent consumers share a download and publish the image only after decoding", async (context) => {
  const browser = mockImageBrowser(context);
  const src = "/test-ready.webp";
  const notifications: Array<string | undefined> = [];
  assert.equal(previews.getPreparedPreviewImage(src), undefined);
  assert.equal(previews.previewImageUrl(src), src);
  const unsubscribe = previews.subscribePreviewImage(src, () => {
    notifications.push(previews.getPreparedPreviewImage(src));
  });
  context.after(unsubscribe);
  const first = previews.preloadPreviewImage(src);
  const second = previews.preloadPreviewImage(src, "high");
  assert.strictEqual(first, second);
  await browser.decoding;
  assert.equal(browser.fetchCount, 1);
  assert.equal(browser.decodeCount, 1);
  assert.equal(previews.getPreparedPreviewImage(src), undefined);
  assert.deepEqual(notifications, []);
  browser.decodes[0].resolve();
  await Promise.all([first, second]);
  assert.equal(previews.getPreparedPreviewImage(src), browser.created[0]);
  assert.equal(previews.previewImageUrl(src), browser.created[0]);
  assert.deepEqual(notifications, [browser.created[0]]);
  await previews.preloadPreviewImage(src);
  assert.equal(browser.fetchCount, 1);
  assert.equal(browser.decodeCount, 1);
  assert.deepEqual(browser.revoked, []);
});

test("a decoding failure revokes its blob, keeps the image unpublished, and allows a shared retry", async (context) => {
  const browser = mockImageBrowser(context);
  const src = "/test-retry.webp";
  let notifications = 0;
  const unsubscribe = previews.subscribePreviewImage(src, () => { notifications += 1; });
  context.after(unsubscribe);
  const first = previews.preloadPreviewImage(src);
  const second = previews.preloadPreviewImage(src);
  const failures = Promise.allSettled([first, second]);
  await browser.decoding;
  browser.decodes[0].reject(new Error("Invalid image"));
  assert.ok((await failures).every((result) => result.status === "rejected"));
  assert.equal(browser.fetchCount, 1);
  assert.equal(previews.getPreparedPreviewImage(src), undefined);
  assert.equal(previews.previewImageUrl(src), src);
  assert.equal(notifications, 0);
  assert.deepEqual(browser.revoked, [browser.created[0]]);
  const retry = previews.preloadPreviewImage(src);
  assert.strictEqual(retry, previews.preloadPreviewImage(src));
  await browser.waitForDecode(2);
  browser.decodes[1].resolve();
  await retry;
  assert.equal(browser.fetchCount, 2);
  assert.equal(previews.getPreparedPreviewImage(src), browser.created[1]);
  assert.equal(notifications, 1);
  assert.deepEqual(browser.revoked, [browser.created[0]]);
});

test("unsubscribing is idempotent and does not remove later subscribers", async (context) => {
  const browser = mockImageBrowser(context);
  const src = "/test-unsubscribe.webp";
  let removedNotifications = 0;
  let notifications = 0;
  const firstUnsubscribe = previews.subscribePreviewImage(src, () => { removedNotifications += 1; });
  firstUnsubscribe();
  const secondUnsubscribe = previews.subscribePreviewImage(src, () => { notifications += 1; });
  context.after(secondUnsubscribe);
  firstUnsubscribe();
  const prepared = previews.preloadPreviewImage(src);
  await browser.decoding;
  browser.decodes[0].resolve();
  await prepared;
  assert.equal(removedNotifications, 0);
  assert.equal(notifications, 1);
});

test("a timeout revokes its blob and a late decode cannot replace a successful retry", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const browser = mockImageBrowser(context);
  const src = "/test-timeout.webp";
  const notifications: Array<string | undefined> = [];
  const unsubscribe = previews.subscribePreviewImage(src, () => {
    notifications.push(previews.getPreparedPreviewImage(src));
  });
  context.after(unsubscribe);
  const failed = assert.rejects(previews.preloadPreviewImage(src), /timed out/);
  await browser.decoding;
  context.mock.timers.tick(10_000);
  await failed;
  assert.equal(previews.getPreparedPreviewImage(src), undefined);
  assert.deepEqual(browser.revoked, [browser.created[0]]);
  const retry = previews.preloadPreviewImage(src);
  await browser.waitForDecode(2);
  browser.decodes[1].resolve();
  await retry;
  browser.decodes[0].resolve();
  await Promise.resolve();
  assert.equal(previews.getPreparedPreviewImage(src), browser.created[1]);
  assert.deepEqual(notifications, [browser.created[1]]);
  assert.deepEqual(browser.revoked, [browser.created[0]]);
});
