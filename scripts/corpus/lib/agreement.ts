import type { AgreementReport, Confidence, LabelerRun, Occurrence, Route } from "./types";

export function sameSpan(a: Occurrence, b: Occurrence): boolean {
  return a.start === b.start && a.end === b.end;
}

export function spanExactRate(a: readonly Occurrence[], b: readonly Occurrence[]): number | null {
  if (a.length === 0 && b.length === 0) return null;
  const denominator = Math.max(a.length, b.length);
  if (denominator === 0) return null;
  const remaining = [...b];
  let matched = 0;
  for (const occurrence of a) {
    const index = remaining.findIndex((candidate) => sameSpan(occurrence, candidate));
    if (index >= 0) {
      remaining.splice(index, 1);
      matched += 1;
    }
  }
  return matched / denominator;
}

export function weakestConfidence(runs: readonly LabelerRun[]): Confidence {
  return runs.some((run) => run.confidence === "baixa") ? "baixa" : "alta";
}

export function compareRuns(runs: readonly LabelerRun[]): AgreementReport {
  const counts = runs.map((run) => run.count);
  const countMatch = counts.every((count) => count === counts[0]);
  const binaryMatch = runs.every((run) => run.count > 0 === runs[0].count > 0);
  const rate = runs.length === 2 ? spanExactRate(runs[0].occurrences, runs[1].occurrences) : null;
  return { countMatch, binaryMatch, spanExactRate: rate, minConfidence: weakestConfidence(runs) };
}

export interface RoutingPolicy {
  consensusAuditRate: number;
  lowConfidenceRoutes: boolean;
}

export interface RoutingDecision {
  route: Route;
  needsHuman: boolean;
}

export function routeLabel(
  runs: readonly LabelerRun[],
  agreement: AgreementReport,
  policy: RoutingPolicy,
  auditDraw: number,
): RoutingDecision {
  if (runs.some((run) => !run.ok)) return { route: "human_labeler_failure", needsHuman: true };
  if (!agreement.countMatch || !agreement.binaryMatch) return { route: "human_divergence", needsHuman: true };
  if (agreement.spanExactRate !== null && agreement.spanExactRate < 1) {
    return { route: "human_divergence", needsHuman: true };
  }
  if (policy.lowConfidenceRoutes && agreement.minConfidence === "baixa") {
    return { route: "human_low_confidence", needsHuman: true };
  }
  if (auditDraw < policy.consensusAuditRate) return { route: "human_audit_sample", needsHuman: true };
  return { route: "auto_consensus", needsHuman: false };
}

export interface BinaryPair {
  a: boolean;
  b: boolean;
}

export interface AgreementStats {
  n: number;
  rawAgreement: number;
  cohenKappa: number | null;
  gwetAc1: number | null;
  positiveRate: number;
}

export function agreementStats(pairs: readonly BinaryPair[]): AgreementStats {
  const n = pairs.length;
  if (n === 0) {
    return { n: 0, rawAgreement: 0, cohenKappa: null, gwetAc1: null, positiveRate: 0 };
  }

  const bothPositive = pairs.filter((p) => p.a && p.b).length;
  const bothNegative = pairs.filter((p) => !p.a && !p.b).length;
  const aOnly = pairs.filter((p) => p.a && !p.b).length;
  const bOnly = pairs.filter((p) => !p.a && p.b).length;

  const po = (bothPositive + bothNegative) / n;

  const aPositive = (bothPositive + aOnly) / n;
  const bPositive = (bothPositive + bOnly) / n;

  const peCohen = aPositive * bPositive + (1 - aPositive) * (1 - bPositive);
  const cohenKappa = peCohen === 1 ? null : round((po - peCohen) / (1 - peCohen));

  const pi = (aPositive + bPositive) / 2;
  const peGwet = 2 * pi * (1 - pi);
  const gwetAc1 = peGwet === 1 ? null : round((po - peGwet) / (1 - peGwet));

  return {
    n,
    rawAgreement: round(po),
    cohenKappa,
    gwetAc1,
    positiveRate: round((bothPositive + aOnly + bOnly) / n),
  };
}

function round(value: number, places = 4): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function wilsonInterval(successes: number, trials: number, z = 1.96): { low: number; high: number } | null {
  if (trials === 0) return null;
  const p = successes / trials;
  const denominator = 1 + (z * z) / trials;
  const center = p + (z * z) / (2 * trials);
  const spread = z * Math.sqrt((p * (1 - p)) / trials + (z * z) / (4 * trials * trials));
  return {
    low: round(Math.max(0, (center - spread) / denominator)),
    high: round(Math.min(1, (center + spread) / denominator)),
  };
}
