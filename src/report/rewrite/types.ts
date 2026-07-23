import type { Diagnostic, Finding, Span } from "../../lucid/core/types";
import type { RewriteStrategy } from "./prompt";

export interface RewriteLocale {
  readonly id: string;
  analyze(text: string): Diagnostic;
  readonly firstPersonMarkers: RegExp;
  readonly jargonCriterionId: string;
  /** Qualquer forma de substantivo-agente (institucional ou de cargo) curado, sem exigir posição de sujeito — usado para checar presença em qualquer papel no texto-fonte. */
  readonly thirdPersonAgentNouns: RegExp;
  /** As mesmas formas, mas só quando precedidas de artigo definido (posição de sujeito aparente) — usado para detectar o agente que a proposta introduz. Captura o substantivo no grupo 1. */
  readonly thirdPersonAgentSubject: RegExp;
}

/**
 * Resposta do autor à pergunta "quem pratica essa ação?" de uma passiva sem agente
 * (elicitação — ADR-055). `span` aponta o finding no texto-fonte; `agent` é o texto
 * livre declarado pelo autor, ou `null` quando ele decide manter a construção impessoal.
 * A engine nunca monta a frase com essa resposta (ADR-054): ela vira requisito do
 * briefing dirigido e prova de verificação (`declared_agent_present`).
 */
export interface AgentDeclaration {
  span: Span;
  agent: string | null;
}

export interface RewriteRequest {
  text: string;
  target: Span;
  criterion?: string;
  strategy?: RewriteStrategy;
  findings?: readonly Finding[];
  /** Respostas de elicitação do autor (ADR-055) — só surtem efeito na estratégia `directed`. */
  declarations?: readonly AgentDeclaration[];
  localeId?: string;
  /** Cancela a geração (ex.: o usuário clicou "Cancelar", ou o cliente desconectou). */
  signal?: AbortSignal;
}

export interface RewriteProposal {
  proposerId: string;
  original: string;
  proposed: string;
  localeId?: string;
  /**
   * Diagnóstico do parse da resposta do provedor — só definido por proponentes baseados em LLM.
   * "unparseable": parseRewrite() não extraiu uma reescrita válida e o pipeline manteve `original`
   * em `proposed`; distingue essa queda de uma decisão legítima do modelo (ver llm-proposer.ts).
   */
  parseOutcome?: "ok" | "unparseable";
}

export interface Proof {
  check:
    | "target_resolved"
    | "directed_findings_resolved"
    | "declared_agent_present"
    | "region_improved"
    | "no_new_findings"
    | "numbers_preserved"
    | "dates_preserved"
    | "no_new_jargon"
    | "no_invented_first_person";
  passed: boolean;
  detail: string;
}

export interface VerificationSignal {
  check:
    | "entities_preserved"
    | "meaning_preserved"
    | "possible_invented_agent";
  flagged: boolean;
  detail: string;
}

export interface MetricsDelta {
  fleschPtBefore: number;
  fleschPtAfter: number;
  wordsBefore: number;
  wordsAfter: number;
}

export interface RewriteVerification {
  proofs: Proof[];
  signals: VerificationSignal[];
  metrics: MetricsDelta;
  hasBlockingFailure: boolean;
}

export interface VerifiedRewrite {
  proposal: RewriteProposal;
  verification: RewriteVerification;
}

export interface RewriteProposer {
  readonly id: string;
  propose(request: RewriteRequest): Promise<RewriteProposal>;
}
