import type { Finding } from "@/lucid";
import type { CriterionId } from "@/locales/pt-BR";

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

export function metaWords(f: Finding, k: string): string[] {
  const v = f.meta?.[k];
  return typeof v === "string" && v !== "" ? v.split(" ") : [];
}

export function quotedList(words: readonly string[], and = "e"): string {
  const q = words.map((w) => `“${w}”`);
  return q.length <= 1 ? q.join("") : `${q.slice(0, -1).join(", ")} ${and} ${q[q.length - 1]}`;
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

export type PtNarrativeSet = Record<CriterionId, CriterionNarrative>;
