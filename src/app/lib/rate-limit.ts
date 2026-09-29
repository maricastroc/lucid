import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface LimitResult {
  success: boolean;
  reset: number;
  reason?: string;
}

export interface Limiter {
  limit(identifier: string): Promise<LimitResult>;
}

export type RateLimitDecision =
  { status: "allowed" } | { status: "limited"; retryAfterSeconds: number } | { status: "unavailable" };

export interface RewriteRateLimiter {
  check(clientId: string): Promise<RateLimitDecision>;
}

const GLOBAL_ID = "global";

export function createRewriteRateLimiter(
  perClient: Limiter,
  global: Limiter,
  now: () => number = Date.now,
): RewriteRateLimiter {
  async function consume(limiter: Limiter, id: string): Promise<RateLimitDecision> {
    let result: LimitResult;
    try {
      result = await limiter.limit(id);
    } catch {
      return { status: "unavailable" };
    }
    if (result.reason === "timeout") return { status: "unavailable" };
    if (result.success) return { status: "allowed" };
    return { status: "limited", retryAfterSeconds: Math.max(1, Math.ceil((result.reset - now()) / 1000)) };
  }

  return {
    async check(clientId) {
      const perClientDecision = await consume(perClient, clientId);
      if (perClientDecision.status !== "allowed") return perClientDecision;
      return consume(global, GLOBAL_ID);
    },
  };
}

const ALWAYS_ALLOWED: RewriteRateLimiter = { check: async () => ({ status: "allowed" }) };
const ALWAYS_UNAVAILABLE: RewriteRateLimiter = { check: async () => ({ status: "unavailable" }) };

function upstashRateLimiter(url: string, token: string): RewriteRateLimiter {
  const redis = new Redis({ url, token });
  return createRewriteRateLimiter(
    new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "10 m"), prefix: "lucid:rewrite:ip" }),
    new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(100, "1 h"), prefix: "lucid:rewrite:global" }),
  );
}

export function rewriteRateLimiterFromEnv(env: NodeJS.ProcessEnv = process.env): RewriteRateLimiter {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (url && token) return upstashRateLimiter(url, token);
  return env.NODE_ENV === "production" ? ALWAYS_UNAVAILABLE : ALWAYS_ALLOWED;
}

export function clientIdFrom(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}
