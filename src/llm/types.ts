export interface ChatCompletionOptions {
  model: string;
  temperature: number;
  maxTokens?: number;
  /** Cancela a chamada (ex.: o usuário clicou "Cancelar", ou o cliente desconectou). */
  signal?: AbortSignal;
}

export interface ChatProvider {
  readonly id: string;
  readonly models: readonly string[];
  complete(prompt: string, options: ChatCompletionOptions): Promise<string>;
}

export class ChatProviderError extends Error {
  constructor(
    message: string,
    readonly providerId: string,
  ) {
    super(message);
    this.name = "ChatProviderError";
  }
}

/** Nenhuma chamada a um provedor deve poder ficar pendurada indefinidamente. */
export const DEFAULT_LLM_TIMEOUT_MS = 45_000;

/** Combina um sinal de cancelamento opcional do chamador com um timeout padrão. */
export function requestSignal(external: AbortSignal | undefined, timeoutMs: number = DEFAULT_LLM_TIMEOUT_MS): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return external ? AbortSignal.any([external, timeout]) : timeout;
}

/** Traduz uma falha de `fetch` (rede, timeout ou cancelamento) numa mensagem legível. */
export function describeFetchFailure(cause: unknown, providerLabel: string, timeoutMs: number = DEFAULT_LLM_TIMEOUT_MS): string {
  if (cause instanceof Error) {
    if (cause.name === "TimeoutError") return `${providerLabel} não respondeu em ${Math.round(timeoutMs / 1000)}s (tempo esgotado)`;
    if (cause.name === "AbortError") return `requisição ao ${providerLabel} cancelada`;
  }
  return `falha de rede ao chamar o ${providerLabel}: ${String(cause)}`;
}
