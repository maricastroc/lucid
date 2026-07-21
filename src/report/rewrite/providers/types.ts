/**
 * Tier 3 · abstração de PROVEDOR de chat (ADR-015).
 *
 * Um `ChatProvider` é uma casca fina sobre o endpoint de um provedor (Groq, e depois
 * OpenAI/Anthropic/Gemini) — só faz UMA coisa: dado um prompt, devolve o texto do modelo.
 * Não sabe nada de reescrita nem de verificação; quem monta o prompt e interpreta a
 * resposta é o `LlmRewriteProposer`. Assim o MESMO verificador determinístico julga
 * candidatos de qualquer provedor/modelo (a ideia do benchmark).
 *
 * Vive em `report/**`, que pode fazer rede (a cerca só proíbe rede em `core/**`). Usa
 * `fetch` — sem SDK, para não virar dependência do build (contrato do CLAUDE.md §5).
 */

export interface ChatCompletionOptions {
  model: string;
  /** sempre 0 para o Tier 3 — reprodutibilidade/anti-drift. */
  temperature: number;
  maxTokens?: number;
}

export interface ChatProvider {
  /** id curto e estável do provedor, ex. "groq" — entra na proveniência do proposer. */
  readonly id: string;
  /** allow-list de modelos aceitos — barra injeção de model arbitrário via API. */
  readonly models: readonly string[];
  /** Envia o prompt e devolve o texto bruto do modelo. Lança em erro de rede/HTTP. */
  complete(prompt: string, options: ChatCompletionOptions): Promise<string>;
}

/** Erro de provedor — rede, HTTP não-2xx, ou resposta sem conteúdo. */
export class ChatProviderError extends Error {
  constructor(
    message: string,
    readonly providerId: string,
  ) {
    super(message);
    this.name = "ChatProviderError";
  }
}
