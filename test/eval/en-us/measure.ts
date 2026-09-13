import { analyzeWithLocale } from "@/lucid";
import { localeEnUS } from "@/locales/en-US";

export type EnGoldenStatus = "correct" | "known_limitation" | "out_of_universe";

export interface EnGoldenEntry {
  readonly text: string;
  readonly expectedCount: number;
  readonly status: EnGoldenStatus;
  readonly reason?: string;
}

export interface EnEntryResult extends EnGoldenEntry {
  readonly actualCount: number;
  readonly tp: number;
  readonly fp: number;
  readonly fn: number;
}

export interface EnSuiteSummary {
  readonly cases: number;
  readonly negatives: number;
  readonly limitations: number;
  readonly outOfUniverse: number;
  readonly tp: number;
  readonly fp: number;
  readonly fn: number;
}

export function countFindings(
  text: string,
  criterion: string,
  filter?: (meta: Record<string, unknown>) => boolean,
): number {
  return analyzeWithLocale(text, localeEnUS).findings.filter(
    (finding) => finding.criterion === criterion && (filter === undefined || filter(finding.meta ?? {})),
  ).length;
}

export function measure(
  golden: readonly EnGoldenEntry[],
  criterion: string,
  filter?: (meta: Record<string, unknown>) => boolean,
): { results: EnEntryResult[]; summary: EnSuiteSummary } {
  const results = golden.map((entry) => {
    const actualCount = countFindings(entry.text, criterion, filter);
    return {
      ...entry,
      actualCount,
      tp: Math.min(actualCount, entry.expectedCount),
      fp: Math.max(0, actualCount - entry.expectedCount),
      fn: Math.max(0, entry.expectedCount - actualCount),
    };
  });
  const counted = results.filter((r) => r.status !== "out_of_universe");
  return {
    results,
    summary: {
      cases: counted.length,
      negatives: counted.filter((r) => r.expectedCount === 0).length,
      limitations: counted.filter((r) => r.status === "known_limitation").length,
      outOfUniverse: results.length - counted.length,
      tp: counted.reduce((sum, r) => sum + r.tp, 0),
      fp: counted.reduce((sum, r) => sum + r.fp, 0),
      fn: counted.reduce((sum, r) => sum + r.fn, 0),
    },
  };
}

export function regressionLine(criterion: string, summary: EnSuiteSummary): string {
  return (
    `[regression suite · in-sample · en-US ${criterion}] ${summary.cases} cases, ${summary.negatives} with no ` +
    `expected finding, ${summary.limitations} known limitations, ${summary.outOfUniverse} out of universe · ` +
    `TP=${summary.tp} FP=${summary.fp} FN=${summary.fn} · not a precision or recall of the detector`
  );
}
