import type { CriterionId, Finding } from "@/lucid";

export function metaNum(f: Finding, k: string): number | null {
  const v = f.meta?.[k];
  return typeof v === "number" ? v : null;
}

export function metaStr(f: Finding, k: string): string | null {
  const v = f.meta?.[k];
  return typeof v === "string" ? v : null;
}

export function metaBool(f: Finding, k: string): boolean {
  return f.meta?.[k] === true;
}

export function flat(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export type ConfidenceLevel = "segura" | "assistida";

export interface Confidence {
  level: ConfidenceLevel;
  rationale: string;
}

export function assistida(rationale: string): Confidence {
  return { level: "assistida", rationale };
}

export interface CriterionNarrative {
  headline?: (f: Finding) => string;
  prose?: (f: Finding) => string;
  confidence: (f: Finding) => Confidence;
}

export type NarrativeSet = Record<CriterionId, CriterionNarrative>;
