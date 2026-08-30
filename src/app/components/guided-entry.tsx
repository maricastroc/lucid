"use client";

import { metaFor } from "../lib/criteria";
import { firstStep } from "./guided-step";
import type { StartHerePlan } from "../lib/start-here";
import { useCopy } from "../i18n/use-copy";
import { ArrowRightIcon, CheckIcon } from "./icons";

export function GuidedEntry({
  plan,
  active,
  onStart,
}: {
  plan: StartHerePlan | null;
  active: boolean;
  onStart: (criterion: string) => void;
}) {
  const { c, lang } = useCopy();
  if (plan === null || active) return null;

  const s = c.startHere;
  const g = c.guided;
  const entry = firstStep(plan.steps);
  if (entry === null) return null;

  const entryIndex = plan.steps.indexOf(entry);
  const started = plan.steps.some((step) => step.reviewed > 0);
  const allDone = plan.steps.every((step) => step.pending === 0);
  const stepsDone = plan.steps.filter((step) => step.pending === 0).length;
  const reviewed = plan.steps.reduce((sum, step) => sum + step.reviewed, 0);

  return (
    <div
      className={`mt-5 rounded-xl border p-3 ${
        allDone ? "border-safe-line bg-safe-weak" : "border-accent-line bg-accent-weak"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="u-label text-ink-1">{s.label}</h3>
        {started && (
          <span className="shrink-0 text-[11px] tabular-nums text-ink-3">
            {s.stepsDone(stepsDone, plan.steps.length)}
          </span>
        )}
      </div>

      {allDone ? (
        <>
          <p className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-ink-0">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-safe text-on-safe">
              <CheckIcon className="size-3" />
            </span>
            {g.allDoneTitle}
          </p>
          <p className="mt-1 pl-7 text-[11.5px] tabular-nums text-ink-2">
            {g.allDoneCount(reviewed, plan.steps.length)}
          </p>
        </>
      ) : (
        <>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">{s.entryLead(plan.total)}</p>

          {started && (
            <div className="mt-2.5 flex items-center gap-2.5">
              <span className="block h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                <span
                  className="block h-full rounded-full bg-accent transition-[width] duration-300"
                  style={{ width: `${plan.total === 0 ? 0 : (reviewed / plan.total) * 100}%` }}
                />
              </span>
              <span className="shrink-0 tabular-nums text-[11.5px] text-ink-2">
                {s.routeReviewed(reviewed, plan.total)}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => onStart(entry.criterion)}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3.5 py-2.5 text-[12.5px] font-semibold text-accent-ink shadow-(--shadow-card) transition-opacity duration-150 hover:opacity-90"
          >
            {started ? s.resumeRoute : s.beginRoute}
            <ArrowRightIcon className="size-3.5" />
          </button>
          <p className="mt-1.5 text-center text-[11px] text-ink-3">
            {started
              ? s.resumeStepHint(entryIndex + 1, metaFor(entry.criterion, lang).label)
              : s.nextStepHint(entryIndex + 1, metaFor(entry.criterion, lang).label)}
          </p>
        </>
      )}
    </div>
  );
}
