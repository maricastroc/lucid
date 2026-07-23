import { ChatProviderError, describeFetchFailure, requestSignal, type ChatCompletionOptions, type ChatProvider } from "./types";
import type { TokenUsage } from "./groq";

const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";

export const DEEPSEEK_MODELS = ["deepseek-v4-flash"] as const;

interface DeepSeekChatResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: { message?: string };
}

export class DeepSeekProvider implements ChatProvider {
  readonly id = "deepseek";
  readonly models = DEEPSEEK_MODELS;
  private readonly apiKey: string;
  lastUsage: TokenUsage | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async complete(prompt: string, options: ChatCompletionOptions): Promise<string> {
    if (!this.models.includes(options.model as (typeof DEEPSEEK_MODELS)[number])) {
      throw new ChatProviderError(`modelo não permitido: ${options.model}`, this.id);
    }

    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await fetch(DEEPSEEK_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
          body: JSON.stringify({
            model: options.model,
            temperature: options.temperature,
            max_tokens: options.maxTokens ?? 1024,
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }],
          }),
          signal: requestSignal(options.signal),
        });
      } catch (cause) {
        throw new ChatProviderError(describeFetchFailure(cause, "DeepSeek"), this.id);
      }

      const data = (await response.json().catch(() => null)) as DeepSeekChatResponse | null;

      if (!response.ok) {
        const detail = data?.error?.message ?? `HTTP ${response.status}`;
        if (response.status === 429 && attempt < MAX_RETRIES) {
          await sleep(retryDelayMs(response.headers.get("retry-after"), attempt));
          continue;
        }
        throw new ChatProviderError(`DeepSeek recusou a requisição: ${detail}`, this.id);
      }

      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim() === "") {
        throw new ChatProviderError("resposta do DeepSeek sem conteúdo", this.id);
      }
      this.lastUsage = {
        promptTokens: data?.usage?.prompt_tokens ?? 0,
        completionTokens: data?.usage?.completion_tokens ?? 0,
        totalTokens: data?.usage?.total_tokens ?? 0,
      };
      return content;
    }
  }
}

const MAX_RETRIES = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(retryAfter: string | null, attempt: number): number {
  const fromHeader = retryAfter ? Number(retryAfter) : NaN;
  const seconds = Number.isFinite(fromHeader) ? fromHeader : 2 ** attempt;
  return Math.min(30_000, Math.ceil(seconds * 1000) + 400);
}
