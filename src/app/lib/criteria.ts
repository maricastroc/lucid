/**
 * Metadados de APRESENTAÇÃO dos critérios — puros, de view. A autoridade sobre
 * critério/princípio/severidade é sempre o `Finding` do engine; aqui só traduzimos para
 * a IDENTIDADE EDITORIAL (nome humano, forma da marca) e para a curadoria do que
 * explicar. Nada é inventado: `signal` descreve o mecanismo determinístico real de cada
 * pass (ADR-006/007/008); `why` é glosa curada do princípio da norma.
 *
 * Nomes internos (`long_sentence`, `requiresHuman`, …) NUNCA vazam para o usuário — só
 * `label` e a copy em português aparecem na interface.
 */
import type { Category, Finding, Severity } from "@/lucid";

export type Criterion = "long_sentence" | "passive_voice" | "nominalization" | "jargon";
export type Channel = "inline" | "passage";

export interface CriterionMeta {
  /** nome humano — o único que aparece na UI */
  label: string;
  ruleId: Criterion;
  /** tipo de trabalho editorial (para o cabeçalho da nota) */
  kind: string;
  /** diretriz da norma, em português corrente */
  principleName: string;
  channel: Channel;
  markStyleClass: string;
  /** como a regra determinística dispara (instrumentação honesta) */
  signal: string;
  /** por que isso afeta a leitura (glosa curta do princípio) */
  why: string;
}

/** Ordem de apresentação — sintaxe primeiro, depois léxico, depois medida. */
export const CRITERION_ORDER: readonly Criterion[] = [
  "passive_voice",
  "nominalization",
  "jargon",
  "long_sentence",
];

export const CRITERION_META: Record<Criterion, CriterionMeta> = {
  passive_voice: {
    label: "Voz passiva",
    ruleId: "passive_voice",
    kind: "Construção sintática",
    principleName: "Frases claras",
    channel: "inline",
    markStyleClass: "mark-dotted",
    signal: "âncora numa forma de “ser” seguida de particípio, em janela local de palavras",
    why: "Some quem pratica a ação — e o leitor precisa saber quem faz o quê.",
  },
  nominalization: {
    label: "Nominalização",
    ruleId: "nominalization",
    kind: "Escolha lexical",
    principleName: "Frases claras e concisas",
    channel: "inline",
    markStyleClass: "mark-dashed",
    signal: "verbo-suporte + determinante + substantivo derivado de verbo, em adjacência estrita",
    why: "Esconde a ação dentro de um substantivo e alonga a frase sem necessidade.",
  },
  jargon: {
    label: "Jargão",
    ruleId: "jargon",
    kind: "Escolha lexical",
    principleName: "Palavras familiares",
    channel: "inline",
    markStyleClass: "mark-solid",
    signal: "correspondência exata num glossário curado (maior correspondência primeiro)",
    why: "Termo pouco familiar fora do domínio afasta o leitor não especialista.",
  },
  long_sentence: {
    label: "Frase longa",
    ruleId: "long_sentence",
    kind: "Extensão da frase",
    principleName: "Frases concisas",
    channel: "passage",
    markStyleClass: "",
    signal: "contagem de palavras da frase acima do limite configurado",
    why: "Frases longas sobrecarregam a memória de trabalho de quem lê.",
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

/* ---- Severidade -------------------------------------------------------- */

const SEVERITY_RANK: Record<Severity, number> = { info: 0, warning: 1, error: 2 };
export function severityRank(sev: Severity): number {
  return SEVERITY_RANK[sev];
}
export function severityInkVar(sev: Severity): string {
  if (sev === "error") return "var(--sev-error)";
  if (sev === "warning") return "var(--sev-warn)";
  return "var(--sev-info)";
}
/** Rótulos humanos e editoriais — sem "info/alerta/erro" de terminal. */
export const SEVERITY_LABEL: Record<Severity, string> = {
  info: "Observação",
  warning: "Atenção",
  error: "Prioritário",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  lexical: "léxico",
  syntactic: "sintaxe",
  structural: "estrutura",
  metric: "métrica",
};

/* ---- Estado de automação (o eixo central da identidade do Lucid) ------- */

export type ActionState = "safe" | "human";

/** Segura só quando o engine assina uma substituição mecânica e não pede julgamento. */
export function actionStateOf(f: Finding): ActionState {
  return f.suggestion !== undefined && !f.requiresHuman ? "safe" : "human";
}
export function isSafe(f: Finding): boolean {
  return actionStateOf(f) === "safe";
}

/* ---- Princípios da norma (agrupamento por seção) ----------------------- */

/** Nome do princípio a partir da subseção ABNT (5.1→Relevante … 5.4→Usável). */
export function principleGroupOf(principle: string): string {
  if (principle.startsWith("5.1")) return "Relevante";
  if (principle.startsWith("5.2")) return "Localizável";
  if (principle.startsWith("5.4")) return "Usável";
  return "Compreensível";
}
