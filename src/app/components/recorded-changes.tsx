"use client";

import { useState } from "react";
import type { ChangeKind, CriterionChange } from "../lib/attribution";
import { formatWeight, metaFor } from "../lib/criteria";
import { burdenMove, entryLabel, type LedgerEntry } from "../lib/ledger";
import { useCopy } from "../i18n/use-copy";
import { ChevronDownIcon } from "./icons";

const PASSAGE_LIMIT = 90;

const MOVE_MARK: Record<ReturnType<typeof burdenMove>, string> = { down: "↓", up: "↑", level: "=" };
const MOVE_INK: Record<ReturnType<typeof burdenMove>, string> = {
  down: "text-safe",
  up: "text-human",
  level: "text-ink-3",
};

const collapse = (text: string): string => text.replace(/\s+/g, " ").trim();

export function RecordedChanges({
  entries,
  originalText,
}: {
  entries: readonly LedgerEntry[];
  originalText: string | null;
}) {
  const { c, lang } = useCopy();
  const hasChanges = entries.length > 0;
  const hasEntryText = originalText !== null && originalText !== "";
  if (!hasChanges && !hasEntryText) return null;

  const first = entries[0];
  const last = entries[entries.length - 1];

  return (
    <div className="border-t border-rule-1 px-4 py-5">
      {hasChanges && (
        <>
          <h3 className="u-label text-ink-3">{c.overview.trailLabel}</h3>
          <p className="mt-2 text-[12px] text-ink-2">
            {c.overview.trailWeight(
              formatWeight(first.burdenBefore, lang),
              formatWeight(last.burdenAfter, lang),
              entries.length,
            )}
          </p>
          <ol aria-label={c.overview.trailLabel} className="mt-3 flex flex-col gap-2.5">
            {entries.map((e, i) => {
              const move = burdenMove(e);
              return (
                <li key={`${i}-${e.source}-${e.burdenAfter}`}>
                  <div className="flex items-baseline justify-between gap-3 text-[12px]">
                    <span className="min-w-0 truncate text-ink-1">
                      <span className="tabular-nums text-ink-3">{i + 1}.</span> {entryLabel(e, lang)}
                    </span>
                    <span className="shrink-0 tabular-nums text-ink-2">
                      {formatWeight(e.burdenBefore, lang)}→{formatWeight(e.burdenAfter, lang)}{" "}
                      <span className={MOVE_INK[move]} aria-hidden>
                        {MOVE_MARK[move]}
                      </span>
                    </span>
                  </div>
                  {e.before !== undefined && e.after !== undefined && e.before !== "" && (
                    <ChangePassage before={e.before} after={e.after} />
                  )}
                  {(e.attribution?.changes.length ?? 0) > 0 && <ChangeEffects changes={e.attribution!.changes} />}
                </li>
              );
            })}
          </ol>
          {entries.some((e) => e.source === "typing") && (
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">{c.overview.balanceTypingNote}</p>
          )}
          {entries.some((e) => e.attribution?.changes.some((x) => x.scope === "indirect")) && (
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">{c.overview.balanceIndirectNote}</p>
          )}
          <p className="mt-3 text-[11.5px] italic leading-relaxed text-ink-3">{c.overview.trailCaveat}</p>
        </>
      )}

      <EntryText text={originalText} afterChanges={hasChanges} />
    </div>
  );
}

function ChangeEffects({ changes }: { changes: readonly CriterionChange[] }) {
  const { c, lang } = useCopy();
  return (
    <ul className="mt-1.5 flex flex-col gap-0.5">
      {changes.map((change, i) => (
        <li key={i} className="flex items-baseline justify-between gap-3 text-[11.5px]">
          <span className="min-w-0 truncate text-ink-2">{metaFor(change.criterion, lang).label}</span>
          <span className={`shrink-0 ${toneOf(change.kind)}`}>
            {change.kind === "transformed"
              ? c.overview.balanceTransformed(change.before, change.after)
              : change.kind === "indirect"
                ? `${c.overview.balanceCount(change.before, change.after)} · ${c.overview.balanceKind.indirect}`
                : c.overview.balanceKind[change.kind]}
          </span>
        </li>
      ))}
    </ul>
  );
}

function toneOf(kind: ChangeKind): string {
  if (kind === "resolved") return "text-safe";
  if (kind === "introduced") return "text-human";
  return "text-ink-3";
}

function ChangePassage({ before, after }: { before: string; after: string }) {
  const { c } = useCopy();
  const [open, setOpen] = useState(false);
  const from = collapse(before);
  const to = collapse(after);
  const long = from.length > PASSAGE_LIMIT || to.length > PASSAGE_LIMIT;
  const show = (text: string): string => (open || !long ? text : cut(text));

  return (
    <div className="mt-1.5 rounded-lg border border-rule-1 bg-surface-2 px-2.5 py-2">
      <PassageLine label={c.overview.changeFrom}>
        <span className="text-ink-2 line-through decoration-ink-3">{show(from)}</span>
      </PassageLine>
      <PassageLine label={c.overview.changeTo}>
        <span className="text-ink-0">{show(to)}</span>
      </PassageLine>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="focus-inset mt-1 rounded-md text-[11px] text-ink-3 underline decoration-rule-2 underline-offset-2 transition-colors duration-150 hover:text-ink-1"
        >
          {open ? c.overview.changeCollapse : c.overview.changeExpand}
        </button>
      )}
    </div>
  );
}

function PassageLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="flex items-baseline gap-2 text-[11.5px] leading-relaxed not-first:mt-0.5">
      <span className="u-sublabel w-11 shrink-0 text-ink-3">{label}</span>
      <span className="min-w-0 font-serif">{children}</span>
    </p>
  );
}

function cut(text: string): string {
  return text.length > PASSAGE_LIMIT ? `${text.slice(0, PASSAGE_LIMIT - 1)}…` : text;
}

function EntryText({ text, afterChanges }: { text: string | null; afterChanges: boolean }) {
  const { c } = useCopy();
  const [open, setOpen] = useState(false);
  const frame = afterChanges ? "mt-5 border-t border-rule-1 pt-4" : "";

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
      <p className="mt-2 text-[11.5px] italic leading-relaxed text-ink-3">
        {c.overview.entryNote}
        {afterChanges && ` ${c.overview.entryStartingPoint}`}
      </p>
    </section>
  );
}
