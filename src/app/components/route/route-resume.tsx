"use client";

import { metaFor } from "../../lib/criteria";
import { routeStarted, type ReviewRoute } from "../../lib/review-route";
import { useCopy } from "../../i18n/use-copy";
import { ArrowRightIcon, CheckIcon, RouteIcon } from "../icons";
import { Button } from "../ui/button";
import { Meter } from "./meter";

export function RouteResume({
  route,
  onContinue,
  onOpenReview,
}: {
  route: ReviewRoute;
  onContinue: (criterion: string) => void;
  onOpenReview: () => void;
}) {
  const { c, lang } = useCopy();
  const r = c.route;
  if (route.steps.length === 0) return null;

  const started = routeStarted(route);
  const walked = route.reviewed + route.dismissed;

  if (route.allDone) {
    return (
      <div role="status" className="rounded-xl border border-safe-line bg-safe-weak p-3.5">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-ink-0">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-safe text-on-safe">
            <CheckIcon className="size-3.5" />
          </span>
          {r.allDoneTitle}
        </p>
        <p className="mt-1.5 pl-8 text-[12px] tabular-nums text-ink-1">
          {r.allDoneCount(route.reviewed, route.steps.length)}
        </p>
        <p className="mt-1.5 pl-8 text-[11.5px] leading-relaxed text-ink-2">{r.allDoneBody}</p>
        <Button variant="outline" size="lg" onClick={onOpenReview} className="mt-3 ml-8">
          {r.backToReview}
          <ArrowRightIcon className="size-3.5" />
        </Button>
      </div>
    );
  }

  const entry = route.entry;
  return (
    <div className="rounded-xl border border-accent-line bg-accent-weak p-3.5">
      <h3 className="u-label flex items-center gap-1.5 text-ink-1">
        <RouteIcon className="size-3.5 text-accent" />
        {r.label}
      </h3>

      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-1">{r.idleLead(route.found, route.steps.length)}</p>

      {started && (
        <div className="mt-3">
          <Meter done={walked} total={route.found} tone="accent" />
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-[11.5px] tabular-nums text-ink-2">
            <span>{r.routeProgress(walked, route.found)}</span>
            <span aria-hidden className="text-ink-dim">
              ·
            </span>
            <span>{c.counts.stepsDone(route.stepsDone, route.steps.length)}</span>
          </p>
        </div>
      )}

      {entry !== null && (
        <>
          <Button
            variant="primary"
            size="lg"
            block
            onClick={() => onContinue(entry.step.criterion)}
            className="mt-3 py-2.5"
          >
            {started ? r.resume : r.begin}
            <ArrowRightIcon className="size-3.5" />
          </Button>
          <p className="mt-1.5 text-center text-[11px] text-ink-2">
            {started
              ? r.resumeHint(entry.index + 1, metaFor(entry.step.criterion, lang).label)
              : r.beginHint(entry.index + 1, metaFor(entry.step.criterion, lang).label)}
          </p>
        </>
      )}
    </div>
  );
}
