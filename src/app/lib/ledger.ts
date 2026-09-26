import type { Finding } from "@/lucid";
import type { Attribution } from "./attribution";
import type { AnalysisLocaleId } from "../locale/active";
import { metaFor } from "./criteria";
import { needsAuthorDecision, NOT_VERIFIED, PROOF_CHECKS, totalBurden, type VerifiedRewrite } from "@/report/rewrite";
import { stableStringify } from "@/lucid";
import { copyFor } from "../i18n/copy";
import { DEFAULT_UI_LANG, type UiLang } from "../i18n/types";

export type LedgerSource = "manual" | "ai" | "glossary" | "attested" | "typing";

export type LedgerDecision = "used" | "used_anyway";

export interface LedgerCheck {
  readonly check: string;
  readonly detail: string;
}

export interface LedgerVerification {
  readonly notConfirmed: readonly LedgerCheck[];
  readonly additions: readonly LedgerCheck[];
  readonly effects: readonly LedgerCheck[];
  readonly signals: readonly LedgerCheck[];
  readonly notVerified: readonly string[];
}

export interface LedgerProvenance {
  readonly providerId: string;
  readonly model: string;
  readonly strategy: string;
  readonly generation: Readonly<Record<string, unknown>> | null;
  readonly promptHash: string;
  readonly promptChars: number;
}

export interface LedgerEntry {
  source: LedgerSource;
  label: string;
  proposerId?: string;
  attestedIn?: string;
  before?: string;
  after?: string;
  burdenBefore: number;
  burdenAfter: number;
  attribution?: Attribution;
  decision?: LedgerDecision;
  verification?: LedgerVerification;
  provenance?: LedgerProvenance;
  decidedAt?: string;
}

export type LedgerDecisionRecord = Required<Pick<LedgerEntry, "decision" | "verification" | "decidedAt">> &
  Pick<LedgerEntry, "provenance">;

export function decisionRecord(result: VerifiedRewrite, decidedAt: string): LedgerDecisionRecord {
  const { proofs, signals } = result.verification;
  const guarantee = (check: keyof typeof PROOF_CHECKS) => PROOF_CHECKS[check].kind === "guarantee";
  const pick = ({ check, detail }: { check: string; detail: string }): LedgerCheck => ({ check, detail });
  const provenance = result.proposal.provenance;
  return {
    decision: needsAuthorDecision(result.verification) ? "used_anyway" : "used",
    verification: {
      notConfirmed: proofs.filter((p) => guarantee(p.check) && p.outcome === "not_confirmed").map(pick),
      additions: proofs.filter((p) => guarantee(p.check) && p.outcome === "addition").map(pick),
      effects: proofs.filter((p) => !guarantee(p.check) && !p.passed).map(pick),
      signals: signals.filter((s) => s.flagged).map(pick),
      notVerified: NOT_VERIFIED.map((d) => d.id),
    },
    ...(provenance === undefined ? {} : { provenance: { ...provenance } }),
    decidedAt,
  };
}

export function sourceLabel(source: LedgerSource, lang: UiLang = DEFAULT_UI_LANG): string {
  return copyFor(lang).ledger[source];
}

export function entryLabel(entry: LedgerEntry, lang: UiLang = DEFAULT_UI_LANG): string {
  const base = sourceLabel(entry.source, lang);
  if (entry.attestedIn !== undefined) return `${base} · ${entry.attestedIn}`;
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

const KIND_PT: Record<string, string> = {
  resolved: "resolvido",
  kept: "mantido",
  reshaped: "reescrito, segue apontado",
  introduced: "introduzido",
  transformed: "virou outra coisa",
  indirect: "efeito indireto",
};

const collapse = (t: string): string => t.replace(/\s+/g, " ").trim();
const truncate = (t: string, max = 90): string => (t.length > max ? `${t.slice(0, max - 1)}…` : t);
const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));

function decisionLines(e: LedgerEntry): string[] {
  if (e.decision === undefined || e.verification === undefined) return [];
  const v = e.verification;
  const out: string[] = [e.decision === "used_anyway" ? "_Usado mesmo assim:_" : "_Usado como rascunho._"];
  for (const c of v.notConfirmed) out.push(`- Não confirmado: ${c.detail}`);
  for (const c of v.additions) out.push(`- Acréscimo para conferir: ${c.detail}`);
  for (const c of v.effects) out.push(`- Efeito no texto: ${c.detail}`);
  for (const c of v.signals) out.push(`- Sinal ativo (não é prova): ${c.detail}`);
  const current = NOT_VERIFIED.map((d) => d.id);
  if (v.notVerified.join(",") !== current.join(",")) {
    out.push(`- Não verificado nesta versão: ${v.notVerified.join(", ")}`);
  }
  if (e.provenance !== undefined) {
    const p = e.provenance;
    out.push(
      `_proposta:_ ${p.providerId} · ${p.model} · ${p.strategy} · prompt ${p.promptHash} (${p.promptChars} caracteres)` +
        (p.generation === null ? "" : ` · configuração ${stableStringify(p.generation)}`),
    );
  }
  if (e.decidedAt !== undefined) out.push(`_decidido em:_ ${e.decidedAt}`);
  return out;
}

export function renderLedgerMarkdown(entries: readonly LedgerEntry[], localeId: AnalysisLocaleId): string {
  if (entries.length === 0) return "";
  const out: string[] = [];
  out.push("## Alterações registradas");
  out.push("");
  out.push(
    "Alterações registradas nesta sessão, com o peso de severidade do documento antes e depois de cada uma. " +
      "A escala desse peso é do Lucid, não da norma. É um registro do que foi feito, não um atestado de qualidade.",
  );
  out.push("");
  out.push(
    `Texto digitado no modo Escrever entra como uma única alteração (“${sourceLabel("typing")}”) quando o autor ` +
      "sai desse modo. **Uma edição ainda aberta no modo Escrever não aparece aqui.**",
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
    out.push(`**${i + 1}. ${e.label}**: peso ${fmt(e.burdenBefore)} → ${fmt(e.burdenAfter)} ${mark}`);
    if (e.attestedIn !== undefined) out.push(`_equivalência atestada em:_ ${e.attestedIn}`);
    if (e.before !== undefined && e.after !== undefined && e.before !== "") {
      out.push(`_de:_ "${truncate(collapse(e.before))}" · _para:_ "${truncate(collapse(e.after))}"`);
    }
    out.push(...decisionLines(e));
    for (const change of e.attribution?.changes ?? []) {
      const label = metaFor(localeId, change.criterion).label;
      const verdict =
        change.kind === "transformed"
          ? `${change.before} virou ${change.after}`
          : change.kind === "indirect"
            ? `${change.before} → ${change.after} · efeito indireto`
            : (KIND_PT[change.kind] ?? change.kind);
      out.push(`- ${label}: ${verdict}`);
    }
    out.push("");
  });

  if (entries.some((e) => e.verification !== undefined)) {
    out.push(
      "_Em cada versão verificada, o Lucid não verifica: " +
        `${NOT_VERIFIED.map((d) => d.what).join("; ")}. A decisão de usar é do autor, e "usado mesmo assim" não é ` +
        "aprovação nem reprovação do Lucid._",
    );
    out.push("");
  }
  if (entries.some((e) => e.source === "typing")) {
    out.push(
      "_Trecho reescrito à mão: a comparação vale para a região inteira. Dentro dela, não é possível dizer qual " +
        "ocorrência corresponde a qual._",
    );
    out.push("");
  }
  if (entries.some((e) => e.attribution?.changes.some((c) => c.scope === "indirect"))) {
    out.push(
      "_Efeito indireto: a contagem mudou fora do trecho editado. Alguns critérios comparam partes diferentes do " +
        "texto, como um título e o anterior, então mexer em um trecho pode mudar o resultado de outro._",
    );
    out.push("");
  }
  return out.join("\n");
}
