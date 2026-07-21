/**
 * Tier 3 (fiação da UI) — fonte de propostas de reescrita para a interface.
 *
 * Dois caminhos, o mesmo verificador determinístico julgando:
 *   · `stub`  — `StubRewriteProposer` client-side (fixtures do texto-exemplo). Offline, sem
 *     custo; demonstra o fluxo.
 *   · Groq    — o proposer REAL roda no SERVIDOR (`/api/rewrite`), porque a chave nunca pode
 *     ir ao browser. O cliente só faz `fetch` e recebe o `VerifiedRewrite`.
 *
 * A ideia (do usuário): o mesmo juiz determinístico avalia modelos diferentes — o que abre
 * um benchmark honesto depois. Ver ADR-014/015.
 */
import type { Span } from "@/lucid";
import { GEMINI_MODELS, GROQ_MODELS } from "@/llm";
import { proposeAndVerify, StubRewriteProposer, type VerifiedRewrite } from "@/report/rewrite";

export interface RewriteModel {
  providerId: "stub" | "groq" | "gemini";
  model: string;
  label: string;
}

/**
 * Modelos oferecidos no seletor da UI. O stub é o default (offline, demonstração). Gemini 2.5
 * Pro é o GERADOR FORTE (a tese do Tier 3: gerador de qualidade + verificador determinístico);
 * os Groq free ficam como comparação barata no mesmo juiz.
 */
export const REWRITE_MODELS: readonly RewriteModel[] = [
  { providerId: "stub", model: "demo", label: "Stub (demonstração, offline)" },
  { providerId: "gemini", model: GEMINI_MODELS[0], label: "Gemini · 2.5 Flash (gerador forte)" },
  { providerId: "gemini", model: GEMINI_MODELS[1], label: "Gemini · 2.5 Pro (requer tier pago)" },
  { providerId: "groq", model: GROQ_MODELS[0], label: "Groq · Llama 3.3 70B" },
  { providerId: "groq", model: GROQ_MODELS[1], label: "Groq · Llama 3.1 8B" },
  { providerId: "groq", model: GROQ_MODELS[2], label: "Groq · GPT-OSS 120B" },
  { providerId: "groq", model: GROQ_MODELS[3], label: "Groq · GPT-OSS 20B" },
];

/**
 * Reescrita curada para a frase longa do texto-exemplo (caminho stub): mais curta, voz ativa
 * onde é seguro, sem o jargão — o tipo de proposta que o verificador deve aprovar nas PROVAS.
 */
const SAMPLE_FIXTURES: Record<string, string> = {
  [`Foi realizada a análise do documento pela comissão competente em sede de procedimento administrativo destinado à verificação das condições supracitadas exigidas para a concessão do benefício, e a decisão foi comunicada ao interessado no processo.`]:
    "A comissão competente analisou o documento em procedimento administrativo. O objetivo era verificar as condições exigidas para conceder o benefício. Depois, o órgão comunicou a decisão ao interessado.",
};

const stubProposer = new StubRewriteProposer(SAMPLE_FIXTURES, "stub-demo@1");

/**
 * Gera uma proposta para o ALVO (`target`, um parágrafo ou a frase de um finding) com o texto
 * inteiro como contexto, e a verifica num passo. `stub` roda no cliente; Groq roda no servidor
 * (com a sonda de sentido). Nunca aplica — a decisão é do autor. Lança `Error` legível em falha.
 */
export async function generateRewrite(
  text: string,
  target: Span,
  choice: RewriteModel,
  criterion?: string,
): Promise<VerifiedRewrite> {
  if (choice.providerId === "stub") {
    return proposeAndVerify(text, target, stubProposer, { criterion });
  }

  const response = await fetch("/api/rewrite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, target, criterion, providerId: choice.providerId, model: choice.model }),
  });

  const data = (await response.json().catch(() => null)) as VerifiedRewrite | { error?: string } | null;
  if (!response.ok || data === null || !("verification" in data)) {
    const message = (data && "error" in data && data.error) || `falha ao gerar (HTTP ${response.status})`;
    throw new Error(message);
  }
  return data;
}
