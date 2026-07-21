/**
 * Tier 3 (fiação da UI) — fonte de propostas de reescrita para a interface.
 *
 * Por enquanto usa o `StubRewriteProposer` (determinístico, por fixtures) — a versão real
 * (LLM atrás de flag) é um incremento seguinte. O importante já está pronto e testado: o
 * **verificador determinístico** (`report/rewrite/verify`), que a UI apresenta separando
 * PROVA de SINAL, sempre com o caveat de que passar não é aprovação (ADR-014).
 *
 * As fixtures são casadas pelo texto exato do trecho do finding — logo só disparam no
 * texto-exemplo intacto. Se o autor edita, não há proposta sintética: honesto, é um stub.
 */
import type { Finding } from "@/lucid";
import { proposeAndVerify, StubRewriteProposer, type VerifiedRewrite } from "@/report/rewrite";

/**
 * Reescrita curada para a frase longa do texto-exemplo: mais curta, na voz ativa onde é
 * seguro, sem o jargão ("supracitadas", "em sede de") — o tipo de proposta que o verificador
 * deve aprovar nas PROVAS. É demonstração do fluxo, não geração real.
 */
const SAMPLE_FIXTURES: Record<string, string> = {
  [`Foi realizada a análise do documento pela comissão competente em sede de procedimento administrativo destinado à verificação das condições supracitadas exigidas para a concessão do benefício, e a decisão foi comunicada ao interessado no processo.`]:
    "A comissão competente analisou o documento em procedimento administrativo. O objetivo era verificar as condições exigidas para conceder o benefício. Depois, o órgão comunicou a decisão ao interessado.",
};

const proposer = new StubRewriteProposer(SAMPLE_FIXTURES, "stub-demo@1");

/** Gera uma proposta e a verifica num passo. Nunca aplica — a decisão é do autor. */
export function generateRewrite(text: string, finding: Finding): Promise<VerifiedRewrite> {
  return proposeAndVerify(text, finding, proposer);
}
