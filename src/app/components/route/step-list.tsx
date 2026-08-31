"use client";

import { metaFor } from "../../lib/criteria";
import { routeStarted, type ReviewRoute, type RouteStep } from "../../lib/review-route";
import { useCopy } from "../../i18n/use-copy";
import type { UiLang } from "../../i18n/types";
import { ArrowRightIcon, CheckIcon } from "../icons";
import { Button } from "../ui/button";
import { Meter } from "./meter";

type RowTone = "done" | "entry" | "ahead";

function StepRow({
  step,
  index,
  tone,
  tag,
  lang,
  onOpen,
}: {
  step: RouteStep;
  index: number;
  tone: RowTone;
  tag: string | null;
  lang: UiLang;
  onOpen: () => void;
}) {
  const { c } = useCopy();
  const r = c.route;
  const label = metaFor(step.criterion, lang).label;
  const partial = tone !== "done" && step.count > step.pending;

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
        onClick={onOpen}
        aria-label={r.stepAction(label, step.count)}
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
          {partial && <Meter done={step.count - step.pending} total={step.count} className="mt-1 max-w-36" />}
        </span>

        {tag !== null && (
          <span className="u-sublabel shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[9px] text-accent-ink">
            {tag}
          </span>
        )}

        <span className={`shrink-0 tabular-nums text-[11.5px] ${tone === "done" ? "text-safe" : "text-ink-3"}`}>
          {tone === "done"
            ? r.stepDone
            : partial
              ? r.stepPartial(step.count - step.pending, step.count)
              : c.counts.pending(step.pending)}
        </span>
      </button>
    </li>
  );
}

export function StepList({
  route,
  onOpenStep,
  onSeeSwaps,
}: {
  route: ReviewRoute;
  onOpenStep: (criterion: string) => void;
  onSeeSwaps: () => void;
}) {
  const { c, lang } = useCopy();
  const r = c.route;
  const entry = route.entry;
  const entryIndex = entry === null ? -1 : entry.index;
  const started = routeStarted(route);

  return (
    <div className="px-4 pb-5 pt-4">
      <h3 className="u-label text-ink-3">{r.stepsLabel}</h3>

      <ol className="mt-2.5 flex flex-col gap-1">
        {route.steps.map((step, i) => (
          <StepRow
            key={step.criterion}
            step={step}
            index={i}
            tone={step.state === "done" ? "done" : i === entryIndex ? "entry" : "ahead"}
            tag={i === entryIndex && !route.allDone ? (started ? r.resumeTag : r.startTag) : null}
            lang={lang}
            onOpen={() => onOpenStep(step.criterion)}
          />
        ))}
      </ol>

      <div className="mt-3.5">
        {route.allDone ? (
          <div role="status" className="rounded-lg border border-safe-line bg-safe-weak px-3 py-2.5">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-0">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-safe text-on-safe">
                <CheckIcon className="size-3" />
              </span>
              {r.allDoneTitle}
            </p>
            <p className="mt-1 pl-7 text-[11.5px] tabular-nums text-ink-2">
              {r.allDoneCount(route.reviewed, route.steps.length)}
            </p>
          </div>
        ) : (
          entry !== null && (
            <Button
              variant="primary"
              size="lg"
              block
              onClick={() => onOpenStep(entry.step.criterion)}
              className="py-2.5 text-[12.5px]"
            >
              {started ? r.resume : r.begin}
              <ArrowRightIcon className="size-3.5" />
            </Button>
          )
        )}

        {route.openSwaps > 0 && (
          <p className="mt-2.5 text-[11.5px] text-ink-3">
            <span className="u-sublabel">{r.swapShortcutLabel}</span>{" "}
            <button
              type="button"
              onClick={onSeeSwaps}
              className="rounded text-[11.5px] text-ink-1 underline decoration-rule-2 underline-offset-2 transition-colors duration-150 hover:text-ink-0"
            >
              {r.swapShortcut(route.openSwaps)}
            </button>
          </p>
        )}

        <p className="mt-2.5 text-[11px] leading-relaxed text-ink-3">{r.orderCaveat}</p>
      </div>
    </div>
  );
}
