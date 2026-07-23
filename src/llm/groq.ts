import { ChatProviderError, describeFetchFailure, requestSignal, type ChatCompletionOptions, type ChatProvider } from "./types";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
] as const;

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface GroqChatResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: { message?: string };
}

export class GroqProvider implements ChatProvider {
  readonly id = "groq";
  readonly models = GROQ_MODELS;
  private readonly apiKey: string;
  lastUsage: TokenUsage | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async complete(prompt: string, options: ChatCompletionOptions): Promise<string> {
    if (!this.models.includes(options.model as (typeof GROQ_MODELS)[number])) {
      throw new ChatProviderError(`modelo não permitido: ${options.model}`, this.id);
    }

    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await fetch(GROQ_ENDPOINT, {
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
        throw new ChatProviderError(describeFetchFailure(cause, "Groq"), this.id);
      }

      const data = (await response.json().catch(() => null)) as GroqChatResponse | null;

      if (!response.ok) {
        const detail = data?.error?.message ?? `HTTP ${response.status}`;
        if (response.status === 429 && attempt < MAX_RETRIES) {
          await sleep(retryDelayMs(response.headers.get("retry-after"), detail, attempt));
          continue;
        }
        throw new ChatProviderError(`Groq recusou a requisição: ${detail}`, this.id);
      }

      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim() === "") {
        throw new ChatProviderError("resposta do Groq sem conteúdo", this.id);
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

function retryDelayMs(retryAfter: string | null, detail: string, attempt: number): number {
  const fromHeader = retryAfter ? Number(retryAfter) : NaN;
  const fromMessage = Number(detail.match(/try again in ([\d.]+)s/i)?.[1]);
  const seconds = Number.isFinite(fromHeader) ? fromHeader : Number.isFinite(fromMessage) ? fromMessage : 2 ** attempt;
  return Math.min(30_000, Math.ceil(seconds * 1000) + 400);
}
