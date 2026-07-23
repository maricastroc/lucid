import type { Finding } from "@/lucid";
import { totalBurden } from "@/report/rewrite";

export type LedgerSource = "manual" | "ai";

export interface LedgerEntry {
  source: LedgerSource;
  label: string;
  before?: string;
  after?: string;
  burdenBefore: number;
  burdenAfter: number;
}

const SOURCE_LABEL: Record<LedgerSource, string> = {
  manual: "Edição do autor",
  ai: "Reescrita por IA",
};

export function sourceLabel(source: LedgerSource): string {
  return SOURCE_LABEL[source];
}

export function documentBurden(findings: readonly Finding[]): number {
  return totalBurden(findings);
}

const collapse = (t: string): string => t.replace(/\s+/g, " ").trim();
const truncate = (t: string, max = 90): string => (t.length > max ? `${t.slice(0, max - 1)}…` : t);
const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));

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
