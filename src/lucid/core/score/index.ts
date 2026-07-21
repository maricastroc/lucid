import type { Config } from "../config";
import type { CriterionScore, Finding, Pass, Score, Severity } from "../types";

function round(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces;
  return Math.round(value * factor) / factor;
}

function countBySeverity(findings: readonly Finding[]): Record<Severity, number> {
  const count: Record<Severity, number> = { info: 0, warning: 0, error: 0 };
  for (const finding of findings) {
    count[finding.severity]++;
  }
  return count;
}

export function buildScore(
  findings: readonly Finding[],
  passes: readonly Pass[],
  wordCount: number,
  config: Config,
): Score {
  const byCriterion: CriterionScore[] = passes.map((pass) => {
    const passFindings = findings.filter((finding) => finding.criterion === pass.criterion);
    const densityPer100Words =
      wordCount === 0 ? 0 : round((passFindings.length / wordCount) * 100, config.metrics.decimalPlaces);

    return {
      criterion: pass.criterion,
      principle: pass.principle,
      count: countBySeverity(passFindings),
      densityPer100Words,
    };
  });

  return { byCriterion, totalFindings: findings.length };
}
