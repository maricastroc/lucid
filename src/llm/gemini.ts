import {
  ChatProviderError,
  describeFetchFailure,
  requestSignal,
  type ChatCompletionOptions,
  type ChatProvider,
} from "./types";
import type { TokenUsage } from "./types";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const GEMINI_MODELS = ["gemini-2.5-flash"] as const;

export const GEMINI_CANDIDATE_MODELS = ["gemini-3.8-flash"] as const;

export type GeminiThinkingLevel = "low" | "medium" | "high";

export interface GeminiProviderOptions {
  readonly thinkingLevel?: GeminiThinkingLevel;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  error?: { message?: string };
}

export class GeminiProvider implements ChatProvider {
  readonly id = "gemini";
  readonly models = GEMINI_MODELS;
  private readonly apiKey: string;
  private readonly thinkingLevel: GeminiThinkingLevel | null;
  lastUsage: TokenUsage | null = null;

  constructor(apiKey: string, options: GeminiProviderOptions = {}) {
    this.apiKey = apiKey;
    this.thinkingLevel = options.thinkingLevel ?? null;
  }

  private generationConfig(options: ChatCompletionOptions): Record<string, unknown> | null {
    if (this.models.includes(options.model as (typeof GEMINI_MODELS)[number])) {
      return {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens ?? 2048,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      };
    }
    if (
      this.thinkingLevel !== null &&
      GEMINI_CANDIDATE_MODELS.includes(options.model as (typeof GEMINI_CANDIDATE_MODELS)[number])
    ) {
      return {
        maxOutputTokens: options.maxTokens ?? 2048,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: this.thinkingLevel },
      };
    }
    return null;
  }

  async complete(prompt: string, options: ChatCompletionOptions): Promise<string> {
    const generationConfig = this.generationConfig(options);
    if (generationConfig === null) {
      throw new ChatProviderError(`modelo não permitido: ${options.model}`, this.id);
    }

    const endpoint = `${GEMINI_BASE}/${options.model}:generateContent`;

    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
          }),
          signal: requestSignal(options.signal),
        });
      } catch (cause) {
        throw new ChatProviderError(describeFetchFailure(cause, "Gemini"), this.id);
      }

      const data = (await response.json().catch(() => null)) as GeminiResponse | null;

      if (!response.ok) {
        const detail = data?.error?.message ?? `HTTP ${response.status}`;
        if (response.status === 429 && attempt < MAX_RETRIES) {
          await sleep(retryDelayMs(attempt));
          continue;
        }
        throw new ChatProviderError(`Gemini recusou a requisição: ${detail}`, this.id);
      }

      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof content !== "string" || content.trim() === "") {
        throw new ChatProviderError("o Gemini respondeu sem conteúdo", this.id);
      }
      this.lastUsage = {
        promptTokens: data?.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: data?.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: data?.usageMetadata?.totalTokenCount ?? 0,
      };
      return content;
    }
  }
}

const MAX_RETRIES = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number): number {
  return Math.min(30_000, 2 ** attempt * 1000 + 400);
}
