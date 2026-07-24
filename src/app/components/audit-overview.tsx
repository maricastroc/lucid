"use client";

import type { Diagnostic, Finding, Severity } from "@/lucid";
import { SEVERITY_LABEL, severityInkVar } from "../lib/criteria";
import { buildAuditReport } from "../lib/audit-report";
import type { LedgerEntry } from "../lib/ledger";
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
}

export function AuditOverview({ diagnostic, findings, safeCount, humanCount, ledger }: Props) {
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
    </div>
  );
}

/** Descritores de leitura (Flesch-PT + coesão). Fica depois do índice para não empurrá-lo para baixo. */
export function ReadingSection({ diagnostic }: { diagnostic: Diagnostic }) {
  return (
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
        Legibilidade e coesão são descritores de apoio, nunca aprovação: valor alto ou baixo não é, sozinho, bom nem
        ruim (coesão alta pode ser repetição; baixa pode ser variação).
      </p>
    </section>
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
  const co = m.cohesion;
  return [
    { label: "Palavras", value: fmt(m.words) },
    { label: "Frases", value: fmt(m.sentences) },
    { label: "Palavras por frase", value: fmt(m.wordsPerSentence) },
    { label: "Legibilidade", value: fmt(m.fleschPt), note: "Flesch-PT" },
    { label: "Coesão referencial", value: fmt(co.referentialOverlap), note: "descritor" },
    { label: "Pares sem continuidade", value: fmt(co.adjacentGapRatio), note: "descritor" },
    { label: "Conectivos /100 palavras", value: fmt(co.connectivesPer100Words), note: "descritor" },
  ] as Array<{ label: string; value: string; note?: string }>;
}
