"use client";

import { useCallback, useState } from "react";
import { CRITERION_ORDER } from "../lib/criteria";
import type { Bucket } from "../components/revision-list";

export interface CriterionFilter {
  activeCriteria: ReadonlySet<string>;
  toggleCriterion: (criterion: string) => void;
  bucket: Bucket;
  setBucket: (bucket: Bucket) => void;
}

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
