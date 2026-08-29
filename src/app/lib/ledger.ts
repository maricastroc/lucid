import type { Finding } from "@/lucid";
import { totalBurden } from "@/report/rewrite";
import { copyFor } from "../i18n/copy";
import { DEFAULT_UI_LANG, type UiLang } from "../i18n/types";

export type LedgerSource = "manual" | "ai" | "glossary";

export interface LedgerEntry {
  source: LedgerSource;
  label: string;
  proposerId?: string;
  before?: string;
  after?: string;
  burdenBefore: number;
  burdenAfter: number;
}

export function sourceLabel(source: LedgerSource, lang: UiLang = DEFAULT_UI_LANG): string {
  return copyFor(lang).ledger[source];
}

export function entryLabel(entry: LedgerEntry, lang: UiLang = DEFAULT_UI_LANG): string {
  const base = sourceLabel(entry.source, lang);
  return entry.proposerId === undefined ? base : `${base} · ${entry.proposerId}`;
}

export function documentBurden(findings: readonly Finding[]): number {
  return totalBurden(findings);
}

export type BurdenMove = "down" | "up" | "level";

export function burdenMove(entry: LedgerEntry): BurdenMove {
  if (entry.burdenAfter < entry.burdenBefore) return "down";
  if (entry.burdenAfter > entry.burdenBefore) return "up";
  return "level";
}

const collapse = (t: string): string => t.replace(/\s+/g, " ").trim();
const truncate = (t: string, max = 90): string => (t.length > max ? `${t.slice(0, max - 1)}…` : t);
const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function renderLedgerMarkdown(entries: readonly LedgerEntry[]): string {
  if (entries.length === 0) return "";
  const out: string[] = [];
  out.push("## Alterações registradas");
  out.push("");
  out.push(
    "Alterações aplicadas a partir de um ponto da revisão — troca do glossário, edição do autor e proposta de IA — " +
      "com o peso de severidade do documento (ABNT/ADR-018) antes e depois de cada uma. É um registro do que foi " +
      "feito, não um atestado de qualidade.",
  );
  out.push("");
  out.push(
    "**Esta lista não é o histórico completo de edição.** Texto reescrito à mão no modo Escrever altera o " +
      "documento sem gerar entrada aqui, e a variação de peso abaixo não atribui a essas edições nada do que " +
      "mudou.",
  );
  out.push("");
  const first = entries[0];
  const last = entries[entries.length - 1];
  out.push(
    `**Peso da auditoria na sessão:** ${fmt(first.burdenBefore)} → ${fmt(last.burdenAfter)} ` +
      `(${entries.length} ${entries.length === 1 ? "alteração registrada" : "alterações registradas"}).`,
  );
  out.push("");
  entries.forEach((e, i) => {
    const move = burdenMove(e);
    const mark = move === "level" ? "(sem mudança de peso)" : move === "down" ? "↓" : "↑";
    out.push(`**${i + 1}. ${e.label}** — peso ${fmt(e.burdenBefore)} → ${fmt(e.burdenAfter)} ${mark}`);
    if (e.before !== undefined && e.after !== undefined) {
      out.push(`_de:_ "${truncate(collapse(e.before))}" · _para:_ "${truncate(collapse(e.after))}"`);
    }
    out.push("");
  });
  return out.join("\n");
}
