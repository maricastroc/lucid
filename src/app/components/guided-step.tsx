"use client";

import { metaFor } from "../lib/criteria";
import type { StartHereStep } from "../lib/start-here";
import { useCopy } from "../i18n/use-copy";
import type { UiCopy } from "../i18n/copy";
import type { UiLang } from "../i18n/types";
import { ArrowRightIcon, CheckIcon, CloseIcon } from "./icons";
import { Button, IconButton } from "./ui/button";

export interface RouteStop {
  readonly step: StartHereStep;
  readonly index: number;
}

export interface GuidedRoute {
  readonly steps: readonly StartHereStep[];
  readonly current: StartHereStep;
  readonly index: number;
  readonly next: RouteStop | null;
  readonly reviewed: number;
  readonly total: number;
  readonly stepsDone: number;
  readonly allDone: boolean;
}

export function firstStep(steps: readonly StartHereStep[]): StartHereStep | null {
  return steps.find((step) => step.pending > 0) ?? steps[0] ?? null;
}

function pendingFrom(steps: readonly StartHereStep[], index: number): RouteStop | null {
  for (let i = index + 1; i < steps.length; i++) if (steps[i].pending > 0) return { step: steps[i], index: i };
  for (let i = 0; i < index; i++) if (steps[i].pending > 0) return { step: steps[i], index: i };
  return null;
}

export function routeFor(steps: readonly StartHereStep[], criterion: string | null): GuidedRoute | null {
  if (criterion === null) return null;
  const index = steps.findIndex((step) => step.criterion === criterion);
  if (index === -1) return null;
  return {
    steps,
    current: steps[index],
    index,
    next: pendingFrom(steps, index),
    reviewed: steps.reduce((sum, step) => sum + step.reviewed, 0),
    total: steps.reduce((sum, step) => sum + step.count, 0),
    stepsDone: steps.filter((step) => step.pending === 0).length,
    allDone: steps.every((step) => step.pending === 0),
  };
}

function Meter({
  done,
  total,
  tone,
  shape = "pill",
  className = "",
}: {
  done: number;
  total: number;
  tone: "accent" | "safe";
  shape?: "pill" | "rule";
  className?: string;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 1000) / 10;
  const track = shape === "rule" ? "h-[3px]" : "h-1.5 rounded-full";
  const fill = shape === "rule" ? "" : "rounded-full";
  return (
    <span className={`block overflow-hidden bg-surface-3 ${track} ${className}`} aria-hidden>
      <span
        className={`block h-full transition-[width] duration-300 ease-(--ease-settle) ${fill} ${
          tone === "safe" ? "bg-safe" : "bg-accent"
        }`}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

function StepTrail({
  route,
  onGo,
  c,
  lang,
  size = "regular",
}: {
  route: GuidedRoute;
  onGo: (criterion: string) => void;
  c: UiCopy;
  lang: UiLang;
  size?: "regular" | "compact";
}) {
  const g = c.guided;
  const box = size === "compact" ? "size-5 text-[10px]" : "size-6 text-[11px]";
  const nextIndex = route.next?.index ?? -1;

  return (
    <ol className="flex flex-wrap items-center gap-1" aria-label={g.trailLabel}>
      {route.steps.map((step, i) => {
        const here = i === route.index;
        const label = metaFor(step.criterion, lang).label;
        const done = step.state === "done";

        const tone = here
          ? "bg-accent text-accent-ink ring-2 ring-accent-line ring-offset-1 ring-offset-surface-2"
          : done
            ? "bg-safe-weak text-safe"
            : i === nextIndex
              ? "border border-accent-line bg-accent-weak text-accent"
              : "border border-rule-2 bg-transparent text-ink-3";

        const name = g.trailStep(i + 1, route.steps.length, label, g.states[step.state]);

        return (
          <li key={step.criterion}>
            <button
              type="button"
              onClick={() => onGo(step.criterion)}
              aria-current={here ? "step" : undefined}
              title={name}
              aria-label={name}
              className={`flex ${box} items-center justify-center rounded-md font-semibold tabular-nums transition-all duration-150 hover:brightness-105 ${tone}`}
            >
              {done ? <CheckIcon className="size-3" /> : i + 1}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

interface Props {
  route: GuidedRoute;
  onGo: (criterion: string) => void;
  onLeave: () => void;
  onOpen: () => void;
  compact?: boolean;
}

export function GuidedStepHeader({ route, onGo, onLeave, onOpen, compact = false }: Props) {
  const { c, lang } = useCopy();
  const g = c.guided;
  const step = route.current;
  const label = metaFor(step.criterion, lang).label;
  const finished = step.pending === 0;
  const position = g.stepOf(route.index + 1, route.steps.length);

  if (compact) {
    return (
      <div className="shrink-0 border-b border-rule-1 bg-surface-2">
        <div className="flex items-center gap-2.5 px-4 py-2">
          <StepTrail route={route} onGo={onGo} c={c} lang={lang} size="compact" />
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-2">
            <span className="tabular-nums text-ink-3">{position}</span>
            <span className="text-ink-dim"> · </span>
            <span className="font-medium text-ink-1">{label}</span>
          </span>
          <span key={step.reviewed} className="fade-in shrink-0 tabular-nums text-[11px] text-ink-2" aria-live="polite">
            {g.withinShort(step.reviewed, step.count)}
          </span>
          <IconButton label={g.leave} size="sm" onClick={onLeave}>
            <CloseIcon className="size-3.5" />
          </IconButton>
        </div>
        <Meter done={step.reviewed} total={step.count} tone={finished ? "safe" : "accent"} shape="rule" />
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-rule-1 bg-surface-2 px-4 pb-3 pt-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="u-sublabel min-w-0 truncate text-ink-3">
          {g.routeLabel}
          <span className="text-ink-dim"> · </span>
          <span className="tabular-nums text-ink-2">{position}</span>
        </span>
        {route.allDone ? null : (
          <Button variant="ghost" size="xs" shape="soft" onClick={onLeave} className="shrink-0">
            <CloseIcon className="size-3" />
            {g.leave}
          </Button>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <StepTrail route={route} onGo={onGo} c={c} lang={lang} />
        <span
          className="ml-auto shrink-0 tabular-nums text-[11px] text-ink-3"
          title={g.overallTitle(route.reviewed, route.total)}
        >
          {g.overall(route.reviewed, route.total)}
        </span>
      </div>
      <Meter
        done={route.reviewed}
        total={route.total}
        tone={route.allDone ? "safe" : "accent"}
        shape="rule"
        className="mt-2"
      />

      {route.allDone ? (
        <div role="status" className="mt-3 rounded-xl border border-safe-line bg-safe-weak p-3">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink-0">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-safe text-(--on-safe)">
              <CheckIcon className="size-3.5" />
            </span>
            {g.allDoneTitle}
          </p>
          <p className="mt-1.5 text-[12px] tabular-nums text-ink-1">
            {g.allDoneCount(route.reviewed, route.steps.length)}
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">{g.allDone}</p>
          <Button variant="primary" onClick={onLeave} className="mt-2.5">
            {g.leaveDone}
            <ArrowRightIcon className="size-3.5" />
          </Button>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-3">{g.allDoneNext}</p>
        </div>
      ) : finished ? (
        <div role="status" className="mt-3 rounded-xl border border-safe-line bg-safe-weak p-3">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-0">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-safe text-(--on-safe)">
              <CheckIcon className="size-3" />
            </span>
            {g.finishedTitle(label)}
          </p>
          <p className="mt-1 pl-7 text-[12px] tabular-nums text-ink-2">{g.finishedCount(step.reviewed)}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-7">
            {route.next !== null && (
              <Button variant="primary" onClick={() => onGo(route.next!.step.criterion)}>
                {g.advance(route.next.index + 1, metaFor(route.next.step.criterion, lang).label)}
                <ArrowRightIcon className="size-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpen}
              className="underline decoration-rule-2 underline-offset-2"
            >
              {g.reviewAgain}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-[15px] font-semibold leading-tight text-ink-0">{label}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{g.todo(step.pending)}</p>

          <div className="mt-2.5 flex items-center gap-2.5">
            <Meter done={step.reviewed} total={step.count} tone="accent" className="min-w-0 flex-1" />
            <span
              key={step.reviewed}
              className="fade-in shrink-0 tabular-nums text-[11.5px] text-ink-2"
              aria-live="polite"
            >
              {g.within(step.reviewed, step.count)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Button variant="primary" size="lg" onClick={onOpen}>
              {step.reviewed === 0 ? g.start : g.resume}
              <ArrowRightIcon className="size-3.5" />
            </Button>
            {route.next !== null && (
              <span className="min-w-0 truncate text-[11.5px] text-ink-3">
                {g.nextUp(route.next.index + 1, metaFor(route.next.step.criterion, lang).label)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
