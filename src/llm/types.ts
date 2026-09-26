export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatCompletionOptions {
  model: string;
  temperature: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface ChatProvider {
  readonly id: string;
  readonly models: readonly string[];
  complete(prompt: string, options: ChatCompletionOptions): Promise<string>;
  requestConfig?(options: ChatCompletionOptions): Readonly<Record<string, unknown>> | null;
}

export type ChatProviderErrorKind =
  | "authentication"
  | "quota"
  | "rate_limit"
  | "model_unavailable"
  | "invalid_request"
  | "incomplete"
  | "empty"
  | "unusable"
  | "network"
  | "server";

export const CHAT_PROVIDER_ERROR_KINDS: readonly ChatProviderErrorKind[] = [
  "authentication",
  "quota",
  "rate_limit",
  "model_unavailable",
  "invalid_request",
  "incomplete",
  "empty",
  "unusable",
  "network",
  "server",
];

const RE_GOOGLE_KEY = /AIza[0-9A-Za-z_-]{35}/gu;
const REDACTED = "[chave omitida]";

export function redactSecrets(text: string, secrets: readonly string[] = []): string {
  let out = text.replace(RE_GOOGLE_KEY, REDACTED);
  for (const secret of secrets) if (secret.length >= 8) out = out.split(secret).join(REDACTED);
  return out;
}

export class ChatProviderError extends Error {
  constructor(
    message: string,
    readonly providerId: string,
    readonly kind: ChatProviderErrorKind,
  ) {
    super(redactSecrets(message));
    this.name = "ChatProviderError";
  }
}

export const DEFAULT_LLM_TIMEOUT_MS = 45_000;

export function requestSignal(
  external: AbortSignal | undefined,
  timeoutMs: number = DEFAULT_LLM_TIMEOUT_MS,
): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return external ? AbortSignal.any([external, timeout]) : timeout;
}

export function describeFetchFailure(
  cause: unknown,
  providerLabel: string,
  timeoutMs: number = DEFAULT_LLM_TIMEOUT_MS,
): string {
  if (cause instanceof Error) {
    if (cause.name === "TimeoutError")
      return `${providerLabel} não respondeu em ${Math.round(timeoutMs / 1000)}s (tempo esgotado)`;
    if (cause.name === "AbortError") return `requisição ao ${providerLabel} cancelada`;
  }
  return `falha de rede ao chamar o ${providerLabel}: ${String(cause)}`;
}
