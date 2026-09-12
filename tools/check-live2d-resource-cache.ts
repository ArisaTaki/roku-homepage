// Run with: npx tsx --test tools/check-live2d-resource-cache.ts
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { createLive2DResourceCache } from "../src/lib/live2dResourceCache";

test("prewarming and runtime consumers share an in-flight and completed binary download", async () => {
  let calls = 0;
  let finish!: (response: Response) => void;
  const response = new Promise<Response>((resolve) => { finish = resolve; });
  const cache = createLive2DResourceCache(async () => { calls += 1; return response; });
  const prewarm = cache.load("/model.moc3", "arraybuffer");
  const runtime = cache.load("/model.moc3", "arraybuffer");
  assert.equal(calls, 1);
  finish(new Response(new Uint8Array([12, 34, 56])));
  const [warmBytes, runtimeBytes] = await Promise.all([prewarm, runtime]);
  assert.strictEqual(warmBytes, runtimeBytes);
  assert.deepEqual([...new Uint8Array(runtimeBytes as ArrayBuffer)], [12, 34, 56]);
  assert.strictEqual(await cache.load("/model.moc3", "arraybuffer"), runtimeBytes);
  assert.equal(calls, 1);
});

test("JSON consumers can mutate model settings without affecting concurrent or future consumers", async () => {
  let calls = 0;
  const original = { FileReferences: { Moc: "model.moc3", Textures: ["texture.webp"] } };
  const cache = createLive2DResourceCache(async () => {
    calls += 1;
    return Response.json(original);
  });
  const [prewarm, runtime] = await Promise.all([
    cache.load("/model.model3.json", "json"),
    cache.load("/model.model3.json", "json"),
  ]) as Array<typeof original>;
  prewarm.FileReferences.Textures.push("consumer-only.webp");
  prewarm.FileReferences.Moc = "consumer-only.moc3";
  assert.deepEqual(runtime, original);
  assert.deepEqual(await cache.load("/model.model3.json", "json"), original);
  assert.equal(calls, 1);
});

test("concurrent failures are shared, and a later visit can retry the resource", async () => {
  let calls = 0;
  const cache = createLive2DResourceCache(async () => {
    calls += 1;
    return calls === 1 ? new Response("Unavailable", { status: 503 }) : Response.json({ ready: true });
  });
  const attempts = await Promise.allSettled([
    cache.load("/model.json", "json"),
    cache.load("/model.json", "json"),
  ]);
  assert.equal(calls, 1);
  assert.ok(attempts.every((result) => result.status === "rejected"));
  assert.deepEqual(await cache.load("/model.json", "json"), { ready: true });
  assert.equal(calls, 2);
});

test("a timed-out download aborts and does not prevent a subsequent retry", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0;
  let firstSignal: AbortSignal | undefined;
  const cache = createLive2DResourceCache(async (_url, options) => {
    calls += 1;
    if (calls > 1) return Response.json({ recovered: true });
    firstSignal = options?.signal ?? undefined;
    return new Promise<Response>((_resolve, reject) => {
      firstSignal?.addEventListener("abort", () => reject(firstSignal?.reason), { once: true });
    });
  });
  const rejected = assert.rejects(cache.load("/slow-model.json", "json"), { name: "AbortError" });
  context.mock.timers.tick(45_000);
  await rejected;
  assert.equal(firstSignal?.aborted, true);
  assert.deepEqual(await cache.load("/slow-model.json", "json"), { recovered: true });
  assert.equal(calls, 2);
});

test("no-store HTTP responses are reused by the page cache without another network request", async (context) => {
  let requests = 0;
  const server = createServer((_request, response) => {
    requests += 1;
    response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end('{"Version":3}');
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/settings.json`;
  const cache = createLive2DResourceCache();
  assert.deepEqual(await cache.load(url, "json"), { Version: 3 });
  assert.deepEqual(await cache.load(url, "json"), { Version: 3 });
  const bytes = await cache.load(url, "arraybuffer") as ArrayBuffer;
  assert.equal(new TextDecoder().decode(bytes), '{"Version":3}');
  assert.equal(requests, 1);
});
