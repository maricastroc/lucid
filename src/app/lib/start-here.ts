import type { Finding } from "@/lucid";
import { criterionRank, isSafe } from "./criteria";
import { tally, type ReviewMarks } from "./review-marks";

export const START_HERE_MIN_FINDINGS = 10;

export interface StartHereStep {
  readonly criterion: string;
  readonly count: number;
}

export interface StartHerePlan {
  readonly total: number;
  readonly criteria: number;
  readonly safe: number;
  readonly human: number;
  readonly firstCriterion: StartHereStep | null;
}

export function startHerePlan(
  allFindings: readonly Finding[],
  marks: ReviewMarks,
  filtered: boolean,
): StartHerePlan | null {
  if (filtered) return null;
  if (allFindings.length < START_HERE_MIN_FINDINGS) return null;

  const marked = tally(marks, allFindings);
  if (marked.seen > 0 || marked.dismissed > 0) return null;

  const byCriterion = new Map<string, number>();
  let safe = 0;
  for (const finding of allFindings) {
    byCriterion.set(finding.criterion, (byCriterion.get(finding.criterion) ?? 0) + 1);
    if (isSafe(finding)) safe++;
  }

  let firstCriterion: StartHereStep | null = null;
  for (const [criterion, count] of byCriterion) {
    if (
      firstCriterion === null ||
      count > firstCriterion.count ||
      (count === firstCriterion.count && criterionRank(criterion) < criterionRank(firstCriterion.criterion))
    ) {
      firstCriterion = { criterion, count };
    }
  }

  return {
    total: allFindings.length,
    criteria: byCriterion.size,
    safe,
    human: allFindings.length - safe,
    firstCriterion,
  };
}
