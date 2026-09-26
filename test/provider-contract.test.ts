import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHAT_PROVIDER_ERROR_KINDS,
  ChatProviderError,
  GEMINI_CANDIDATE_MODELS,
  GEMINI_MODELS,
  GEMINI_PROFILES,
  GeminiProvider,
  redactSecrets,
} from "../src/llm";

interface RecordedAttempt {
  readonly status: number;
  readonly finishReason: string | null;
  readonly apiError: { code: number; status: string; message: string } | null;
}

interface RecordedCall {
  readonly model: string;
  readonly generationConfig: { thinkingConfig?: Record<string, unknown> };
  readonly attempts: readonly RecordedAttempt[];
  readonly finishReason: string | null;
  readonly raw: string | null;
}

function recorded(file: string): RecordedCall[] {
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as RecordedCall);
}

const FREE_TIER = recorded("eval/baseline-gemini-2.5-flash/tentativa-chave-free-tier/calls.jsonl");
const SPIKE = recorded("eval/comparacao-gemini-3.8/spike/calls.jsonl");

const byLevel = (level: string) => SPIKE.find((c) => c.generationConfig.thinkingConfig?.thinkingLevel === level);

function replay(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () => ({ ok: status < 400, status, json: async () => body }) as unknown as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function failure(provider: GeminiProvider, model: string): Promise<ChatProviderError> {
  const error = await provider.complete("prompt", { model, temperature: 0 }).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ChatProviderError);
  return error as ChatProviderError;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("provider contract — recorded responses become typed failures (ADR-114)", () => {
  it("the 404 for a model no longer offered to new keys is model_unavailable", async () => {
    const attempt = FREE_TIER[0].attempts[0];
    expect(attempt.status).toBe(404);
    replay(404, { error: attempt.apiError });

    const error = await failure(new GeminiProvider("fake-key"), "gemini-2.5-flash");
    expect(error.kind).toBe("model_unavailable");
    expect(error.message).toContain("no longer available to new users");
  });

  it("the 400 for an unsupported thinking level is invalid_request", async () => {
    const attempt = byLevel("minimal")!.attempts[0];
    replay(400, { error: attempt.apiError });

    const error = await failure(new GeminiProvider("fake-key", { thinkingLevel: "low" }), "gemini-3.8-flash");
    expect(error.kind).toBe("invalid_request");
  });

  it("the 400 for a thinking budget sent with a thinking level is invalid_request", async () => {
    const call = SPIKE.find(
      (c) =>
        c.generationConfig.thinkingConfig &&
        "thinkingBudget" in c.generationConfig.thinkingConfig &&
        "thinkingLevel" in c.generationConfig.thinkingConfig,
    )!;
    replay(400, { error: call.attempts[0].apiError });

    const error = await failure(new GeminiProvider("fake-key", { thinkingLevel: "low" }), "gemini-3.8-flash");
    expect(error.kind).toBe("invalid_request");
  });

  it("the JSON cut by MAX_TOKENS is incomplete, never a proposal", async () => {
    const call = SPIKE.find((c) => c.finishReason === "MAX_TOKENS")!;
    expect(call.raw).not.toBeNull();
    replay(200, { candidates: [{ content: { parts: [{ text: call.raw }] }, finishReason: "MAX_TOKENS" }] });

    const error = await failure(new GeminiProvider("fake-key", { thinkingLevel: "medium" }), "gemini-3.8-flash");
    expect(error.kind).toBe("incomplete");
    expect(error.message).toBe("o Gemini interrompeu a resposta antes do fim (MAX_TOKENS)");
  });

  it("a recorded answer that stopped normally is returned as is", async () => {
    const call = SPIKE.find((c) => c.finishReason === "STOP" && c.raw !== null && c.raw.includes("reescrita"))!;
    replay(200, { candidates: [{ content: { parts: [{ text: call.raw }] }, finishReason: "STOP" }] });

    const text = await new GeminiProvider("fake-key", { thinkingLevel: "low" }).complete("prompt", {
      model: "gemini-3.8-flash",
      temperature: 0,
    });
    expect(text).toBe(call.raw);
  });
});

describe("provider contract — the other failures a key can meet", () => {
  it("an invalid key is authentication", async () => {
    replay(400, {
      error: { code: 400, status: "INVALID_ARGUMENT", message: "API key not valid. Please pass a valid API key." },
    });
    expect((await failure(new GeminiProvider("fake-key"), "gemini-2.5-flash")).kind).toBe("authentication");
  });

  it("a daily quota is quota and is not retried", async () => {
    const fetchMock = replay(429, {
      error: {
        code: 429,
        status: "RESOURCE_EXHAUSTED",
        message: "Quota exceeded for metric generate_content_requests_per_day",
      },
    });
    expect((await failure(new GeminiProvider("fake-key"), "gemini-2.5-flash")).kind).toBe("quota");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("a daily quota named only in the error details is still quota", async () => {
    const fetchMock = replay(429, {
      error: {
        code: 429,
        status: "RESOURCE_EXHAUSTED",
        message: "You exceeded your current quota.",
        details: [{ violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }] }],
      },
    });
    expect((await failure(new GeminiProvider("fake-key"), "gemini-2.5-flash")).kind).toBe("quota");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("a per-minute limit is rate_limit and is retried before failing", async () => {
    vi.useFakeTimers();
    const fetchMock = replay(429, {
      error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for requests per minute" },
    });
    const pending = new GeminiProvider("fake-key").complete("prompt", { model: "gemini-2.5-flash", temperature: 0 });
    const settled = pending.catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    const error = (await settled) as ChatProviderError;
    expect(error.kind).toBe("rate_limit");
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("a network failure is network", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("fetch failed"))),
    );
    expect((await failure(new GeminiProvider("fake-key"), "gemini-2.5-flash")).kind).toBe("network");
  });

  it("an answer with no text is empty", async () => {
    replay(200, { candidates: [{ content: { parts: [{ text: "  " }] }, finishReason: "STOP" }] });
    expect((await failure(new GeminiProvider("fake-key"), "gemini-2.5-flash")).kind).toBe("empty");
  });

  it("the key never reaches an error message", async () => {
    const key = `AIza${"x".repeat(35)}`;
    replay(400, { error: { code: 400, status: "INVALID_ARGUMENT", message: `bad request for key=${key}` } });

    const error = await failure(new GeminiProvider(key), "gemini-2.5-flash");
    expect(error.message).not.toContain(key);
    expect(error.message).toContain("[chave omitida]");
    expect(redactSecrets(`secret ${"s".repeat(12)} here`, ["s".repeat(12)])).toBe("secret [chave omitida] here");
  });

  it("every kind is listed once", () => {
    expect(new Set(CHAT_PROVIDER_ERROR_KINDS).size).toBe(CHAT_PROVIDER_ERROR_KINDS.length);
  });
});

describe("provider contract — model profiles", () => {
  it("every allowed model has exactly one profile, marked production or candidate", () => {
    expect(GEMINI_PROFILES.filter((p) => p.stage === "production").map((p) => p.model)).toEqual([...GEMINI_MODELS]);
    expect(GEMINI_PROFILES.filter((p) => p.stage === "candidate").map((p) => p.model)).toEqual([
      ...GEMINI_CANDIDATE_MODELS,
    ]);
    expect(new Set(GEMINI_PROFILES.map((p) => p.model)).size).toBe(GEMINI_PROFILES.length);
  });
});
