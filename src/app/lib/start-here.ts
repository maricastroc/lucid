import type { Finding } from "@/lucid";
import { revisionBalance } from "./attribution";
import { criterionRank, findingId, isSafe } from "./criteria";
import { tally, type ReviewMarks } from "./review-marks";

export const START_HERE_MIN_FINDINGS = 10;

export type StepState = "not-started" | "in-progress" | "done";

export interface StartHereStep {
  readonly criterion: string;
  readonly count: number;
  readonly weight: number;
  readonly pending: number;
  readonly reviewed: number;
  readonly state: StepState;
}

export interface ReviewProgress {
  readonly total: number;
  readonly pending: number;
  readonly seen: number;
  readonly dismissed: number;
  readonly resolved: number;
  readonly introduced: number;
}

export interface StartHerePlan {
  readonly total: number;
  readonly criteria: number;
  readonly safe: number;
  readonly human: number;
  readonly firstCriterion: StartHereStep | null;
  readonly heaviest: readonly StartHereStep[];
  readonly steps: readonly StartHereStep[];
  readonly progress: ReviewProgress;
}

const WEIGHT: Record<string, number> = { error: 3, warning: 1, info: 0.3 };

const round = (value: number): number => Math.round(value * 10) / 10;

export function progressOf(
  current: readonly Finding[],
  marks: ReviewMarks,
  original: readonly Finding[] | null,
): ReviewProgress {
  const marked = tally(marks, current);
  let resolved = 0;
  let introduced = 0;

  if (original !== null) {
    for (const row of revisionBalance(original, current).byCriterion) {
      resolved += Math.max(0, row.before - row.after);
      introduced += Math.max(0, row.after - row.before);
    }
  }

  return {
    total: current.length,
    pending: marked.pending,
    seen: marked.seen,
    dismissed: marked.dismissed,
    resolved,
    introduced,
  };
}

export function planSteps(findings: readonly Finding[], marks: ReviewMarks): StartHereStep[] {
  const byCriterion = new Map<string, { count: number; weight: number; pending: number }>();

  for (const finding of findings) {
    const entry = byCriterion.get(finding.criterion) ?? { count: 0, weight: 0, pending: 0 };
    entry.count += 1;
    entry.weight += WEIGHT[finding.severity] ?? 0;
    if (marks[findingId(finding)] === undefined) entry.pending += 1;
    byCriterion.set(finding.criterion, entry);
  }

  return [...byCriterion.entries()]
    .map(([criterion, entry]) => ({
      criterion,
      count: entry.count,
      weight: round(entry.weight),
      pending: entry.pending,
      reviewed: entry.count - entry.pending,
      state: (entry.pending === 0 ? "done" : entry.pending < entry.count ? "in-progress" : "not-started") as StepState,
    }))
    .sort((a, b) => b.weight - a.weight || criterionRank(a.criterion) - criterionRank(b.criterion));
}

export function heaviestCriteria(findings: readonly Finding[], marks: ReviewMarks, limit: number): StartHereStep[] {
  return planSteps(findings, marks)
    .filter((step) => step.pending > 0)
    .slice(0, limit);
}

export function startHerePlan(
  allFindings: readonly Finding[],
  marks: ReviewMarks,
  _filtered: boolean,
  original: readonly Finding[] | null = null,
): StartHerePlan | null {
  if (allFindings.length < START_HERE_MIN_FINDINGS) return null;

  const criteria = new Set(allFindings.map((finding) => finding.criterion));
  const openSafe = allFindings.filter((finding) => isSafe(finding) && marks[findingId(finding)] === undefined).length;
  const steps = planSteps(allFindings, marks);
  const heaviest = steps.filter((step) => step.pending > 0).slice(0, 3);

  return {
    steps,
    total: allFindings.length,
    criteria: criteria.size,
    safe: openSafe,
    human: allFindings.length - allFindings.filter(isSafe).length,
    firstCriterion: heaviest[0] ?? null,
    heaviest,
    progress: progressOf(allFindings, marks, original),
  };
}
