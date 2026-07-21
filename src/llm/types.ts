/**
 * Infra de LLM COMPARTILHADA — `src/llm/**` (ADR-016).
 *
 * Módulo NEUTRO: não importa `core`, `probe` nem `report`. É a única casa da infraestrutura
 * de rede para chat (o Tier 3 usa para o proposer real; a sonda usa para o leitor sintético).
 * Assim `report` e `probe` importam daqui sem inverter nenhuma seta da cerca, e `core`
 * continua zero-rede (a cerca só o proíbe de importar rede/probe/report).
 *
 * Um `ChatProvider` é uma casca fina sobre o endpoint de um provedor (Groq, e depois
 * OpenAI/Anthropic/Gemini): dado um prompt, devolve o texto do modelo. Não sabe nada de
 * reescrita nem de compreensão — quem monta o prompt e interpreta a resposta é o chamador.
 */

export interface ChatCompletionOptions {
  model: string;
  /** sempre 0 no Lucid — reprodutibilidade/anti-drift. */
  temperature: number;
  maxTokens?: number;
}

export interface ChatProvider {
  /** id curto e estável do provedor, ex. "groq" — entra na proveniência do chamador. */
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
