"use client";

import { metaFor } from "../../lib/criteria";
import type { ReviewRoute } from "../../lib/review-route";
import { useCopy } from "../../i18n/use-copy";
import { ArrowRightIcon, CheckIcon, CloseIcon } from "../icons";
import { Button, IconButton } from "../ui/button";
import { Meter } from "./meter";
import { StepTrail } from "./step-trail";

interface Props {
  route: ReviewRoute;
  onGo: (criterion: string) => void;
  onLeave: () => void;
  onOpen: () => void;
  compact?: boolean;
}

export function RouteHeader({ route, onGo, onLeave, onOpen, compact = false }: Props) {
  const { c, lang } = useCopy();
  const r = c.route;
  const open = route.open;
  if (open === null) return null;

  const step = open.step;
  const label = metaFor(step.criterion, lang).label;
  const stepDone = step.pending === 0;
  const stepWalked = step.count - step.pending;
  const routeWalked = route.reviewed + route.dismissed;
  const position = r.stepOf(open.index + 1, route.steps.length);

  if (compact) {
    return (
      <div className="shrink-0 border-b border-rule-1 bg-surface-2">
        <div className="flex items-center gap-2.5 px-4 py-2">
          <StepTrail route={route} onGo={onGo} lang={lang} size="compact" />
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-2">
            <span className="tabular-nums text-ink-3">{position}</span>
            <span className="text-ink-dim"> · </span>
            <span className="font-medium text-ink-1">{label}</span>
          </span>
          <span key={stepWalked} className="fade-in shrink-0 tabular-nums text-[11px] text-ink-2" aria-live="polite">
            {r.stepProgress(stepWalked, step.count)}
          </span>
          <IconButton label={r.leave} size="sm" onClick={onLeave}>
            <CloseIcon className="size-3.5" />
          </IconButton>
        </div>
        <Meter done={stepWalked} total={step.count} tone={stepDone ? "safe" : "accent"} size="rule" />
      </div>
    );
  }

  return (
    <div className="border-b border-rule-1 bg-surface-2 px-4 pb-3.5 pt-3">
      <div className="flex items-center justify-between gap-3">
        <span className="u-sublabel min-w-0 truncate text-ink-3">
          {r.label}
          <span className="text-ink-dim"> · </span>
          <span className="tabular-nums text-ink-2">{position}</span>
        </span>
        {!route.allDone && (
          <Button variant="ghost" size="xs" shape="soft" onClick={onLeave} className="shrink-0">
            <CloseIcon className="size-3" />
            {r.leave}
          </Button>
        )}
      </div>

      <div className="mt-2">
        <StepTrail route={route} onGo={onGo} lang={lang} />
      </div>

      {route.allDone ? (
        <div role="status" className="mt-3 rounded-xl border border-safe-line bg-safe-weak px-3.5 py-3">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink-0">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-safe text-on-safe">
              <CheckIcon className="size-3.5" />
            </span>
            {r.allDoneTitle}
          </p>
          <p className="mt-1.5 pl-8 text-[12px] tabular-nums text-ink-1">
            {r.allDoneCount(route.reviewed, route.steps.length)}
          </p>
          <p className="mt-1 pl-8 text-[11.5px] leading-relaxed text-ink-2">{r.allDoneBody}</p>
          <Button variant="primary" onClick={onLeave} className="mt-2.5 ml-8">
            {r.leaveDone}
            <ArrowRightIcon className="size-3.5" />
          </Button>
          <p className="mt-2 pl-8 text-[11px] leading-relaxed text-ink-3">{r.allDoneNext}</p>
        </div>
      ) : stepDone ? (
        <div role="status" className="mt-3 rounded-xl border border-safe-line bg-safe-weak px-3.5 py-3">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-0">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-safe text-on-safe">
              <CheckIcon className="size-3" />
            </span>
            {r.finishedTitle(label)}
          </p>
          <p className="mt-1 pl-7 text-[12px] tabular-nums text-ink-2">
            {r.finishedCount(step.reviewed, step.dismissed)}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-7">
            {route.next !== null && (
              <Button variant="primary" onClick={() => onGo(route.next!.step.criterion)}>
                {r.advance(route.next.index + 1, metaFor(route.next.step.criterion, lang).label)}
                <ArrowRightIcon className="size-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpen}
              className="underline decoration-rule-2 underline-offset-2"
            >
              {r.reviewAgain}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-[15px] font-semibold leading-tight text-ink-0">{label}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{r.stepPending(step.pending)}</p>

          <div className="mt-2.5 flex items-center gap-2.5">
            <Meter done={stepWalked} total={step.count} className="min-w-0 flex-1" />
            <span
              key={stepWalked}
              className="fade-in shrink-0 tabular-nums text-[11.5px] text-ink-2"
              aria-live="polite"
            >
              {r.stepProgress(stepWalked, step.count)}
            </span>
          </div>
          <p className="mt-1 text-right text-[11px] tabular-nums text-ink-3">
            {r.routeProgress(routeWalked, route.found)}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Button variant="primary" size="lg" onClick={onOpen}>
              {stepWalked === 0 ? r.openStep : r.resumeStep}
              <ArrowRightIcon className="size-3.5" />
            </Button>
            {route.next !== null && (
              <span className="min-w-0 truncate text-[11.5px] text-ink-3">
                {r.nextUp(route.next.index + 1, metaFor(route.next.step.criterion, lang).label)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
