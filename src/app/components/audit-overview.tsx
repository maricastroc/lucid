"use client";

import type { Diagnostic, Finding, Severity } from "@/lucid";
import { CRITERION_ORDER, metaFor, SEVERITY_LABEL, severityInkVar } from "../lib/criteria";
import { buildAuditReport } from "../lib/audit-report";
import type { LedgerEntry } from "../lib/ledger";
import { CriterionMark } from "./badges";
import { ArrowDownIcon } from "./icons";

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

interface Props {
  diagnostic: Diagnostic;
  findings: readonly Finding[];
  safeCount: number;
  humanCount: number;
  ledger: readonly LedgerEntry[];
  activeCriteria: ReadonlySet<string>;
  onToggleCriterion: (criterion: string) => void;
}

export function AuditOverview({
  diagnostic,
  findings,
  safeCount,
  humanCount,
  ledger,
  activeCriteria,
  onToggleCriterion,
}: Props) {
  const total = findings.length;
  const sev: Record<Severity, number> = { info: 0, warning: 0, error: 0 };
  for (const f of findings) sev[f.severity]++;

  return (
    <div className="fade-in flex flex-col">
      <section className="px-6 pb-6 pt-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-[40px] leading-none tabular-nums text-ink-0">{total}</span>
              <span className="text-[14px] text-ink-1">{total === 1 ? "anotação" : "anotações"}</span>
            </div>
            <p className="mt-1 text-[12.5px] text-ink-2">nesta revisão editorial</p>
          </div>
        </div>

        {total > 0 && (
          <>
            <div className="mt-5 flex h-1.5 gap-1" role="img" aria-label={`${safeCount} de troca direta, ${humanCount} exigem decisão humana`}>
              {safeCount > 0 && (
                <span className="rounded-full" style={{ width: `${(safeCount / total) * 100}%`, background: "var(--safe)" }} />
              )}
              {humanCount > 0 && (
                <span className="rounded-full" style={{ width: `${(humanCount / total) * 100}%`, background: "var(--human)" }} />
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px]">
              <Legend swatch="var(--safe)" label="troca direta indicada" value={safeCount} />
              <Legend swatch="var(--human)" label="decisão do autor" value={humanCount} />
            </div>
            {(sev.error > 0 || sev.warning > 0 || sev.info > 0) && (
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-2">
                {(["error", "warning", "info"] as Severity[]).map((s) =>
                  sev[s] > 0 ? (
                    <span key={s} className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full" style={{ background: severityInkVar(s) }} aria-hidden />
                      {sev[s]} {SEVERITY_LABEL[s].toLowerCase()}
                    </span>
                  ) : null,
                )}
              </div>
            )}
          </>
        )}

        <button
          type="button"
          onClick={() =>
            downloadTextFile(
              "auditoria-lucid.md",
              buildAuditReport(diagnostic, findings, { generatedAt: new Date().toLocaleString("pt-BR") }, ledger),
              "text/markdown;charset=utf-8",
            )
          }
          className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rule-2 px-3 py-2.5 text-[13px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface-2"
        >
          <ArrowDownIcon className="size-4" />
          Exportar auditoria (.md)
        </button>

        <p className="mt-4 text-[12px] italic leading-relaxed text-ink-2">
          O placar mede, não aprova. A ausência de anotações não é atestado de clareza.
        </p>
      </section>

      {ledger.length > 0 && <TrailSection entries={ledger} />}

      <section className="border-t border-rule-1 px-6 py-5">
        <SectionLabel>Critérios</SectionLabel>
        <ul className="mt-3 flex flex-col gap-0.5">
          {CRITERION_ORDER.map((criterion) => {
            const meta = metaFor(criterion);
            const score = diagnostic.score.byCriterion.find((c) => c.criterion === criterion);
            const count = score ? score.count.info + score.count.warning + score.count.error : 0;
            const active = activeCriteria.has(criterion);
            return (
              <li key={criterion}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleCriterion(criterion)}
                  className={`row-hit flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2 ${
                    active ? "" : "opacity-45"
                  }`}
                >
                  <CriterionMark criterion={criterion} />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-0">{meta.label}</span>
                  <span className="text-[11px] text-ink-3">{meta.principleName}</span>
                  <span
                    className={`w-5 text-right text-[13px] tabular-nums ${count === 0 ? "text-ink-dim" : "text-ink-1"}`}
                  >
                    {count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 px-2 text-[11.5px] text-ink-3">Toque num critério para mostrar ou ocultar suas anotações.</p>
      </section>

      <section className="border-t border-rule-1 px-6 py-5">
        <SectionLabel>Leitura</SectionLabel>
        <dl className="mt-2 flex flex-col divide-y divide-rule-1">
          {metricRows(diagnostic).map((r) => (
            <div key={r.label} className="flex items-baseline justify-between py-2">
              <dt className="text-[12.5px] text-ink-2">{r.label}</dt>
              <dd className="flex items-baseline gap-2">
                {r.note && <span className="text-[10.5px] text-ink-3">{r.note}</span>}
                <span className="text-[13px] tabular-nums text-ink-0">{r.value}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
          Legibilidade é sinal de apoio (Princípio 4 da norma), nunca aprovação.
        </p>
      </section>
    </div>
  );
}

function Legend({ swatch, label, value }: { swatch: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-ink-1">
      <span className="size-2.5 rounded-[3px]" style={{ background: swatch }} aria-hidden />
      <span className="tabular-nums text-ink-0">{value}</span>
      <span className="text-ink-2">{label}</span>
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="u-label text-ink-3">{children}</h2>;
}

const fmtBurden = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));

function TrailSection({ entries }: { entries: readonly LedgerEntry[] }) {
  const first = entries[0];
  const last = entries[entries.length - 1];
  return (
    <section className="border-t border-rule-1 px-6 py-5">
      <SectionLabel>Trilha de revisão</SectionLabel>
      <p className="mt-2 text-[12px] text-ink-2">
        Peso da auditoria <span className="tabular-nums text-ink-0">{fmtBurden(first.burdenBefore)}</span> →{" "}
        <span className="tabular-nums text-ink-0">{fmtBurden(last.burdenAfter)}</span> · {entries.length}{" "}
        {entries.length === 1 ? "alteração" : "alterações"}
      </p>
      <ol className="mt-3 flex flex-col gap-1.5">
        {entries.map((e, i) => {
          const down = e.burdenAfter <= e.burdenBefore;
          return (
            <li
              key={`${i}-${e.source}-${e.burdenAfter}`}
              className="flex items-baseline justify-between gap-3 text-[12px]"
            >
              <span className="min-w-0 truncate text-ink-1">
                <span className="tabular-nums text-ink-3">{i + 1}.</span> {e.label}
              </span>
              <span className="shrink-0 tabular-nums text-ink-2">
                {fmtBurden(e.burdenBefore)}→{fmtBurden(e.burdenAfter)}{" "}
                <span className={down ? "text-safe" : "text-human"} aria-hidden>
                  {down ? "↓" : "↑"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-[11.5px] italic leading-relaxed text-ink-3">
        Registro do que foi feito nesta sessão — não é atestado de qualidade. Vai no relatório exportado.
      </p>
    </section>
  );
}

function metricRows(diagnostic: Diagnostic) {
  const m = diagnostic.metrics;
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  return [
    { label: "Palavras", value: fmt(m.words) },
    { label: "Frases", value: fmt(m.sentences) },
    { label: "Palavras por frase", value: fmt(m.wordsPerSentence) },
    { label: "Legibilidade", value: fmt(m.fleschPt), note: "Flesch-PT" },
  ] as Array<{ label: string; value: string; note?: string }>;
}
