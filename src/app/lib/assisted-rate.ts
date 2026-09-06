import type { AssistedStratum } from "@/report/eval/contract";

export type RateState = { kind: "value"; value: number } | { kind: "absent" | "withheld" | "unmeasurable" };

export function precisionState(s: AssistedStratum, promoted: boolean): RateState {
  if (s.tp + s.fp === 0) return { kind: "absent" };
  if (!promoted || s.precision === null) return { kind: "withheld" };
  return { kind: "value", value: s.precision };
}

export function recallState(s: AssistedStratum, promoted: boolean, enriched: boolean): RateState {
  if (enriched) return { kind: "unmeasurable" };
  if (s.tp + s.fn === 0) return { kind: "absent" };
  if (!promoted || s.recall === null) return { kind: "withheld" };
  return { kind: "value", value: s.recall };
}

export function silentStratumReading(s: AssistedStratum): { cases: number } | null {
  const noPrecisionDenominator = s.tp + s.fp === 0;
  const noRecallDenominator = s.tp + s.fn === 0;
  if (!noPrecisionDenominator || !noRecallDenominator || s.cases === 0) return null;
  return { cases: s.cases };
}
