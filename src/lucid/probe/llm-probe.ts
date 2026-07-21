/**
 * Camada 2 · sonda de compreensão REAL sobre um `ChatProvider` (ADR-016).
 *
 * Roda o leitor sintético (prompt blindado) num modelo real e devolve o `ProbeResult`. Só LÊ e
 * REPORTA — nunca aprova (o `interpret` só produz `flag`|`neutro`). Usada pelo verificador do
 * Tier 3 como TESTE NEGATIVO de sentido: se o leitor de piso extraía o fato do original e trava
 * na proposta, algo se perdeu.
 *
 * Fronteira: a infra de rede (`ChatProvider`) vem do módulo NEUTRO `src/llm` — `probe` não
 * importa `report`; a cerca (core ⊄ probe) segue intacta. `temperature 0` + modelo fixado +
 * `PROBE_PROMPT_VERSION` = reprodutibilidade suficiente para eval.
 */
import type { ChatProvider } from "@/llm";
import { buildProbePrompt, PROBE_PROMPT_VERSION } from "./prompt";
import type { ComprehensionProbe, OperacaoLeitura, ProbeInput, ProbeResult } from "./types";

const VALID_OPERATIONS: ReadonlySet<string> = new Set<OperacaoLeitura>([
  "resolver_referente_a_distancia",
  "integrar_entre_frases",
  "decodificar_termo_tecnico",
  "inferir_agente_omitido",
  "segurar_sujeito_longo",
  "desfazer_negacao_aninhada",
]);

/**
 * Interpreta o JSON do modelo de forma conservadora. Qualquer ambiguidade vira o caso
 * PESSIMISTA (`pode_responder=false`) — o piso não pode ser generoso. Nunca lança.
 */
export function parseProbeResult(raw: string): ProbeResult {
  const fallback: ProbeResult = {
    podeResponder: false,
    respostaExtraida: "o texto não diz",
    ondeTravou: [],
    operacoesDeLeitura: [],
    precisouInferir: false,
  };

  let obj: Record<string, unknown> | null = null;
  try {
    obj = JSON.parse(raw.trim()) as Record<string, unknown>;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        obj = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        obj = null;
      }
    }
  }
  if (obj === null) return fallback;

  const ondeTravou = Array.isArray(obj.onde_travou)
    ? obj.onde_travou
        .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
        .map((x) => ({ frase: String(x.frase ?? ""), motivo: String(x.motivo ?? "") }))
    : [];
  const operacoes = Array.isArray(obj.operacoes_de_leitura)
    ? obj.operacoes_de_leitura.filter((x): x is OperacaoLeitura => typeof x === "string" && VALID_OPERATIONS.has(x))
    : [];

  return {
    podeResponder: obj.pode_responder === true,
    respostaExtraida: typeof obj.resposta_extraida === "string" ? obj.resposta_extraida : "o texto não diz",
    ondeTravou,
    operacoesDeLeitura: operacoes,
    precisouInferir: obj.precisou_inferir === true,
  };
}

export class LlmComprehensionProbe implements ComprehensionProbe {
  readonly id: string;
  private readonly provider: ChatProvider;
  private readonly model: string;

  constructor(provider: ChatProvider, model: string) {
    this.provider = provider;
    this.model = model;
    this.id = `${provider.id}:${model}+${PROBE_PROMPT_VERSION}`;
  }

  async probe(input: ProbeInput): Promise<ProbeResult> {
    const prompt = buildProbePrompt(input.trecho, input.pergunta);
    const raw = await this.provider.complete(prompt, { model: this.model, temperature: 0, maxTokens: 512 });
    return parseProbeResult(raw);
  }
}
