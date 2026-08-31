"use client";

import { useState } from "react";
import type { Config, Finding } from "@/lucid";
import type { ChangeKind, CriterionChange } from "../../lib/attribution";
import { revisionBalance } from "../../lib/attribution";
import { formatWeight, metaFor } from "../../lib/criteria";
import { burdenMove, entryLabel, type LedgerEntry } from "../../lib/ledger";
import { useCopy } from "../../i18n/use-copy";
import { BaselinePanel, StillTherePanel, type BaselineSurface } from "./baseline-panel";
import { ChevronDownIcon, HistoryIcon } from "../icons";

const PASSAGE_LIMIT = 120;

const MOVE_MARK: Record<ReturnType<typeof burdenMove>, string> = { down: "↓", up: "↑", level: "=" };
const MOVE_INK: Record<ReturnType<typeof burdenMove>, string> = {
  down: "text-safe",
  up: "text-human",
  level: "text-ink-3",
};

const collapse = (text: string): string => text.replace(/\s+/g, " ").trim();
const cut = (text: string): string => (text.length > PASSAGE_LIMIT ? `${text.slice(0, PASSAGE_LIMIT - 1)}…` : text);

interface Props {
  entries: readonly LedgerEntry[];
  originalText: string | null;
  originalFindings: readonly Finding[] | null;
  findings: readonly Finding[];
  canUndo: boolean;
  onUndo: () => void;
  baseline: BaselineSurface;
  config: Config;
}

export function ChangesView({
  entries,
  originalText,
  originalFindings,
  findings,
  canUndo,
  onUndo,
  baseline,
  config,
}: Props) {
  const { c, lang } = useCopy();
  const hasChanges = entries.length > 0;
  const comparison = baseline.comparison;

  const before = comparison !== null ? comparison.rebased : originalFindings;

  if (!hasChanges && comparison === null) {
    return (
      <div className="fade-in px-4 py-4">
        <BaselinePanel surface={baseline} config={config} />
        <div className="mt-5 rounded-xl border border-dashed border-rule-2 px-4 py-6 text-center">
          <span className="mx-auto grid size-9 place-items-center rounded-full bg-surface-2 text-ink-3">
            <HistoryIcon className="size-4.5" />
          </span>
          <p className="mt-3 text-[13.5px] font-medium text-ink-1">{c.changes.emptyTitle}</p>
          <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-relaxed text-ink-2">{c.changes.emptyBody}</p>
        </div>
        <EntryText text={originalText} afterChanges={false} />
      </div>
    );
  }

  const first = entries[0];
  const last = entries[entries.length - 1];

  return (
    <div className="fade-in px-4 py-4">
      <BaselinePanel surface={baseline} config={config} />

      {before !== null && <Balance before={before} after={findings} className="mt-5" />}
      {comparison !== null && <StillTherePanel comparison={comparison} />}

      <section aria-labelledby="alteracoes-lista" className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 id="alteracoes-lista" className="u-label text-ink-3">
            {c.changes.listLabel}
          </h3>
          <span className="shrink-0 text-[11.5px] tabular-nums text-ink-2">
            {entries.length} {c.counts.noun.change(entries.length)}
          </span>
        </div>
        {originalFindings === null && (
          <p className="mt-1.5 text-[11.5px] tabular-nums text-ink-2">
            {c.overview.trailWeight(
              formatWeight(first.burdenBefore, lang),
              formatWeight(last.burdenAfter, lang),
              entries.length,
            )}
          </p>
        )}

        <ol aria-label={c.changes.listLabel} className="mt-3 flex flex-col">
          {entries.map((e, i) => (
            <ChangeEntry
              key={`${i}-${e.source}-${e.burdenAfter}`}
              entry={e}
              ordinal={i + 1}
              last={i === entries.length - 1}
              onUndo={canUndo && i === entries.length - 1 ? onUndo : null}
            />
          ))}
        </ol>

        {entries.some((e) => e.source === "typing") && (
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">{c.overview.balanceTypingNote}</p>
        )}
        {entries.some((e) => e.attribution?.changes.some((x) => x.scope === "indirect")) && (
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">{c.overview.balanceIndirectNote}</p>
        )}
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">{c.overview.trailCaveat}</p>
      </section>

      <EntryText text={originalText} afterChanges />
    </div>
  );
}

function Balance({
  before,
  after,
  className = "",
}: {
  before: readonly Finding[];
  after: readonly Finding[];
  className?: string;
}) {
  const { c, lang } = useCopy();
  const total = revisionBalance(before, after);
  const moved = total.byCriterion.filter((row) => row.direction !== "unchanged");

  return (
    <section
      aria-labelledby="alteracoes-balanco"
      className={`rounded-xl border border-rule-1 bg-surface-2/60 px-3.5 py-3 ${className}`}
    >
      <h3 id="alteracoes-balanco" className="u-label text-ink-3">
        {c.overview.balanceLabel}
      </h3>

      <div className="mt-2.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="flex items-baseline gap-1.5 text-[13px] tabular-nums text-ink-0">
          <span className="font-semibold">{formatWeight(total.weightBefore, lang)}</span>
          <span aria-hidden className="text-ink-dim">
            →
          </span>
          <span className="font-semibold">{formatWeight(total.weightAfter, lang)}</span>
          <span className="text-[11.5px] font-normal text-ink-2">{c.overview.balanceWeightNoun}</span>
        </span>
        <span className="text-[11.5px] tabular-nums text-ink-2">
          {c.overview.balanceFound(total.countBefore, total.countAfter)}
        </span>
      </div>

      {moved.length === 0 ? (
        <p className="mt-2.5 text-[12px] text-ink-3">{c.changes.none}</p>
      ) : (
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {moved.map((row) => (
            <li key={row.criterion} className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="min-w-0 truncate text-ink-1">{metaFor(row.criterion, lang).label}</span>
              <span className="flex shrink-0 items-baseline gap-1.5 tabular-nums text-ink-2">
                <span>{c.overview.balanceCount(row.before, row.after)}</span>
                <span aria-hidden>·</span>
                <span className={row.direction === "improved" ? "text-safe" : "text-human"}>
                  {c.overview.balanceDirection[row.direction]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 border-t border-rule-1 pt-2.5 text-[11px] leading-relaxed text-ink-3">
        {c.changes.weightMeaning}
      </p>
    </section>
  );
}

function ChangeEntry({
  entry,
  ordinal,
  last,
  onUndo,
}: {
  entry: LedgerEntry;
  ordinal: number;
  last: boolean;
  onUndo: (() => void) | null;
}) {
  const { c, lang } = useCopy();
  const [open, setOpen] = useState(false);
  const move = burdenMove(entry);
  const effects = entry.attribution?.changes ?? [];
  const from = entry.before === undefined ? "" : collapse(entry.before);
  const to = entry.after === undefined ? "" : collapse(entry.after);
  const hasPassage = from !== "" && entry.after !== undefined;
  const long = from.length > PASSAGE_LIMIT || to.length > PASSAGE_LIMIT;
  const show = (text: string): string => (open || !long ? text : cut(text));

  return (
    <li className="relative flex gap-3 pb-4">
      <span aria-hidden className="flex shrink-0 flex-col items-center">
        <span className="grid size-5 place-items-center rounded-full border border-rule-2 bg-sheet text-[10px] font-semibold tabular-nums text-ink-2">
          {ordinal}
        </span>
        {!last && <span className="mt-1 w-px flex-1 bg-rule-2" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3 text-[12px]">
          <span className="min-w-0 truncate font-medium text-ink-1">{entryLabel(entry, lang)}</span>
          <span className="shrink-0 tabular-nums text-ink-2">
            {formatWeight(entry.burdenBefore, lang)}→{formatWeight(entry.burdenAfter, lang)}{" "}
            <span className={MOVE_INK[move]} aria-hidden>
              {MOVE_MARK[move]}
            </span>
          </span>
        </div>

        {hasPassage && (
          <div className="mt-1.5 overflow-hidden rounded-lg border border-rule-1">
            <p className="flex items-baseline gap-2 bg-surface-2 px-2.5 py-1.5 text-[11.5px] leading-relaxed">
              <span className="u-sublabel w-11 shrink-0 text-ink-3">{c.overview.changeFrom}</span>
              <span className="min-w-0 font-serif text-ink-2 line-through decoration-ink-3">{show(from)}</span>
            </p>
            <p className="flex items-baseline gap-2 border-t border-rule-1 bg-sheet px-2.5 py-1.5 text-[11.5px] leading-relaxed">
              <span className="u-sublabel w-11 shrink-0 text-ink-3">{c.overview.changeTo}</span>
              <span className="min-w-0 font-serif text-ink-0">{show(to)}</span>
            </p>
          </div>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {(long || effects.length > 0) && (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="focus-inset inline-flex items-center gap-1 rounded-md text-[11px] text-ink-2 transition-colors duration-150 hover:text-ink-0"
            >
              <ChevronDownIcon className={`size-3 transition-transform duration-150 ${open ? "" : "-rotate-90"}`} />
              {open ? c.changes.detailsHide : c.changes.detailsShow}
            </button>
          )}
          {onUndo !== null && (
            <button
              type="button"
              onClick={onUndo}
              className="focus-inset rounded-md text-[11px] font-medium text-accent underline decoration-rule-2 underline-offset-2 transition-colors duration-150 hover:decoration-accent"
            >
              {c.changes.undoLast}
            </button>
          )}
        </div>

        {open && effects.length > 0 && (
          <>
            <p className="u-sublabel mt-2 text-ink-3">{c.changes.effectLabel}</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {effects.map((change, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 text-[11.5px]">
                  <span className="min-w-0 truncate text-ink-2">{metaFor(change.criterion, lang).label}</span>
                  <span className={`shrink-0 ${toneOf(change.kind)}`}>{effectLabel(change, c)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </li>
  );
}

function effectLabel(change: CriterionChange, c: ReturnType<typeof useCopy>["c"]): string {
  if (change.kind === "transformed") return c.overview.balanceTransformed(change.before, change.after);
  if (change.kind === "indirect")
    return `${c.overview.balanceCount(change.before, change.after)} · ${c.overview.balanceKind.indirect}`;
  return c.overview.balanceKind[change.kind];
}

function toneOf(kind: ChangeKind): string {
  if (kind === "resolved") return "text-safe";
  if (kind === "introduced") return "text-human";
  return "text-ink-3";
}

function EntryText({ text, afterChanges }: { text: string | null; afterChanges: boolean }) {
  const { c } = useCopy();
  const [open, setOpen] = useState(false);
  const frame = afterChanges ? "mt-5 border-t border-rule-1 pt-4" : "mt-5";

  if (text === null || text === "") {
    if (!afterChanges) return null;
    return (
      <section aria-label={c.overview.entryLabel} className={frame}>
        <h3 className="u-label text-ink-3">{c.overview.entryLabel}</h3>
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
          {text === null ? c.overview.entryUnknown : c.overview.entryWrittenHere}
        </p>
      </section>
    );
  }

  return (
    <section aria-label={c.overview.entryLabel} className={frame}>
      <h3 className="u-label text-ink-3">{c.overview.entryLabel}</h3>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="focus-inset row-hit mt-1.5 flex w-full items-center gap-2 rounded-md py-1 text-left"
      >
        <ChevronDownIcon
          className={`size-3.5 shrink-0 text-ink-3 transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
        />
        <span className="text-[12px] text-ink-1">{open ? c.overview.entryHide : c.overview.entryShow}</span>
        <span className="ml-auto shrink-0 text-[11px] tabular-nums text-ink-3">
          {c.overview.entrySize(text.length)}
        </span>
      </button>
      {open && (
        <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-rule-1 bg-sheet px-3 py-2.5">
          <p className="font-serif text-[12.5px] leading-relaxed whitespace-pre-wrap text-ink-1">{text}</p>
        </div>
      )}
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
        {c.overview.entryNote}
        {afterChanges && ` ${c.overview.entryStartingPoint}`}
      </p>
    </section>
  );
}
