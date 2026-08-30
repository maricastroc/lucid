import type { Finding } from "@/lucid";
import { revisionBalance } from "./attribution";
import { criterionRank, findingId, isSafe } from "./criteria";
import { tally, type ReviewMarks } from "./review-marks";

export type StepState = "not-started" | "in-progress" | "done";

export interface RouteStep {
  readonly criterion: string;
  readonly count: number;
  readonly weight: number;
  readonly pending: number;
  readonly reviewed: number;
  readonly dismissed: number;
  readonly state: StepState;
}

export interface RouteStop {
  readonly step: RouteStep;
  readonly index: number;
}

export interface ReviewRoute {
  readonly steps: readonly RouteStep[];
  readonly found: number;
  readonly pending: number;
  readonly reviewed: number;
  readonly dismissed: number;
  readonly openSwaps: number;
  readonly stepsDone: number;
  readonly allDone: boolean;
  readonly entry: RouteStop | null;
  readonly open: RouteStop | null;
  readonly next: RouteStop | null;
  readonly resolved: number;
  readonly introduced: number;
}

const WEIGHT: Record<string, number> = { error: 3, warning: 1, info: 0.3 };

const round = (value: number): number => Math.round(value * 10) / 10;

export function planSteps(findings: readonly Finding[], marks: ReviewMarks): RouteStep[] {
  const byCriterion = new Map<string, { count: number; weight: number; pending: number; dismissed: number }>();

  for (const finding of findings) {
    const entry = byCriterion.get(finding.criterion) ?? { count: 0, weight: 0, pending: 0, dismissed: 0 };
    entry.count += 1;
    entry.weight += WEIGHT[finding.severity] ?? 0;
    const mark = marks[findingId(finding)];
    if (mark === undefined) entry.pending += 1;
    else if (mark.kind === "dismissed") entry.dismissed += 1;
    byCriterion.set(finding.criterion, entry);
  }

  return [...byCriterion.entries()]
    .map(([criterion, entry]) => ({
      criterion,
      count: entry.count,
      weight: round(entry.weight),
      pending: entry.pending,
      reviewed: entry.count - entry.pending - entry.dismissed,
      dismissed: entry.dismissed,
      state: (entry.pending === 0 ? "done" : entry.pending < entry.count ? "in-progress" : "not-started") as StepState,
    }))
    .sort((a, b) => b.weight - a.weight || criterionRank(a.criterion) - criterionRank(b.criterion));
}

function stopAt(steps: readonly RouteStep[], index: number): RouteStop | null {
  return index >= 0 && index < steps.length ? { step: steps[index], index } : null;
}

function firstPending(steps: readonly RouteStep[]): RouteStop | null {
  const index = steps.findIndex((step) => step.pending > 0);
  return stopAt(steps, index);
}

function pendingAfter(steps: readonly RouteStep[], index: number): RouteStop | null {
  for (let i = index + 1; i < steps.length; i++) if (steps[i].pending > 0) return { step: steps[i], index: i };
  for (let i = 0; i < index; i++) if (steps[i].pending > 0) return { step: steps[i], index: i };
  return null;
}

export function reviewRoute(
  findings: readonly Finding[],
  marks: ReviewMarks,
  openCriterion: string | null = null,
  original: readonly Finding[] | null = null,
): ReviewRoute {
  const steps = planSteps(findings, marks);
  const counts = tally(marks, findings);
  const openIndex = openCriterion === null ? -1 : steps.findIndex((step) => step.criterion === openCriterion);
  const open = stopAt(steps, openIndex);

  let resolved = 0;
  let introduced = 0;
  if (original !== null) {
    for (const row of revisionBalance(original, findings).byCriterion) {
      resolved += Math.max(0, row.before - row.after);
      introduced += Math.max(0, row.after - row.before);
    }
  }

  return {
    steps,
    found: findings.length,
    pending: counts.pending,
    reviewed: counts.seen,
    dismissed: counts.dismissed,
    openSwaps: findings.filter((f) => isSafe(f) && marks[findingId(f)] === undefined).length,
    stepsDone: steps.filter((step) => step.pending === 0).length,
    allDone: steps.length > 0 && steps.every((step) => step.pending === 0),
    entry: firstPending(steps) ?? stopAt(steps, 0),
    open,
    next: open === null ? null : pendingAfter(steps, open.index),
    resolved,
    introduced,
  };
}

export const routeStarted = (route: ReviewRoute): boolean => route.reviewed + route.dismissed > 0;
