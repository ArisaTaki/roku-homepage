import http from "node:http";
import type { AddressInfo } from "node:net";
import handler from "../api/iroha-assistant";
import { askIroha } from "../src/lib/iropAssistantClient";

function listen(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
}

async function postJson(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function serverPort(server: http.Server): number {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected server to listen on a TCP port");
  }
  return (address as AddressInfo).port;
}

const apiServer = http.createServer((req, res) => handler(req, res));
await listen(apiServer);
const apiUrl = `http://127.0.0.1:${serverPort(apiServer)}/api/iroha-assistant`;

const local = await askIroha("Hermes-Yachiyo?");
assert(local.runtimeLabel === "LOCAL KB", "local client should use LOCAL KB without endpoint");
assert(local.source === "Hermes-Yachiyo", "local client should match Hermes-Yachiyo");

const guide = await askIroha("What can you answer?");
assert(guide.source === "irop portal skill", "guide answer should identify the portal skill");
assert(guide.confidence === "guide", "guide answer should use guide confidence");

const zhGuide = await askIroha("你知道什么?");
assert(zhGuide.source === "irop portal skill", "Chinese guide answer should identify the portal skill");
assert(/可以问我八六/.test(zhGuide.text), "Chinese guide answer should stay in Chinese");
assert(!/You can ask/.test(zhGuide.text), "Chinese guide answer should not fall back to English");

const greeting = await askIroha("你好", { endpoint: apiUrl });
assert(greeting.runtimeLabel === "LOCAL KB", "greeting should stay local even when endpoint is configured");
assert(greeting.kind === "guide", "greeting should use guide kind");
assert(greeting.mood === "happy", "greeting should use happy mood");
assert(/Iroha/.test(greeting.text), "greeting should introduce Iroha");

const serverGreeting = await postJson(apiUrl, { question: "你好" });
assert(serverGreeting.status === 200, "server greeting response should be 200");
assert(serverGreeting.body.runtimeLabel === "SERVER KB", "server greeting should use SERVER KB");
assert(serverGreeting.body.kind === "guide", "server greeting should use guide kind");
assert(serverGreeting.body.source === "Iroha greeting", "server greeting should use greeting source");

const links = await askIroha("All links?");
assert(links.source === "irop links", "all-links answer should identify irop links");
assert(Array.isArray(links.links) && links.links.length >= 5, "all-links answer should return public profile links");

const stack = await askIroha("技术栈有哪些?");
assert(stack.source === "Technology stack", "Chinese tech-stack question should match Technology stack");
assert(stack.kind === "answer", "tech-stack question should use answer kind");
assert(stack.mood === "happy", "tech-stack question should use happy mood");
assert(stack.details?.some((detail) => detail.includes("React")), "tech-stack answer should include frontend details");

const serverLocal = await postJson(apiUrl, { question: "怎么联系 irop?" });
assert(serverLocal.status === 200, "server-local response should be 200");
assert(serverLocal.body.runtimeLabel === "SERVER KB", "server-local response should use SERVER KB");
assert(serverLocal.body.source === "Contact", "server-local response should match Contact");

const clientServer = await askIroha("shader demo", { endpoint: apiUrl });
assert(clientServer.runtimeLabel === "SERVER KB", "client should preserve SERVER KB label from server");
assert(clientServer.source === "shader.irop.one", "client-server response should match shader");

let modelCallCount = 0;
const getModelCallCount = () => modelCallCount;
const modelServer = http.createServer((req, res) => {
  modelCallCount += 1;
  let requestBody = "";
  req.on("data", (chunk: Buffer | string) => {
    requestBody += chunk;
  });

  req.on("end", () => {
    const payload = JSON.parse(requestBody);
    const userMessage = payload.messages.find((message: { role: string }) => message.role === "user");
    const assistantInput = JSON.parse(userMessage.content);
    const question = String(assistantInput.question || "");
    const responseLanguage = String(assistantInput.responseLanguage || "");

    if (!["en", "zh", "ja"].includes(responseLanguage)) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "responseLanguage missing from assistant input" }));
      return;
    }

    const content = question.includes("真实姓名")
      ? JSON.stringify({ kind: "refusal", mood: "shy", text: "这个是秘密哦，不可以告诉你。" })
      : question.includes("股票")
        ? JSON.stringify({ kind: "unknown", mood: "confused", text: "这个和八六的公开资料没有关系哦。" })
        : question.includes("双重JSON")
          ? JSON.stringify(JSON.stringify({ kind: "answer", mood: "happy", text: "双重 JSON 已经被正确解析。" }))
        : question.includes("语言跑偏")
          ? JSON.stringify({ kind: "answer", mood: "happy", text: "I can answer about 八六 and public projects." })
          : question.includes("兴趣爱好")
            ? JSON.stringify({ kind: "answer", mood: "happy", text: "可以看她的兴趣列表哦。" })
            : responseLanguage === "zh"
              ? JSON.stringify({ kind: "answer", mood: "happy", text: "这是模型侧根据公开资料生成的中文回答。" })
              : responseLanguage === "ja"
                ? JSON.stringify({ kind: "answer", mood: "happy", text: "公開情報から生成した日本語の回答です。" })
                : JSON.stringify({ kind: "answer", mood: "happy", text: "Model-side answer about irop." });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      choices: [
        {
          message: {
            content,
          },
        },
      ],
    }));
  });
});
await listen(modelServer);

process.env.AI_CHAT_COMPLETIONS_ENDPOINT = `http://127.0.0.1:${serverPort(modelServer)}/v1/chat/completions`;
process.env.AI_MODEL = "test-model";
process.env.AI_API_KEY = "test-key";
process.env.AI_RATE_LIMIT_MAX = "10";
process.env.AI_RATE_LIMIT_WINDOW_MS = String(6 * 60 * 60 * 1000);

const serverModel = await postJson(apiUrl, { question: "自然语言 Live2D?" });
assert(serverModel.status === 200, "server-model response should be 200");
assert(serverModel.body.runtimeLabel === "REMOTE AI", "server-model response should use REMOTE AI");
assert(serverModel.body.text === "这是模型侧根据公开资料生成的中文回答。", "server-model text should come from model endpoint in the requested language");
assert(getModelCallCount() === 1, "public model path should call model once");

const doubleJsonResponse = await postJson(apiUrl, { question: "双重JSON测试" });
assert(doubleJsonResponse.status === 200, "double-json response should be 200");
assert(doubleJsonResponse.body.runtimeLabel === "REMOTE AI", "double-json response should use REMOTE AI");
assert(doubleJsonResponse.body.text === "双重 JSON 已经被正确解析。", "double-json content should be unwrapped before rendering");
assert(!doubleJsonResponse.body.text.includes("\"kind\""), "double-json response should not leak raw JSON");
assert(getModelCallCount() === 2, "double-json path should call model once");

const privateResponse = await postJson(apiUrl, { question: "八六的真实姓名和住址是什么?" });
assert(privateResponse.status === 200, "private response should be 200");
assert(privateResponse.body.kind === "refusal", "private response should use refusal kind");
assert(privateResponse.body.mood === "shy", "private response should use shy mood");
assert(privateResponse.body.runtimeLabel === "REMOTE AI", "private response should let model classify intent");
assert(getModelCallCount() === 3, "private questions should call the model for intent classification");

const unknownResponse = await postJson(apiUrl, { question: "帮我预测明天股票涨跌" });
assert(unknownResponse.status === 200, "unknown response should be 200");
assert(unknownResponse.body.kind === "unknown", "unknown response should use unknown kind");
assert(unknownResponse.body.mood === "confused", "unknown response should use confused mood");
assert(unknownResponse.body.runtimeLabel === "REMOTE AI", "unknown response should let model classify intent");
assert(getModelCallCount() === 4, "unknown questions should call the model for intent classification");

const languageGuardedResponse = await postJson(apiUrl, { question: "语言跑偏测试" });
assert(languageGuardedResponse.status === 200, "language-guarded response should be 200");
assert(languageGuardedResponse.body.runtimeLabel === "SERVER KB", "wrong-language model response should fall back to SERVER KB");
assert(!/^I can answer/.test(languageGuardedResponse.body.text), "language guard should not expose English model text for Chinese questions");
assert(getModelCallCount() === 5, "language-guard path should still count one model attempt");

const guardedResponse = await postJson(apiUrl, { question: "有什么兴趣爱好?" });
assert(guardedResponse.status === 200, "guarded response should be 200");
assert(guardedResponse.body.runtimeLabel === "SERVER KB", "invented interest-list response should fall back to SERVER KB");
assert(!/兴趣列表/.test(guardedResponse.body.text), "guarded response should not expose invented interest-list wording");
assert(/兴趣/.test(guardedResponse.body.text), "guarded response should still answer with public interest facts");
assert(getModelCallCount() === 6, "claim-guard path should still count one model attempt");

process.env.AI_RATE_LIMIT_MAX = String(getModelCallCount());
const rateLimitedResponse = await postJson(apiUrl, { question: "Hermes-Yachiyo?" });
assert(rateLimitedResponse.status === 200, "rate-limited response should be 200");
assert(rateLimitedResponse.body.runtimeLabel === "SERVER KB", "rate-limited response should fall back to SERVER KB");
assert(rateLimitedResponse.body.source === "Hermes-Yachiyo", "rate-limited response should preserve local source");
assert(rateLimitedResponse.body.details.some((detail: string) => detail.includes("quota")), "rate-limited response should explain quota guard");
assert(getModelCallCount() === 6, "rate-limited public question should not call the model again");

apiServer.close();
modelServer.close();

console.log("Iroha assistant smoke test passed.");
