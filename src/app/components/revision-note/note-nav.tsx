"use client";

import type { ReviewMark } from "../../lib/review-marks";
import { metaFor } from "../../lib/criteria";
import { useCopy } from "../../i18n/use-copy";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "../icons";

export interface GuidedOccurrence {
  readonly willFinishStep: boolean;
}

export function NoteNav({
  index,
  total,
  criterion,
  mark,
  guided,
  onMark,
  onPrev,
  onNext,
  onBackToList,
  onBackToOverview,
}: {
  index: number;
  total: number;
  criterion: string;
  mark: ReviewMark | null;
  guided: GuidedOccurrence | null;
  onMark: (mark: ReviewMark | null) => void;
  onPrev: () => void;
  onNext: () => void;
  onBackToList: () => void;
  onBackToOverview: () => void;
}) {
  const { c, lang } = useCopy();
  const label = metaFor(criterion, lang).label;
  const g = c.guided;

  if (guided !== null) {
    const seen = mark === "seen";
    return (
      <div className="shrink-0 border-b border-rule-1">
        <div className="flex h-10 items-center gap-1 px-2.5 text-[11.5px]">
          <button
            type="button"
            onClick={onBackToList}
            className="row-hit inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-accent transition-colors duration-150 hover:bg-accent-weak"
          >
            <ChevronLeftIcon className="size-3.5" />
            {g.backToStep}
          </button>
          <span className="ml-auto shrink-0 tabular-nums text-ink-2">{g.occurrenceOf(index, total)}</span>
          <IconBtn label={c.note.navPrev} onClick={onPrev}>
            <ChevronLeftIcon className="size-4" />
          </IconBtn>
          <IconBtn label={c.note.navNext} onClick={onNext}>
            <ChevronRightIcon className="size-4" />
          </IconBtn>
        </div>

        <div className="flex items-center gap-2 border-t border-rule-1 px-2.5 py-2">
          {seen ? (
            <>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-safe-weak px-2.5 py-1.5 text-[12px] font-medium text-safe">
                <CheckIcon className="size-3.5" />
                {g.seenChip}
              </span>
              <button
                type="button"
                onClick={() => onMark(null)}
                className="shrink-0 rounded-full px-2 py-1.5 text-[11.5px] text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0"
              >
                {c.revisionList.unmark}
              </button>
              <button
                type="button"
                onClick={onNext}
                className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12px] font-semibold text-accent-ink transition-opacity duration-150 hover:opacity-90"
              >
                {g.nextOccurrence}
                <ChevronRightIcon className="size-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onMark("seen")}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12.5px] font-semibold text-accent-ink shadow-(--shadow-card) transition-opacity duration-150 hover:opacity-90"
            >
              <CheckIcon className="size-3.5" />
              {guided.willFinishStep ? g.markAndFinish : g.markAndAdvance}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-rule-1">
      <div className="flex h-10 items-center gap-1 px-2.5 text-[11.5px]">
        <button
          type="button"
          onClick={onBackToOverview}
          className="rounded-md px-1.5 py-1 text-ink-3 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-1"
        >
          {c.note.crumbAll}
        </button>
        <ChevronRightIcon className="size-3 shrink-0 text-ink-dim" />
        <button
          type="button"
          onClick={onBackToList}
          className="row-hit min-w-0 truncate rounded-md px-1.5 py-1 font-medium text-accent transition-colors duration-150 hover:bg-accent-weak"
          title={c.note.crumbBackTo(label)}
        >
          {label} <span className="tabular-nums opacity-70">{total}</span>
        </button>
        <ChevronRightIcon className="size-3 shrink-0 text-ink-dim" />
        <span className="shrink-0 tabular-nums text-ink-2">
          {index} <span className="text-ink-3">{c.note.navOf}</span> {total}
        </span>
      </div>

      <div className="flex h-11 items-center justify-between gap-2 border-t border-rule-1 px-2.5">
        <div className="flex items-center gap-0.5">
          <IconBtn label={c.note.navPrev} onClick={onPrev}>
            <ChevronLeftIcon className="size-4" />
          </IconBtn>
          <IconBtn label={c.note.navNext} onClick={onNext}>
            <ChevronRightIcon className="size-4" />
          </IconBtn>
          <button
            type="button"
            onClick={onBackToList}
            className="ml-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0"
          >
            <ChevronLeftIcon className="size-3.5" />
            {c.note.backToList}
          </button>
        </div>
        <button
          type="button"
          aria-pressed={mark === "seen"}
          onClick={() => onMark(mark === "seen" ? null : "seen")}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] transition-colors duration-150 ${
            mark === "seen" ? "bg-surface-3 text-ink-1" : "text-ink-2 hover:bg-surface-2 hover:text-ink-0"
          }`}
        >
          <CheckIcon className="size-3.5" />
          {mark === "seen" ? c.revisionList.unmark : c.revisionList.markSeen}
        </button>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0"
    >
      {children}
    </button>
  );
}
