"use client";

import { useCallback, useState } from "react";
import { CRITERION_ORDER } from "../lib/criteria";
import type { Bucket } from "../components/revision-list";

export interface CriterionFilter {
  /** Criteria whose findings the index shows. Starts with every criterion on. */
  activeCriteria: ReadonlySet<string>;
  toggleCriterion: (criterion: string) => void;
  /** Severity/action bucket of the revision index. */
  bucket: Bucket;
  setBucket: (bucket: Bucket) => void;
}

/**
 * What the reviewer chose to look at. Independent of the document, of the edit history and
 * of the selection: switching a criterion off hides findings, it never changes the analysis.
 */
export function useCriterionFilter(): CriterionFilter {
  const [activeCriteria, setActiveCriteria] = useState<ReadonlySet<string>>(new Set(CRITERION_ORDER));
  const [bucket, setBucket] = useState<Bucket>("all");

  const toggleCriterion = useCallback((criterion: string) => {
    setActiveCriteria((prev) => {
      const next = new Set(prev);
      if (next.has(criterion)) next.delete(criterion);
      else next.add(criterion);
      return next;
    });
  }, []);

  return { activeCriteria, toggleCriterion, bucket, setBucket };
}
