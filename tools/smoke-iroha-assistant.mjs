import http from "node:http";
import handler from "../api/iroha-assistant.js";
import { askIroha } from "../src/lib/iropAssistantClient.js";

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
}

async function postJson(url, payload) {
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const apiServer = http.createServer((req, res) => handler(req, res));
await listen(apiServer);
const apiUrl = `http://127.0.0.1:${apiServer.address().port}/api/iroha-assistant`;

const local = await askIroha("Hermes-Yachiyo?");
assert(local.runtimeLabel === "LOCAL KB", "local client should use LOCAL KB without endpoint");
assert(local.source === "Hermes-Yachiyo", "local client should match Hermes-Yachiyo");

const serverLocal = await postJson(apiUrl, { question: "怎么联系 irop?" });
assert(serverLocal.status === 200, "server-local response should be 200");
assert(serverLocal.body.runtimeLabel === "SERVER KB", "server-local response should use SERVER KB");
assert(serverLocal.body.source === "Contact", "server-local response should match Contact");

const clientServer = await askIroha("shader demo", { endpoint: apiUrl });
assert(clientServer.runtimeLabel === "SERVER KB", "client should preserve SERVER KB label from server");
assert(clientServer.source === "shader.irop.one", "client-server response should match shader");

const modelServer = http.createServer((req, res) => {
  req.resume();
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    choices: [
      {
        message: {
          content: "Model-side answer about irop.",
        },
      },
    ],
  }));
});
await listen(modelServer);

process.env.AI_CHAT_COMPLETIONS_ENDPOINT = `http://127.0.0.1:${modelServer.address().port}/v1/chat/completions`;
process.env.AI_MODEL = "test-model";
process.env.AI_API_KEY = "test-key";

const serverModel = await postJson(apiUrl, { question: "自然语言 Live2D?" });
assert(serverModel.status === 200, "server-model response should be 200");
assert(serverModel.body.runtimeLabel === "REMOTE AI", "server-model response should use REMOTE AI");
assert(serverModel.body.text === "Model-side answer about irop.", "server-model text should come from model endpoint");

apiServer.close();
modelServer.close();

console.log("Iroha assistant smoke test passed.");
