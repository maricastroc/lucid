/**
 * `GeminiProvider` — provedor de chat via API do Google Gemini (ADR-019). Infra neutra
 * (`src/llm/**`): só rede + parse, nenhuma lógica de reescrita/compreensão. A chave chega
 * pelo construtor (o servidor passa `process.env.GEMINI_API_KEY` — nunca o cliente) e vai no
 * header `x-goog-api-key`, JAMAIS na URL (regra de privacidade: sem segredo em query string).
 * `temperature 0`, `fetch` puro (sem SDK).
 *
 * Por que Gemini e não só Groq: a tese do Tier 3 é usar um GERADOR forte e manter o
 * diferencial no VERIFICADOR determinístico. Groq (llama/gpt-oss free) é barato; Gemini 2.5
 * é o gerador de qualidade. Qualquer outro provedor (OpenAI, Anthropic) entra pela MESMA
 * interface `ChatProvider` assim que houver chave — nada da cerca muda.
 */
import { ChatProviderError, type ChatCompletionOptions, type ChatProvider } from "./types";
import type { TokenUsage } from "./groq";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Modelos Gemini habilitados (allow-list). `2.5-flash` é o GERADOR FORTE em uso (modelo de
 * raciocínio, com thinking desligado por anti-drift) e também serve de sonda de piso.
 * `2.5-pro` é aceito pelo código, mas exige **tier pago** — no catálogo free desta chave ele
 * responde `limit: 0` (429). Fica na lista para plugar quando houver billing.
 */
export const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro"] as const;

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  error?: { message?: string };
}

export class GeminiProvider implements ChatProvider {
  readonly id = "gemini";
  readonly models = GEMINI_MODELS;
  private readonly apiKey: string;
  /** Uso de tokens da última chamada — proveniência de custo para o benchmark (opcional). */
  lastUsage: TokenUsage | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async complete(prompt: string, options: ChatCompletionOptions): Promise<string> {
    if (!this.models.includes(options.model as (typeof GEMINI_MODELS)[number])) {
      throw new ChatProviderError(`modelo não permitido: ${options.model}`, this.id);
    }

    const endpoint = `${GEMINI_BASE}/${options.model}:generateContent`;

    // Retry só em 429 (rate limit); erros de conteúdo/auth não são retentados.
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: options.temperature,
              maxOutputTokens: options.maxTokens ?? 2048,
              responseMimeType: "application/json",
              // Gemini 2.5 é modelo de RACIOCÍNIO: por padrão gasta "thinking tokens" que (a)
              // consomem o `maxOutputTokens` e TRUNCAM a resposta e (b) injetam
              // não-determinismo. Desligar (`thinkingBudget: 0`) é dobrado alinhamento com o
              // projeto: anti-drift (reprodutibilidade da Camada 2) + a filosofia "o modelo só
              // PROPÕE, o verificador julga" — não precisamos que ele raciocine, precisamos que
              // seja reprodutível. (Só o Flash aceita 0; o Pro exige tier pago neste catálogo.)
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        });
      } catch (cause) {
        throw new ChatProviderError(`falha de rede ao chamar o Gemini: ${String(cause)}`, this.id);
      }

      const data = (await response.json().catch(() => null)) as GeminiResponse | null;

      if (!response.ok) {
        const detail = data?.error?.message ?? `HTTP ${response.status}`;
        if (response.status === 429 && attempt < MAX_RETRIES) {
          await sleep(retryDelayMs(attempt));
          continue;
        }
        throw new ChatProviderError(`Gemini recusou a requisição: ${detail}`, this.id);
      }

      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof content !== "string" || content.trim() === "") {
        throw new ChatProviderError("resposta do Gemini sem conteúdo", this.id);
      }
      this.lastUsage = {
        promptTokens: data?.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: data?.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: data?.usageMetadata?.totalTokenCount ?? 0,
      };
      return content;
    }
  }
}

const MAX_RETRIES = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Backoff exponencial simples (Gemini não manda `retry-after` consistente); teto de 30s. */
function retryDelayMs(attempt: number): number {
  return Math.min(30_000, 2 ** attempt * 1000 + 400);
}
