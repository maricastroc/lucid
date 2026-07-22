/**
 * Trilha de proveniência (ADR-000 · Etapa 6) — o veredito deixa de ser efêmero e ACUMULA num
 * registro em nível de documento. É o que um AUDITOR produz: uma trilha, não um momento. Cada
 * alteração aplicada na sessão vira uma entrada com a FONTE (correção segura, divisão, voz ativa,
 * edição do autor, reescrita por IA) e o PESO de severidade do documento antes/depois — a mesma
 * régua canônica que julga uma reescrita (`totalBurden`, ADR-018), não contagem crua.
 *
 * HONESTIDADE: a trilha é um REGISTRO do que foi feito, nunca um atestado de qualidade. O peso cair
 * mostra que a auditoria ficou mais leve; não certifica clareza. O renderizador é PURO (função das
 * entradas), então é determinístico e testável.
 */
import type { Finding } from "@/lucid";
import { totalBurden } from "@/report/rewrite";

export type LedgerSource = "safe" | "split" | "passive" | "manual" | "ai";

export interface LedgerEntry {
  source: LedgerSource;
  /** rótulo humano da fonte (ex.: "Correção segura · Jargão", "Reescrita por IA · groq:llama…"). */
  label: string;
  /** trecho antes/depois, quando a alteração é de um span único; lotes (aplicar todas) omitem. */
  before?: string;
  after?: string;
  /** peso de severidade do documento inteiro, antes e depois desta alteração (ADR-018). */
  burdenBefore: number;
  burdenAfter: number;
}

const SOURCE_LABEL: Record<LedgerSource, string> = {
  safe: "Correção segura",
  split: "Divisão de frase",
  passive: "Voz ativa",
  manual: "Edição do autor",
  ai: "Reescrita por IA",
};

export function sourceLabel(source: LedgerSource): string {
  return SOURCE_LABEL[source];
}

/** Peso de severidade do documento — a régua da trilha (canônica, ADR-018). */
export function documentBurden(findings: readonly Finding[]): number {
  return totalBurden(findings);
}

const collapse = (t: string): string => t.replace(/\s+/g, " ").trim();
const truncate = (t: string, max = 90): string => (t.length > max ? `${t.slice(0, max - 1)}…` : t);
const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/**
 * Renderiza a trilha em Markdown, para entrar no relatório exportável (a auditoria entrega a
 * trilha). Vazia → string vazia (o chamador omite a seção). PURO e determinístico.
 */
export function renderLedgerMarkdown(entries: readonly LedgerEntry[]): string {
  if (entries.length === 0) return "";
  const out: string[] = [];
  out.push("## Trilha de revisão");
  out.push("");
  out.push(
    "Registro das alterações aplicadas nesta sessão, com o peso de severidade do documento (ABNT/ADR-018) " +
      "antes e depois de cada uma. É um registro do que foi feito — não um atestado de qualidade.",
  );
  out.push("");
  const first = entries[0];
  const last = entries[entries.length - 1];
  out.push(`**Peso da auditoria na sessão:** ${fmt(first.burdenBefore)} → ${fmt(last.burdenAfter)} (${entries.length} ${entries.length === 1 ? "alteração" : "alterações"}).`);
  out.push("");
  entries.forEach((e, i) => {
    const arrow = e.burdenAfter <= e.burdenBefore ? "↓" : "↑";
    out.push(`**${i + 1}. ${e.label}** — peso ${fmt(e.burdenBefore)} → ${fmt(e.burdenAfter)} ${arrow}`);
    if (e.before !== undefined && e.after !== undefined) {
      out.push(`_de:_ "${truncate(collapse(e.before))}" · _para:_ "${truncate(collapse(e.after))}"`);
    }
    out.push("");
  });
  return out.join("\n");
}
