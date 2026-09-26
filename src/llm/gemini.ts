import {
  ChatProviderError,
  describeFetchFailure,
  redactSecrets,
  requestSignal,
  type ChatCompletionOptions,
  type ChatProvider,
  type ChatProviderErrorKind,
} from "./types";
import type { TokenUsage } from "./types";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const GEMINI_MODELS = ["gemini-2.5-flash"] as const;

export const GEMINI_CANDIDATE_MODELS = ["gemini-3.8-flash"] as const;

export type GeminiThinkingLevel = "low" | "medium" | "high";

export interface GeminiProviderOptions {
  readonly thinkingLevel?: GeminiThinkingLevel;
}

export interface GeminiProfile {
  readonly model: string;
  readonly stage: "production" | "candidate";
  readonly body: (
    options: ChatCompletionOptions,
    thinkingLevel: GeminiThinkingLevel | null,
  ) => Record<string, unknown> | null;
}

export const GEMINI_PROFILES: readonly GeminiProfile[] = [
  {
    model: "gemini-2.5-flash",
    stage: "production",
    body: (options) => ({
      temperature: options.temperature,
      maxOutputTokens: options.maxTokens ?? 2048,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    }),
  },
  {
    model: "gemini-3.8-flash",
    stage: "candidate",
    body: (options, thinkingLevel) =>
      thinkingLevel === null
        ? null
        : {
            maxOutputTokens: options.maxTokens ?? 2048,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingLevel },
          },
  },
];

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  error?: { message?: string; status?: string };
}

export function classifyGeminiError(
  httpStatus: number,
  apiStatus: string | undefined,
  message: string,
): ChatProviderErrorKind {
  if (
    httpStatus === 401 ||
    httpStatus === 403 ||
    apiStatus === "UNAUTHENTICATED" ||
    apiStatus === "PERMISSION_DENIED"
  ) {
    return "authentication";
  }
  if (/api key/iu.test(message)) return "authentication";
  if (httpStatus === 404 || apiStatus === "NOT_FOUND") return "model_unavailable";
  if (httpStatus === 429 || apiStatus === "RESOURCE_EXHAUSTED") {
    return /per[ _]?day|daily/iu.test(message) ? "quota" : "rate_limit";
  }
  if (httpStatus >= 500) return "server";
  return "invalid_request";
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

  requestConfig(options: ChatCompletionOptions): Record<string, unknown> | null {
    const profile = GEMINI_PROFILES.find((p) => p.model === options.model);
    return profile === undefined ? null : profile.body(options, this.thinkingLevel);
  }

  private fail(message: string, kind: ChatProviderErrorKind): ChatProviderError {
    return new ChatProviderError(redactSecrets(message, [this.apiKey]), this.id, kind);
  }

  async complete(prompt: string, options: ChatCompletionOptions): Promise<string> {
    const generationConfig = this.requestConfig(options);
    if (generationConfig === null) {
      throw this.fail(`modelo não permitido: ${options.model}`, "invalid_request");
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
        throw this.fail(describeFetchFailure(cause, "Gemini"), "network");
      }

      const data = (await response.json().catch(() => null)) as GeminiResponse | null;

      if (!response.ok) {
        const detail = data?.error?.message ?? `HTTP ${response.status}`;
        const kind = classifyGeminiError(response.status, data?.error?.status, JSON.stringify(data?.error ?? detail));
        if (kind === "rate_limit" && attempt < MAX_RETRIES) {
          await sleep(retryDelayMs(attempt));
          continue;
        }
        throw this.fail(`Gemini recusou a requisição: ${detail}`, kind);
      }

      const candidate = data?.candidates?.[0];
      if (candidate?.finishReason !== undefined && candidate.finishReason !== "STOP") {
        throw this.fail(`o Gemini interrompeu a resposta antes do fim (${candidate.finishReason})`, "incomplete");
      }
      const content = candidate?.content?.parts?.[0]?.text;
      if (typeof content !== "string" || content.trim() === "") {
        throw this.fail("o Gemini respondeu sem conteúdo", "empty");
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
