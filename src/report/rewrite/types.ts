/**
 * Tier 3 · reescrita PROPOSTA e VERIFICADA — tipos (docs/HANDOFF.md §3; ADR-014).
 *
 * O diferencial do Lucid: a geração (LLM) nunca recebe confiança cega — a engine
 * determinística é o VERIFICADOR. Uma proposta só chega ao autor acompanhada de PROVA
 * determinística e SINAL heurístico, SEMPRE separados e SEMPRE honestos: mesmo tudo
 * passando, isso é "nenhuma falha de piso detectada", jamais um selo verde (mesma regra
 * do CLAUDE.md/I5 que já governa a sonda). A proposta é rotulada "gerada" e NUNCA aplicada
 * sozinha.
 *
 * Fronteira: estes tipos vivem em `report/**`, a única camada que pode conhecer `core` e
 * `probe` ao mesmo tempo. `core/**` nunca importa daqui.
 */
import type { Span } from "../../lucid/core/types";
import type { RewriteStrategy } from "./prompt";

/**
 * Pedido ao proposer: o texto inteiro (normalizado, CONTEXTO) + o ALVO a reescrever (`Span`)
 * — a frase de um finding ou um parágrafo. `criterion` é dica opcional (do finding), quando
 * há um. `strategy` seleciona o prompt (corrigir vs reescrever); default no proposer.
 */
export interface RewriteRequest {
  text: string;
  target: Span;
  criterion?: string;
  strategy?: RewriteStrategy;
}

/**
 * Uma reescrita PROPOSTA para o trecho de um finding. `proposerId` carrega a proveniência
 * ("modelo@versão + prompt@versão", ou o id fixo do stub) — anti-drift, igual ao `id` da
 * sonda. A proposta é do trecho (`finding.span`), não do documento inteiro.
 */
export interface RewriteProposal {
  proposerId: string;
  /** o trecho original = `finding.span.text` */
  original: string;
  /** o texto proposto para substituir o trecho */
  proposed: string;
}

/**
 * PROVA determinística: uma checagem objetiva, derivada de `analyze()` ou de extração
 * mecânica. `passed=false` é falha dura (a proposta é inaceitável). Um conjunto todo
 * `passed=true` NÃO é aprovação — é ausência de falha de piso.
 */
export interface Proof {
  check:
    | "target_resolved" // (só finding) a violação-alvo sumiu do trecho reescrito
    | "region_improved" // os findings do trecho reescrito não aumentaram
    | "no_new_findings" // totalFindings não aumentou
    | "numbers_preserved" // o conjunto de números do trecho é idêntico
    | "dates_preserved" // o conjunto de datas do trecho é idêntico
    | "no_new_jargon" // a proposta não introduziu termo de jargão novo
    | "no_invented_first_person"; // a proposta não fabricou um agente em 1ª pessoa ("nós"/"nossa")
  passed: boolean;
  detail: string;
}

/**
 * SINAL heurístico — NUNCA prova. `flagged=true` levanta uma suspeita para o autor
 * conferir; `flagged=false` é "sem sinal", não um atestado. Deliberadamente sem variante
 * de aprovação.
 */
export interface VerificationSignal {
  check:
    | "entities_preserved" // heurística de maiúscula/sigla: nome pode ter sumido
    | "meaning_preserved"; // sonda de compreensão como teste NEGATIVO (piso)
  flagged: boolean;
  detail: string;
}

/** Delta de métricas: evidência de que ficou mais SIMPLES, não só diferente. */
export interface MetricsDelta {
  fleschPtBefore: number;
  fleschPtAfter: number;
  wordsBefore: number;
  wordsAfter: number;
}

/**
 * Resultado da verificação. SEM campo "aprovado"/"ok" — por construção. `proofs` e
 * `signals` são listas separadas (PROVA ≠ SINAL). `hasBlockingFailure` é true se ALGUMA
 * prova falhou; é um veto mecânico, NÃO o oposto de "aprovado" (a ausência de veto não
 * atesta qualidade).
 */
export interface RewriteVerification {
  proofs: Proof[];
  signals: VerificationSignal[];
  metrics: MetricsDelta;
  hasBlockingFailure: boolean;
}

/** Uma proposta com sua verificação — o que a camada de aplicação exibe, rotulado "gerada". */
export interface VerifiedRewrite {
  proposal: RewriteProposal;
  verification: RewriteVerification;
}

/**
 * O gerador de propostas (Camada 2 / LLM) atrás de uma interface. A implementação real
 * vive atrás de flag e NÃO é dependência do build; o stub determinístico é o que os testes
 * usam (CI byte-idêntica). `id` = proveniência versionada.
 */
export interface RewriteProposer {
  readonly id: string;
  propose(request: RewriteRequest): Promise<RewriteProposal>;
}
