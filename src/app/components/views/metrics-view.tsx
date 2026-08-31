"use client";

import { useState } from "react";
import type { Diagnostic } from "@/lucid";
import { metricRows, type MetricRowKey } from "../../lib/metric-rows";
import { readabilityOf } from "../../lib/readability";
import { useCopy } from "../../i18n/use-copy";
import { ChevronDownIcon } from "../icons";

export function MetricsView({ diagnostic }: { diagnostic: Diagnostic }) {
  const { c, lang } = useCopy();
  const rows = metricRows(diagnostic, lang);
  const notes = readabilityOf(diagnostic.metrics, lang).notes;
  const tables = diagnostic.metrics.tables;
  const [open, setOpen] = useState<MetricRowKey | null>(null);

  return (
    <div className="fade-in px-4 py-4">
      <dl className="flex flex-col divide-y divide-rule-1 border-y border-rule-1">
        {rows.map((row) => {
          const shown = open === row.key;
          const meaning = c.metricsView.meanings[row.key];
          return (
            <div key={row.key} className="py-1">
              <button
                type="button"
                aria-expanded={shown}
                onClick={() => setOpen(shown ? null : row.key)}
                className="focus-inset flex w-full items-baseline gap-2 rounded-md px-1 py-1.5 text-left transition-colors duration-150 hover:bg-surface-2"
              >
                <ChevronDownIcon
                  className={`size-3 shrink-0 translate-y-px text-ink-dim transition-transform duration-150 ${
                    shown ? "" : "-rotate-90"
                  }`}
                />
                <dt className="min-w-0 flex-1 text-[12.5px] text-ink-1">
                  {row.label}
                  {row.descriptor && <span className="ml-1.5 text-[10.5px] text-ink-3">{c.overview.descriptor}</span>}
                </dt>
                <dd className="flex shrink-0 items-baseline gap-2">
                  {row.qualifier !== undefined && <span className="text-[10.5px] text-ink-3">{row.qualifier}</span>}
                  <span className="text-[14px] font-semibold tabular-nums text-ink-0">{row.value}</span>
                </dd>
              </button>

              {shown && (
                <dl className="mb-2 ml-6 flex flex-col gap-1.5 border-l border-rule-2 pl-3 text-[11.5px] leading-relaxed">
                  <Line label={c.metricsView.meaningLabel} value={meaning.meaning} />
                  <Line label={c.metricsView.directionLabel} value={meaning.direction} />
                  <Line label={c.metricsView.limitLabel} value={meaning.limit} />
                </dl>
              )}
            </div>
          );
        })}
      </dl>

      {notes.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5 border-l border-rule-2 pl-3">
          {notes.map((note) => (
            <li key={note} className="text-[11.5px] leading-relaxed text-ink-2">
              {note}
            </li>
          ))}
        </ul>
      )}

      {tables !== undefined && (
        <section
          aria-labelledby="metricas-tabelas"
          className="mt-4 rounded-xl border border-rule-1 bg-surface-2/60 px-3.5 py-3"
        >
          <h3 id="metricas-tabelas" className="u-label text-ink-3">
            {c.metricsView.tablesLabel}
          </h3>
          <p className="mt-2 text-[12.5px] tabular-nums text-ink-1">
            {c.metricsView.tablesApart(tables.tables, tables.cells, tables.words)}
          </p>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-2">{c.metricsView.tablesAudited}</p>
        </section>
      )}

      <p className="mt-4 rounded-lg border border-rule-1 bg-surface-2/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-2">
        {c.metricsView.notAScore}
      </p>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">{c.overview.readingCaveat}</p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="u-sublabel text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-ink-2">{value}</dd>
    </div>
  );
}
