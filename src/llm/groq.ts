/**
 * `GroqProvider` — provedor de chat via API do Groq (compatível-OpenAI). Infra neutra
 * (`src/llm/**`): só rede + parse, nenhuma lógica de reescrita/compreensão. A chave chega
 * pelo construtor (o servidor passa `process.env.GROQ_API_KEY` — nunca o cliente).
 * `temperature 0`, `fetch` puro (sem SDK). Ver ADR-015/016.
 */
import { ChatProviderError, type ChatCompletionOptions, type ChatProvider } from "./types";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Modelos GRATUITOS do Groq habilitados (allow-list), confirmados retornando JSON válido com
 * `response_format: json_object` + `temperature 0`. DeepSeek não está no catálogo desta conta
 * e `qwen/qwen3.6-27b` (raciocínio) falha no modo JSON — ambos ficam de fora por ora.
 */
export const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
] as const;

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface GroqChatResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: { message?: string };
}

export class GroqProvider implements ChatProvider {
  readonly id = "groq";
  readonly models = GROQ_MODELS;
  private readonly apiKey: string;
  /** Uso de tokens da última chamada — proveniência de custo para o benchmark (opcional). */
  lastUsage: TokenUsage | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async complete(prompt: string, options: ChatCompletionOptions): Promise<string> {
    if (!this.models.includes(options.model as (typeof GROQ_MODELS)[number])) {
      throw new ChatProviderError(`modelo não permitido: ${options.model}`, this.id);
    }

    // Retry limitado só em 429 (rate limit), respeitando o tempo sugerido pelo Groq. Erros de
    // conteúdo/auth não são retentados. Mantém a resiliência sem esconder falhas reais.
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await fetch(GROQ_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
          body: JSON.stringify({
            model: options.model,
            temperature: options.temperature,
            max_tokens: options.maxTokens ?? 1024,
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
        if (response.status === 429 && attempt < MAX_RETRIES) {
          await sleep(retryDelayMs(response.headers.get("retry-after"), detail, attempt));
          continue;
        }
        throw new ChatProviderError(`Groq recusou a requisição: ${detail}`, this.id);
      }

      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim() === "") {
        throw new ChatProviderError("resposta do Groq sem conteúdo", this.id);
      }
      this.lastUsage = {
        promptTokens: data?.usage?.prompt_tokens ?? 0,
        completionTokens: data?.usage?.completion_tokens ?? 0,
        totalTokens: data?.usage?.total_tokens ?? 0,
      };
      return content;
    }
  }
}

const MAX_RETRIES = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Quanto esperar antes de retentar um 429: prioriza o header `retry-after` (segundos), senão
 * extrai "try again in Xs" da mensagem do Groq; fallback com backoff exponencial. Teto de 30s.
 */
function retryDelayMs(retryAfter: string | null, detail: string, attempt: number): number {
  const fromHeader = retryAfter ? Number(retryAfter) : NaN;
  const fromMessage = Number(detail.match(/try again in ([\d.]+)s/i)?.[1]);
  const seconds = Number.isFinite(fromHeader) ? fromHeader : Number.isFinite(fromMessage) ? fromMessage : 2 ** attempt;
  return Math.min(30_000, Math.ceil(seconds * 1000) + 400);
}
