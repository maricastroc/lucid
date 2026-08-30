"use client";

import type { Bucket } from "../../lib/finding-query";
import { metaFor } from "../../lib/criteria";
import { firstStep } from "../guided-step";
import type { StartHereStep } from "../../lib/start-here";
import type { StartHerePlan as Plan } from "../../lib/start-here";
import { useCopy } from "../../i18n/use-copy";
import type { UiLang } from "../../i18n/types";
import { ArrowRightIcon, CheckIcon } from "../icons";

type RowTone = "done" | "entry" | "ahead";

function StepRow({
  step,
  index,
  tone,
  tag,
  lang,
  onStart,
}: {
  step: StartHereStep;
  index: number;
  tone: RowTone;
  tag: string | null;
  lang: UiLang;
  onStart: () => void;
}) {
  const { c } = useCopy();
  const s = c.startHere;
  const label = metaFor(step.criterion, lang).label;
  const partial = tone !== "done" && step.reviewed > 0;

  const frame =
    tone === "entry"
      ? "border-accent-line bg-accent-weak"
      : tone === "done"
        ? "border-transparent bg-transparent hover:border-rule-1 hover:bg-surface-3/50"
        : "border-transparent bg-sheet hover:border-rule-2 hover:bg-surface-3";

  const badge =
    tone === "entry"
      ? "bg-accent text-accent-ink"
      : tone === "done"
        ? "bg-safe-weak text-safe"
        : "border border-rule-2 text-ink-3";

  return (
    <li>
      <button
        type="button"
        onClick={onStart}
        aria-label={s.criterionAction(label, step.count)}
        className={`focus-inset flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors duration-150 ${frame}`}
      >
        <span
          className={`flex size-5 shrink-0 items-center justify-center rounded-md text-[10.5px] font-semibold tabular-nums ${badge}`}
        >
          {tone === "done" ? <CheckIcon className="size-3" /> : index + 1}
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[12.5px] ${
              tone === "entry" ? "font-semibold text-ink-0" : tone === "done" ? "text-ink-2" : "font-medium text-ink-1"
            }`}
          >
            {label}
          </span>
          {partial && (
            <span className="mt-1 block h-1 w-full max-w-[9rem] overflow-hidden rounded-full bg-surface-3" aria-hidden>
              <span
                className="block h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${(step.reviewed / step.count) * 100}%` }}
              />
            </span>
          )}
        </span>

        {tag !== null && (
          <span className="u-sublabel shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[9px] text-accent-ink">
            {tag}
          </span>
        )}

        <span className={`shrink-0 tabular-nums text-[11.5px] ${tone === "done" ? "text-safe" : "text-ink-3"}`}>
          {tone === "done"
            ? s.stepDone
            : partial
              ? s.stepPartial(step.reviewed, step.count)
              : s.stepPending(step.pending)}
        </span>
      </button>
    </li>
  );
}

export function StartHerePlan({
  plan,
  onBucket,
  onStart,
}: {
  plan: Plan | null;
  onBucket: (b: Bucket) => void;
  onStart: (criterion: string) => void;
}) {
  const { c, lang } = useCopy();
  if (plan === null) return null;

  const s = c.startHere;
  const g = c.guided;
  const entry = firstStep(plan.steps);
  const entryIndex = entry === null ? -1 : plan.steps.indexOf(entry);
  const started = plan.steps.some((step) => step.reviewed > 0);
  const allDone = plan.steps.every((step) => step.pending === 0);
  const stepsDone = plan.steps.filter((step) => step.pending === 0).length;
  const reviewed = plan.steps.reduce((sum, step) => sum + step.reviewed, 0);

  return (
    <div className="mx-4 mb-3 overflow-hidden rounded-xl border border-rule-2 bg-surface-2 shadow-(--shadow-card)">
      <div className="px-3.5 pb-3 pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="u-label text-ink-1">{s.label}</h4>
          <span className="shrink-0 text-[11.5px] tabular-nums text-ink-3">{s.volume(plan.total, plan.criteria)}</span>
        </div>

        {!allDone && <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">{s.lead(plan.safe > 0)}</p>}

        {started && (
          <>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="block h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                <span
                  className={`block h-full rounded-full transition-[width] duration-300 ${allDone ? "bg-safe" : "bg-accent"}`}
                  style={{ width: `${plan.total === 0 ? 0 : (reviewed / plan.total) * 100}%` }}
                />
              </span>
              <span className="shrink-0 tabular-nums text-[11.5px] text-ink-2">
                {s.routeReviewed(reviewed, plan.total)}
              </span>
            </div>
            <p className="mt-1 text-right text-[11px] tabular-nums text-ink-3">
              {s.stepsDone(stepsDone, plan.steps.length)}
            </p>
          </>
        )}
      </div>

      <ol className="flex flex-col gap-1 px-3.5">
        {plan.steps.map((step, i) => (
          <StepRow
            key={step.criterion}
            step={step}
            index={i}
            tone={step.state === "done" ? "done" : i === entryIndex ? "entry" : "ahead"}
            tag={i === entryIndex && !allDone ? (started ? s.resumeTag : s.startTag) : null}
            lang={lang}
            onStart={() => onStart(step.criterion)}
          />
        ))}
      </ol>

      <div className="px-3.5 pb-3.5 pt-3">
        {allDone ? (
          <div className="rounded-lg border border-safe-line bg-safe-weak px-3 py-2.5">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-0">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-safe text-(--on-safe)">
                <CheckIcon className="size-3" />
              </span>
              {g.allDoneTitle}
            </p>
            <p className="mt-1 pl-7 text-[11.5px] tabular-nums text-ink-2">
              {g.allDoneCount(reviewed, plan.steps.length)}
            </p>
          </div>
        ) : (
          entry !== null && (
            <button
              type="button"
              onClick={() => onStart(entry.criterion)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3.5 py-2.5 text-[12.5px] font-semibold text-accent-ink shadow-(--shadow-card) transition-opacity duration-150 hover:opacity-90"
            >
              {started
                ? s.resumeAt(entryIndex + 1, metaFor(entry.criterion, lang).label)
                : s.beginAt(entryIndex + 1, metaFor(entry.criterion, lang).label)}
              <ArrowRightIcon className="size-3.5" />
            </button>
          )
        )}

        {plan.safe > 0 && (
          <p className="mt-2.5 text-[11.5px] text-ink-3">
            <span className="u-sublabel">{s.shortcutLabel}</span>{" "}
            <button
              type="button"
              onClick={() => onBucket("safe")}
              className="rounded text-[11.5px] text-ink-1 underline decoration-rule-2 underline-offset-2 transition-colors duration-150 hover:text-ink-0"
            >
              {s.safeAction(plan.safe)}
            </button>
          </p>
        )}

        <p className="mt-2.5 text-[11px] leading-relaxed text-ink-3">{s.caveat}</p>
      </div>
    </div>
  );
}
