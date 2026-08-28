"use client";

import type { Bucket } from "../../lib/finding-query";
import { metaFor } from "../../lib/criteria";
import type { StartHerePlan as Plan } from "../../lib/start-here";
import { useCopy } from "../../i18n/use-copy";

export function StartHerePlan({
  plan,
  onBucket,
  onCriterion,
}: {
  plan: Plan | null;
  onBucket: (b: Bucket) => void;
  onCriterion: (criterion: string | null) => void;
}) {
  const { c, lang } = useCopy();
  if (plan === null) return null;
  const first = plan.firstCriterion;

  const steps: Array<{
    title: string;
    body: string;
    action: string;
    primary: boolean;
    onClick: () => void;
  }> = [];
  if (plan.safe > 0) {
    steps.push({
      title: c.startHere.safeStep,
      body: c.startHere.safeBody,
      action: c.startHere.safeAction(plan.safe),
      primary: true,
      onClick: () => onBucket("safe"),
    });
  }
  if (first !== null) {
    steps.push({
      title: c.startHere.criterionStep,
      body: c.startHere.criterionBody,
      action: c.startHere.criterionAction(metaFor(first.criterion, lang).label, first.count),
      primary: steps.length === 0,
      onClick: () => onCriterion(first.criterion),
    });
  }

  return (
    <div className="mx-4 mb-3 rounded-xl border border-rule-2 bg-surface-2 p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="u-label text-ink-2">{c.startHere.label}</h4>
        <span className="text-[11.5px] tabular-nums text-ink-3">{c.startHere.volume(plan.total, plan.criteria)}</span>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-ink-1">{c.startHere.lead(plan.safe > 0)}</p>

      {steps.map((step, i) => (
        <div key={step.title} className="mt-3">
          <span className="block text-[12px] font-medium text-ink-1">
            <span className="tabular-nums text-ink-3">{i + 1} · </span>
            {step.title}
          </span>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">{step.body}</p>
          <button
            type="button"
            onClick={step.onClick}
            className={
              step.primary
                ? "mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-ink transition-opacity duration-150 hover:opacity-90"
                : "mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-rule-2 bg-sheet px-3 py-1.5 text-[12px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface-2"
            }
          >
            {step.action}
          </button>
        </div>
      ))}

      <p className="mt-3 text-[11px] leading-relaxed text-ink-3">{c.startHere.caveat}</p>
    </div>
  );
}
