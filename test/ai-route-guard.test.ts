import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RateLimitDecision, RewriteRateLimiter } from "../src/app/lib/rate-limit";

const limiter = vi.hoisted(() => ({ current: null as RewriteRateLimiter | null }));

vi.mock("../src/app/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/app/lib/rate-limit")>();
  return {
    ...actual,
    rewriteRateLimiterFromEnv: () => ({ check: (id: string) => limiter.current!.check(id) }),
  };
});

const { POST: rewritePOST } = await import("../src/app/api/rewrite/route");
const { POST: probePOST } = await import("../src/app/api/probe/route");
const { createRewriteRateLimiter, rewriteRateLimiterFromEnv } =
  await vi.importActual<typeof import("../src/app/lib/rate-limit")>("../src/app/lib/rate-limit");
const { generateRewrite, RewriteFailure, REWRITE_MODELS } = await import("../src/app/lib/rewrite");

const TEXT = "O pedido foi indeferido pela comissão.";
const TARGET = { start: 0, end: TEXT.length, text: TEXT };

function rewriteRequest(): Request {
  return new Request("http://localhost/api/rewrite", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-real-ip": "203.0.113.7" },
    body: JSON.stringify({ text: TEXT, target: TARGET, providerId: "gemini", model: "gemini-2.5-flash" }),
  });
}

function decide(decision: RateLimitDecision): RewriteRateLimiter {
  return { check: vi.fn(async () => decision) };
}

let gemini: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "fake-key");
  gemini = vi.fn(async () => ({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({
      candidates: [{ content: { parts: [{ text: '{"reescrita":"A comissão indeferiu o pedido."}' }] } }],
    }),
  }));
  vi.stubGlobal("fetch", gemini);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("/api/rewrite rate limit", () => {
  it("lets a request within the limit reach the model, keyed by the client IP", async () => {
    limiter.current = decide({ status: "allowed" });
    const response = await rewritePOST(rewriteRequest());

    expect(response.status).toBe(200);
    expect(gemini).toHaveBeenCalledTimes(1);
    expect(limiter.current.check).toHaveBeenCalledWith("203.0.113.7");
  });

  it("answers 429 with its own kind and Retry-After above the limit, without calling the model", async () => {
    limiter.current = decide({ status: "limited", retryAfterSeconds: 42 });
    const response = await rewritePOST(rewriteRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(await response.json()).toMatchObject({ kind: "lucid_rate_limit" });
    expect(gemini).not.toHaveBeenCalled();
  });

  it("answers 503 without calling the model when Redis fails", async () => {
    const failing = { limit: vi.fn(async () => Promise.reject(new Error("ECONNREFUSED"))) };
    const allowing = { limit: vi.fn(async () => ({ success: true, reset: 0 })) };
    limiter.current = createRewriteRateLimiter(failing, allowing);
    const response = await rewritePOST(rewriteRequest());

    expect(response.status).toBe(503);
    expect(gemini).not.toHaveBeenCalled();
  });
});

describe("rewrite rate limiter", () => {
  const allowing = { limit: async () => ({ success: true, reset: 0 }) };

  it("treats a Redis timeout, which the library lets through, as unavailable", async () => {
    const timingOut = { limit: async () => ({ success: true, reset: 0, reason: "timeout" }) };
    expect(await createRewriteRateLimiter(timingOut, allowing).check("ip")).toEqual({ status: "unavailable" });
    expect(await createRewriteRateLimiter(allowing, timingOut).check("ip")).toEqual({ status: "unavailable" });
  });

  it("blocks on the global ceiling even when the client is within its own limit", async () => {
    const global = { limit: async () => ({ success: false, reset: 10_500 }) };
    expect(await createRewriteRateLimiter(allowing, global, () => 0).check("ip")).toEqual({
      status: "limited",
      retryAfterSeconds: 11,
    });
  });

  it("does not spend the global ceiling on a client already over its own limit", async () => {
    const global = { limit: vi.fn(async () => ({ success: true, reset: 0 })) };
    const perClient = { limit: async () => ({ success: false, reset: 0 }) };
    await createRewriteRateLimiter(perClient, global).check("ip");
    expect(global.limit).not.toHaveBeenCalled();
  });

  it("refuses in production without Upstash variables and is disabled in development", async () => {
    expect(await rewriteRateLimiterFromEnv({ NODE_ENV: "production" }).check("ip")).toEqual({ status: "unavailable" });
    expect(await rewriteRateLimiterFromEnv({ NODE_ENV: "development" }).check("ip")).toEqual({ status: "allowed" });
  });
});

describe("/api/probe while the section is disabled", () => {
  it("answers 404 without calling the model", async () => {
    const response = await probePOST(
      new Request("http://localhost/api/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: TEXT, pergunta: "Quem indeferiu?" }),
      }),
    );

    expect(response.status).toBe(404);
    expect(gemini).not.toHaveBeenCalled();
  });
});

describe("the client tells Lucid's limit from the provider's", () => {
  async function failureFor(kind: string): Promise<InstanceType<typeof RewriteFailure>> {
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 429, json: async () => ({ error: "limite", kind }) }));
    const error = await generateRewrite(TEXT, TARGET, REWRITE_MODELS[0]).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RewriteFailure);
    return error as InstanceType<typeof RewriteFailure>;
  }

  it("keeps the two 429 kinds apart", async () => {
    expect((await failureFor("lucid_rate_limit")).kind).toBe("lucid_rate_limit");
    expect((await failureFor("rate_limit")).kind).toBe("rate_limit");
  });
});
