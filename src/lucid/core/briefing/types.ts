import type { Span } from "../types";

export interface ReaderBriefing {
  readonly audience: string;
  readonly purpose: string;
  readonly priorKnowledge: string;
  readonly mustFind: readonly string[];
}

export interface BriefingCoverage {
  readonly expression: string;
  readonly occurrences: readonly Span[];
}

export interface BriefingCheck {
  readonly declared: boolean;
  readonly answered: {
    readonly audience: boolean;
    readonly purpose: boolean;
    readonly priorKnowledge: boolean;
  };
  readonly coverage: readonly BriefingCoverage[];
  readonly missing: readonly string[];
}

export const EMPTY_BRIEFING: ReaderBriefing = {
  audience: "",
  purpose: "",
  priorKnowledge: "",
  mustFind: [],
};
