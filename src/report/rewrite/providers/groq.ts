/**
 * Tier 3 · `GroqProvider` — provedor de chat via API do Groq (compatível-OpenAI).
 *
 * Só rede + parse; nenhuma lógica de reescrita. A chave chega pelo construtor (o servidor
 * passa `process.env.GROQ_API_KEY` — nunca o cliente). `temperature 0` para reprodutibilidade.
 * `fetch` puro, sem SDK. Ver ADR-015.
 */
import { ChatProviderError, type ChatCompletionOptions, type ChatProvider } from "./types";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Modelos GRATUITOS do Groq habilitados agora (allow-list). IDs conforme o catálogo do Groq
 * desta conta (`GET /models`); ajustar aqui se o provedor renomear/retirar um modelo. Todos
 * confirmados retornando JSON válido com `response_format: json_object` + `temperature 0`.
 *
 * Nota: DeepSeek não está no catálogo desta conta Groq, e `qwen/qwen3.6-27b` (modelo de
 * raciocínio) falha no modo JSON — ambos ficam de fora até via API própria. O spread atual
 * (Llama 70B/8B × GPT-OSS 120B/20B) já dá um benchmark honesto sob o mesmo verificador.
 */
export const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
] as const;

interface GroqChatResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

export class GroqProvider implements ChatProvider {
  readonly id = "groq";
  readonly models = GROQ_MODELS;
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async complete(prompt: string, options: ChatCompletionOptions): Promise<string> {
    if (!this.models.includes(options.model as (typeof GROQ_MODELS)[number])) {
      throw new ChatProviderError(`modelo não permitido: ${options.model}`, this.id);
    }

    let response: Response;
    try {
      response = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model,
          temperature: options.temperature,
          max_tokens: options.maxTokens ?? 1024,
          // Força a saída em JSON — o proposer espera { "reescrita": "..." }.
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } catch (cause) {
      throw new ChatProviderError(`falha de rede ao chamar o Groq: ${String(cause)}`, this.id);
    }

    const data = (await response.json().catch(() => null)) as GroqChatResponse | null;

    if (!response.ok) {
      const detail = data?.error?.message ?? `HTTP ${response.status}`;
      throw new ChatProviderError(`Groq recusou a requisição: ${detail}`, this.id);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
      throw new ChatProviderError("resposta do Groq sem conteúdo", this.id);
    }
    return content;
  }
}
