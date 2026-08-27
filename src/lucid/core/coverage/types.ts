import type { CriterionSource, PrincipleGroup } from "../types";

export type ClauseStatus = "detected" | "partial" | "unbuilt" | "out_of_reach" | "unreachable";

export type ClauseLimitKind = "partial" | "unbuilt" | "out_of_reach";

export interface ClauseLimit {
  readonly kind: ClauseLimitKind;
  readonly reason: string;
}

export interface ClauseNode {
  readonly section: string;
  readonly title: string;
  readonly parent: string | null;
  readonly principleGroup: PrincipleGroup | null;
  readonly provisional: boolean;
  readonly instruments?: readonly string[];
  readonly limit?: ClauseLimit;
}

export interface ClauseTree {
  readonly standard: string;
  readonly transcription: string;
  readonly exhaustive: boolean;
  readonly nodes: readonly ClauseNode[];
}

export interface ClauseCoverage {
  readonly section: string;
  readonly title: string;
  readonly parent: string | null;
  readonly children: readonly string[];
  readonly principleGroup: PrincipleGroup | null;
  readonly provisional: boolean;
  readonly status: ClauseStatus;
  readonly derived: boolean;
  readonly criteria: readonly string[];
  readonly silent: readonly string[];
  readonly instruments: readonly string[];
  readonly reason: string | null;
}

export interface OutsideStandardCriterion {
  readonly criterion: string;
  readonly source: Exclude<CriterionSource, "iso-24495-1">;
  readonly principleGroup: PrincipleGroup;
}

export type CoverageScope = "instrument" | "document";

export interface CoverageReport {
  readonly scope: CoverageScope;
  readonly standard: string;
  readonly transcription: string;
  readonly exhaustive: boolean;
  readonly clauses: readonly ClauseCoverage[];
  readonly byStatus: Record<ClauseStatus, number>;
  readonly detectedShare: number | null;
  readonly silentCriteria: readonly string[];
  readonly outsideStandard: readonly OutsideStandardCriterion[];
}
