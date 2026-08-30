"use client";

import { useState } from "react";
import type { BriefingCheck, BriefingCoverage, ReaderBriefing } from "@/lucid";
import type { OccurrenceCursor } from "../lib/occurrence-cursor";
import { useCopy } from "../i18n/use-copy";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { Button, IconButton } from "./ui/button";

interface Props {
  briefing: ReaderBriefing;
  check: BriefingCheck;
  cursor: OccurrenceCursor | null;
  index: number;
  onChange: (briefing: ReaderBriefing) => void;
  onSelectOccurrence: (expression: string, index: number) => void;
  onStepOccurrence: (delta: number) => void;
}

export function BriefingPanel({
  briefing,
  check,
  cursor,
  index,
  onChange,
  onSelectOccurrence,
  onStepOccurrence,
}: Props) {
  const { c } = useCopy();
  const b = c.briefing;
  const [draft, setDraft] = useState("");

  const addExpression = () => {
    const trimmed = draft.trim();
    if (trimmed === "") return;
    if (!briefing.mustFind.includes(trimmed)) onChange({ ...briefing, mustFind: [...briefing.mustFind, trimmed] });
    setDraft("");
  };

  const removeExpression = (expression: string) =>
    onChange({ ...briefing, mustFind: briefing.mustFind.filter((item) => item !== expression) });

  return (
    <div className="px-4 pb-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[13.5px] font-semibold text-ink-0">{b.label}</h3>
        <span className="rounded-[3px] bg-safe-weak px-1.5 py-px text-[10px] tracking-wide text-safe">{b.chip}</span>
      </div>

      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">{b.lead}</p>

      <div className="mt-3.5">
        <span className="block text-[12.5px] font-medium text-ink-1">{b.mustFindLabel}</span>
        <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-3">{b.mustFindHint}</span>
        <div className="mt-1.5 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addExpression();
              }
            }}
            placeholder={b.mustFindPlaceholder}
            className="min-w-0 flex-1 rounded-lg border border-rule-2 bg-sheet px-2.5 py-2 text-[13px] text-ink-0 placeholder:text-ink-dim focus:border-accent focus:outline-none"
          />
          <Button variant="outline" onClick={addExpression} className="shrink-0">
            {b.addExpression}
          </Button>
        </div>
      </div>

      {check.coverage.length > 0 && (
        <div className="mt-4">
          <span className="u-label text-ink-3">{b.presenceLabel}</span>
          <ul className="mt-2 flex flex-col gap-1">
            {check.coverage.map((item) => (
              <ExpressionRow
                key={item.expression}
                item={item}
                active={cursor?.expression === item.expression}
                index={index}
                onSelect={() => onSelectOccurrence(item.expression, 0)}
                onStep={onStepOccurrence}
                onRemove={() => removeExpression(item.expression)}
              />
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">{b.literalCaveat}</p>
    </div>
  );
}

function ExpressionRow({
  item,
  active,
  index,
  onSelect,
  onStep,
  onRemove,
}: {
  item: BriefingCoverage;
  active: boolean;
  index: number;
  onSelect: () => void;
  onStep: (delta: number) => void;
  onRemove: () => void;
}) {
  const { c } = useCopy();
  const b = c.briefing;
  const total = item.occurrences.length;
  const found = total > 0;

  return (
    <li
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2 py-1.5 ${
        active ? "bg-accent-weak" : "hover:bg-surface-2"
      }`}
    >
      {found ? (
        <button
          type="button"
          aria-pressed={active}
          aria-label={b.showOccurrences(item.expression, total)}
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-baseline gap-2 rounded-md text-left"
        >
          <span className="min-w-0 truncate text-[12.5px] text-ink-0">“{item.expression}”</span>
          <span className="shrink-0 tabular-nums text-[11.5px] text-ink-3">{b.occurrences(total)}</span>
        </button>
      ) : (
        <span className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="min-w-0 truncate text-[12.5px] text-ink-2">“{item.expression}”</span>
          <span className="shrink-0 text-[11.5px] text-ink-3">{b.notFound}</span>
        </span>
      )}

      {found && active && total > 1 && (
        <span
          role="group"
          aria-label={b.occurrenceNav(item.expression)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              e.stopPropagation();
              onStep(-1);
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              e.stopPropagation();
              onStep(1);
            }
          }}
          className="flex shrink-0 items-center gap-0.5 rounded-full border border-rule-2 bg-sheet px-0.5 py-0.5"
        >
          <StepButton label={b.prevOccurrence(item.expression)} onClick={() => onStep(-1)}>
            <ChevronLeftIcon className="size-3.5" />
          </StepButton>
          <span role="status" aria-live="polite" className="px-1 text-[11.5px] tabular-nums text-ink-1">
            {b.occurrencePosition(index + 1, total)}
          </span>
          <StepButton label={b.nextOccurrence(item.expression)} onClick={() => onStep(1)}>
            <ChevronRightIcon className="size-3.5" />
          </StepButton>
        </span>
      )}

      <Button
        variant="ghost"
        size="xs"
        shape="soft"
        onClick={onRemove}
        aria-label={b.removeNamed(item.expression)}
        className="shrink-0"
      >
        {c.common.remove}
      </Button>
    </li>
  );
}

function StepButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <IconButton label={label} size="sm" shape="pill" onClick={onClick}>
      {children}
    </IconButton>
  );
}
