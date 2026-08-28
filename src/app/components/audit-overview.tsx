"use client";

import { configDeviations, type Block, type BriefingCheck, type Config, type Diagnostic, type Finding, type ReaderBriefing, type Severity } from "@/lucid";
import { severityInkVar, severityLabel } from "../lib/criteria";
import { disabledCriteria } from "../lib/profile";
import { readabilityOf } from "../lib/readability";
import { entryLabel, type LedgerEntry } from "../lib/ledger";
import { tally, type ReviewMarks } from "../lib/review-marks";
import { copyFor } from "../i18n/copy";
import { useCopy } from "../i18n/use-copy";
import type { UiLang } from "../i18n/types";
import type { DocxNotes } from "@/importers/docx";

function flattenedLabel(notes: DocxNotes, c: ReturnType<typeof copyFor>): string | null {
  const parts: string[] = [];
  if (notes.tablesFlattened > 0) parts.push(c.overview.importTables(notes.tablesFlattened));
  if (notes.textBoxesInlined > 0) parts.push(c.overview.importTextBoxes(notes.textBoxesInlined));
  return parts.length === 0 ? null : parts.join(c.overview.importAnd);
}

interface Props {
  diagnostic: Diagnostic;
  findings: readonly Finding[];
  safeCount: number;
  humanCount: number;
  ledger: readonly LedgerEntry[];
  blocks: readonly Block[] | null;
  silentCriteria: readonly string[];
  missingBlockKinds: readonly string[];
  importNotes: DocxNotes | null;
  briefing: ReaderBriefing;
  briefingCheck: BriefingCheck;
  config: Config;
  marks: ReviewMarks;
}

export function AuditOverview({ diagnostic, findings, safeCount, humanCount, ledger, silentCriteria, missingBlockKinds, importNotes, config, marks }: Props) {
  const { c, lang } = useCopy();
  const total = findings.length;
  const sev: Record<Severity, number> = { info: 0, warning: 0, error: 0 };
  for (const f of findings) sev[f.severity]++;
  const deviations = configDeviations(config);
  const offCount = disabledCriteria(config, lang).length;

  return (
    <div className="fade-in flex flex-col">
      <div className="px-6 pb-5">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-[40px] leading-none tabular-nums text-ink-0">{total}</span>
          <span className="text-[14px] text-ink-1">{c.overview.annotations(total)}</span>
        </div>

        {deviations.length > 0 && (
          <p className="mt-2 max-w-md text-[12px] leading-relaxed" style={{ color: "var(--sev-warn)" }}>
            {c.overview.adjustedProfileBefore}
            <strong className="font-semibold">{c.overview.adjustedProfileStrong}</strong> (
            {c.overview.adjustedProfile(deviations.length, offCount)}). {c.overview.adjustedProfileAfter}
          </p>
        )}
        {silentCriteria.length > 0 && (
          <p className="mt-2 max-w-md text-[12px] leading-relaxed" style={{ color: "var(--sev-warn)" }}>
            {c.overview.structureCaveat(
              missingBlockKinds.map((kind) => c.overview.structureMissing[kind] ?? kind).join(c.overview.structureMissingJoin),
              silentCriteria.length,
            )}
          </p>
        )}

        {total > 0 && (
          <>
            <div className="mt-5 flex h-1.5 gap-1" role="img" aria-label={c.overview.splitAriaLabel(safeCount, humanCount)}>
              {safeCount > 0 && (
                <span className="rounded-full" style={{ width: `${(safeCount / total) * 100}%`, background: "var(--safe)" }} />
              )}
              {humanCount > 0 && (
                <span className="rounded-full" style={{ width: `${(humanCount / total) * 100}%`, background: "var(--human)" }} />
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px]">
              <Legend swatch="var(--safe)" label={c.overview.legendSafe} value={safeCount} />
              <Legend swatch="var(--human)" label={c.overview.legendHuman} value={humanCount} />
            </div>
            {(sev.error > 0 || sev.warning > 0 || sev.info > 0) && (
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-2">
                {(["error", "warning", "info"] as Severity[]).map((s) =>
                  sev[s] > 0 ? (
                    <span key={s} className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full" style={{ background: severityInkVar(s) }} aria-hidden />
                      {sev[s]} {severityLabel(s, lang).toLowerCase()}
                    </span>
                  ) : null,
                )}
              </div>
            )}
            <ReviewProgress marks={marks} findings={findings} />
          </>
        )}

        {importNotes !== null && importNotes.headingStylesRecovered.length > 0 && (
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
            {c.overview.importRecovered(importNotes.headingStylesRecovered.join(", "))}
          </p>
        )}
        {importNotes !== null && flattenedLabel(importNotes, c) !== null && (
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
            {c.overview.importFlattened(flattenedLabel(importNotes, c) as string)}
          </p>
        )}

        <p className="mt-4 text-[12px] italic leading-relaxed text-ink-2">{c.overview.scoreCaveat}</p>

        <p className="mt-3 flex items-center gap-2 text-[11px] text-ink-3">
          <span className="inline-flex items-center gap-1.5 text-ink-2">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            {c.note.footerDeterministic}
          </span>
          <span aria-hidden>·</span>
          <span
            className="truncate"
            title={c.panel.provenanceTitle(diagnostic.meta.configHash, diagnostic.meta.lucidVersion)}
          >
            {diagnostic.meta.standardVersion}
          </span>
        </p>
      </div>

      {ledger.length > 0 && <TrailSection entries={ledger} />}
    </div>
  );
}

export function ReadingSection({ diagnostic }: { diagnostic: Diagnostic }) {
  const { c, lang } = useCopy();
  const readingNotes = readabilityOf(diagnostic.metrics, lang).notes;
  return (
    <div className="px-6 pb-5">
      <dl className="flex flex-col divide-y divide-rule-1">
        {metricRows(diagnostic, lang).map((r) => (
          <div key={r.label} className="flex items-baseline justify-between py-2">
            <dt className="text-[12.5px] text-ink-2">{r.label}</dt>
            <dd className="flex items-baseline gap-2">
              {r.note && <span className="text-[10.5px] text-ink-3">{r.note}</span>}
              <span className="text-[13px] tabular-nums text-ink-0">{r.value}</span>
            </dd>
          </div>
        ))}
      </dl>
      {readingNotes.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 border-l border-rule-2 pl-3">
          {readingNotes.map((note) => (
            <li key={note} className="text-[11.5px] leading-relaxed text-ink-2">
              {note}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">{c.overview.readingCaveat}</p>
    </div>
  );
}

function ReviewProgress({ marks, findings }: { marks: ReviewMarks; findings: readonly Finding[] }) {
  const { c } = useCopy();
  const t = tally(marks, findings);
  if (t.total === 0 || t.pending === t.total) return null;
  const done = t.total - t.pending;
  return (
    <div className="mt-4 border-t border-rule-1 pt-3">
      <div className="flex items-baseline justify-between gap-3 text-[12px]">
        <span className="text-ink-2">{c.revisionList.progress(done, t.total)}</span>
        <span className="tabular-nums text-ink-3">{c.revisionList.pendingCount(t.pending)}</span>
      </div>
      <div
        className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-3"
        role="img"
        aria-label={c.revisionList.progress(done, t.total)}
      >
        <span className="block h-full rounded-full bg-ink-2" style={{ width: `${(done / t.total) * 100}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">{c.revisionList.progressCaveat}</p>
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

const fmtBurden = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));

function TrailSection({ entries }: { entries: readonly LedgerEntry[] }) {
  const { c, lang } = useCopy();
  const first = entries[0];
  const last = entries[entries.length - 1];
  return (
    <div className="border-t border-rule-1 px-6 py-5">
      <h3 className="u-label text-ink-3">{c.overview.trailLabel}</h3>
      <p className="mt-2 text-[12px] text-ink-2">
        {c.overview.trailWeight(fmtBurden(first.burdenBefore), fmtBurden(last.burdenAfter), entries.length)}
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
                <span className="tabular-nums text-ink-3">{i + 1}.</span> {entryLabel(e, lang)}
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
      <p className="mt-2 text-[11.5px] italic leading-relaxed text-ink-3">{c.overview.trailCaveat}</p>
    </div>
  );
}

function metricRows(diagnostic: Diagnostic, lang: UiLang) {
  const o = copyFor(lang).overview;
  const m = diagnostic.metrics;
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  const co = m.cohesion;
  const readability = readabilityOf(m, lang);
  return [
    { label: o.metricWords, value: fmt(m.words) },
    { label: o.metricSentences, value: fmt(m.sentences) },
    { label: o.metricWordsPerSentence, value: fmt(m.wordsPerSentence) },
    { label: o.metricReadability, value: readability.value, note: readability.qualifier },
    { label: o.metricReferentialCohesion, value: fmt(co.referentialOverlap), note: o.descriptor },
    { label: o.metricAdjacentGap, value: fmt(co.adjacentGapRatio), note: o.descriptor },
    { label: o.metricConnectives, value: fmt(co.connectivesPer100Words), note: o.descriptor },
  ] as Array<{ label: string; value: string; note?: string }>;
}
