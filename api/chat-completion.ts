export type ChatCompletionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionBodyOptions = {
  model: string;
  messages: ChatCompletionMessage[];
  maxTokens: number;
  defaultTemperature: number;
  temperature?: string;
  reasoningEffort?: string;
  thinking?: string;
};

function configuredTemperature(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function buildChatCompletionBody({
  model,
  messages,
  maxTokens,
  defaultTemperature,
  temperature,
  reasoningEffort,
  thinking,
}: ChatCompletionBodyOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: configuredTemperature(temperature, defaultTemperature),
    max_tokens: maxTokens,
  };

  const configuredReasoningEffort = reasoningEffort?.trim();
  if (configuredReasoningEffort) {
    body.reasoning_effort = configuredReasoningEffort;
  } else {
    const configuredThinking = thinking?.trim();
    if (configuredThinking) {
      body.thinking = { type: configuredThinking };
    }
  }

  return body;
}

export function providerNameFromEndpoint(endpoint: string): string {
  try {
    const hostname = new URL(endpoint).hostname.toLowerCase();
    if (hostname === "api.kimi.com" || hostname.endsWith(".moonshot.cn")) return "Kimi";
    if (hostname.endsWith(".deepseek.com")) return "DeepSeek";
  } catch {
    // Keep custom OpenAI-compatible endpoints provider-neutral.
  }

  return "Remote AI";
}
