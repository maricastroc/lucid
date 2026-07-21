/**
 * Metadados de APRESENTAÇÃO dos critérios — puros, de view. A autoridade sobre
 * critério/princípio/severidade é sempre o `Finding` do engine; aqui só traduzimos para
 * identidade visual e para a INSTRUMENTAÇÃO do inspetor (como a regra dispara, por que
 * importa). Nada é inventado: `signal` descreve o mecanismo determinístico real de cada
 * pass (ADR-006/007/008); `why` é glosa curada do princípio da norma.
 */
import type { Category, Finding, Severity } from "@/lucid";

export type Criterion = "long_sentence" | "passive_voice" | "nominalization" | "jargon";
export type Channel = "inline" | "passage";

export interface CriterionMeta {
  label: string;
  ruleId: Criterion;
  principleName: string;
  channel: Channel;
  markStyleClass: string;
  glyph: string;
  /** como a regra determinística dispara (instrumentação honesta) */
  signal: string;
  /** por que isso afeta a leitura (glosa do princípio) */
  why: string;
}

export const CRITERION_ORDER: readonly Criterion[] = ["passive_voice", "nominalization", "jargon", "long_sentence"];

export const CRITERION_META: Record<Criterion, CriterionMeta> = {
  passive_voice: {
    label: "Voz passiva",
    ruleId: "passive_voice",
    principleName: "Frases claras",
    channel: "inline",
    markStyleClass: "mark-dotted",
    glyph: "┈",
    signal: "âncora em forma de “ser” + particípio, janela local de tokens (sem parser)",
    why: "Some quem pratica a ação — o leitor precisa saber quem faz o quê.",
  },
  nominalization: {
    label: "Nominalização",
    ruleId: "nominalization",
    principleName: "Frases claras e concisas",
    channel: "inline",
    markStyleClass: "mark-dashed",
    glyph: "╌",
    signal: "verbo-suporte + determinante + nominalização, adjacência estrita",
    why: "Esconde a ação num substantivo e alonga a frase sem necessidade.",
  },
  jargon: {
    label: "Jargão",
    ruleId: "jargon",
    principleName: "Palavras familiares",
    channel: "inline",
    markStyleClass: "mark-solid",
    glyph: "─",
    signal: "correspondência exata em glossário curado (longest-match-first)",
    why: "Termo pouco familiar fora do domínio afasta o leitor não especialista.",
  },
  long_sentence: {
    label: "Frase longa",
    ruleId: "long_sentence",
    principleName: "Frases concisas",
    channel: "passage",
    markStyleClass: "",
    glyph: "▚",
    signal: "contagem de palavras da frase acima do limiar configurado",
    why: "Frases longas sobrecarregam a memória de trabalho do leitor.",
  },
};

export function isCriterion(value: string): value is Criterion {
  return value in CRITERION_META;
}
export function metaFor(criterion: string): CriterionMeta {
  return isCriterion(criterion) ? CRITERION_META[criterion] : CRITERION_META.jargon;
}

export function findingId(f: Finding): string {
  return `${f.criterion}:${f.span.start}:${f.span.end}`;
}

const SEVERITY_RANK: Record<Severity, number> = { info: 0, warning: 1, error: 2 };
export function severityRank(sev: Severity): number {
  return SEVERITY_RANK[sev];
}
export function severityInkVar(sev: Severity): string {
  if (sev === "error") return "var(--sev-error)";
  if (sev === "warning") return "var(--sev-warn)";
  return "var(--sev-info)";
}
export const SEVERITY_LABEL: Record<Severity, string> = { info: "info", warning: "alerta", error: "erro" };

export const CATEGORY_LABEL: Record<Category, string> = {
  lexical: "léxico",
  syntactic: "sintaxe",
  structural: "estrutura",
  metric: "métrica",
};
