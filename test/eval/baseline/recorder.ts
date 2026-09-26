import { createHash } from "node:crypto";

export interface AttemptRecord {
  readonly at: string;
  readonly endpoint: string;
  readonly status: number | null;
  readonly latencyMs: number;
  readonly promptChars: number | null;
  readonly promptSha256: string | null;
  readonly generationConfig: unknown;
  readonly finishReason: string | null;
  readonly finishMessage: string | null;
  readonly usageMetadata: unknown;
  readonly modelVersion: string | null;
  readonly responseId: string | null;
  readonly partsCount: number | null;
  readonly firstPartText: string | null;
  readonly apiError: { readonly code: number | null; readonly status: string | null; readonly message: string } | null;
  readonly networkError: string | null;
}

interface GeminiBody {
  contents?: { parts?: { text?: string }[] }[];
  generationConfig?: unknown;
}

interface GeminiReply {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string; finishMessage?: string }[];
  usageMetadata?: unknown;
  modelVersion?: string;
  responseId?: string;
  error?: { code?: number; status?: string; message?: string };
}

export const sha256 = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");

let sink: AttemptRecord[] | null = null;

export function installRecorder(secrets: readonly string[]): () => void {
  const real = globalThis.fetch;
  const hidden = secrets.filter((s) => s.length > 0);
  const redact = (text: string): string => hidden.reduce((out, secret) => out.split(secret).join("<redacted>"), text);

  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const endpoint = redact(new URL(url).pathname.replace(/^\/v1beta\//u, ""));
    let body: GeminiBody | null = null;
    try {
      body = typeof init?.body === "string" ? (JSON.parse(init.body) as GeminiBody) : null;
    } catch {
      body = null;
    }
    const prompt = body?.contents?.[0]?.parts?.[0]?.text ?? null;
    const base = {
      at: new Date().toISOString(),
      endpoint,
      promptChars: prompt === null ? null : prompt.length,
      promptSha256: prompt === null ? null : sha256(prompt),
      generationConfig: body?.generationConfig ?? null,
    };
    const startedAt = Date.now();
    try {
      const response = await real(input, init);
      const data = (await response
        .clone()
        .json()
        .catch(() => null)) as GeminiReply | null;
      const candidate = data?.candidates?.[0];
      const parts = candidate?.content?.parts;
      sink?.push({
        ...base,
        status: response.status,
        latencyMs: Date.now() - startedAt,
        finishReason: candidate?.finishReason ?? null,
        finishMessage: candidate?.finishMessage ? redact(candidate.finishMessage) : null,
        usageMetadata: data?.usageMetadata ?? null,
        modelVersion: data?.modelVersion ?? null,
        responseId: data?.responseId ?? null,
        partsCount: Array.isArray(parts) ? parts.length : null,
        firstPartText: typeof parts?.[0]?.text === "string" ? parts[0].text : null,
        apiError: data?.error
          ? {
              code: data.error.code ?? null,
              status: data.error.status ?? null,
              message: redact(data.error.message ?? ""),
            }
          : null,
        networkError: null,
      });
      return response;
    } catch (cause) {
      sink?.push({
        ...base,
        status: null,
        latencyMs: Date.now() - startedAt,
        finishReason: null,
        finishMessage: null,
        usageMetadata: null,
        modelVersion: null,
        responseId: null,
        partsCount: null,
        firstPartText: null,
        apiError: null,
        networkError: redact(cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause)),
      });
      throw cause;
    }
  };

  return () => {
    globalThis.fetch = real;
  };
}

export async function recording<T>(
  fn: () => Promise<T>,
): Promise<{ value: T | null; error: unknown; attempts: AttemptRecord[] }> {
  const attempts: AttemptRecord[] = [];
  sink = attempts;
  try {
    return { value: await fn(), error: null, attempts };
  } catch (error) {
    return { value: null, error, attempts };
  } finally {
    sink = null;
  }
}
