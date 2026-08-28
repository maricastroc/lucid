"use client";

import { useCallback, useMemo, useState } from "react";
import { CRITERION_ORDER } from "../lib/criteria";
import type { Bucket, FindingQuery, SortOrder, StateFilter } from "../lib/finding-query";

export interface FindingQueryControls {
  query: FindingQuery;
  toggleCriterion: (criterion: string) => void;
  setCriterion: (criterion: string | null) => void;
  setBucket: (bucket: Bucket) => void;
  setState: (state: StateFilter) => void;
  setSearch: (search: string) => void;
  setOrder: (order: SortOrder) => void;
  clearFilters: () => void;
  filtered: boolean;
}

const ALL_CRITERIA: ReadonlySet<string> = new Set(CRITERION_ORDER);

export function useFindingQuery(): FindingQueryControls {
  const [activeCriteria, setActiveCriteria] = useState<ReadonlySet<string>>(ALL_CRITERIA);
  const [criterion, setCriterion] = useState<string | null>(null);
  const [bucket, setBucket] = useState<Bucket>("all");
  const [state, setState] = useState<StateFilter>("all");
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState<SortOrder>("severity");

  const toggleCriterion = useCallback((target: string) => {
    setActiveCriteria((prev) => {
      const next = new Set(prev);
      if (next.has(target)) next.delete(target);
      else next.add(target);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setCriterion(null);
    setBucket("all");
    setState("all");
    setSearch("");
  }, []);

  const query = useMemo<FindingQuery>(
    () => ({ activeCriteria, criterion, bucket, state, search, order }),
    [activeCriteria, criterion, bucket, state, search, order],
  );

  const filtered = criterion !== null || bucket !== "all" || state !== "all" || search.trim() !== "";

  return {
    query,
    toggleCriterion,
    setCriterion,
    setBucket,
    setState,
    setSearch,
    setOrder,
    clearFilters,
    filtered,
  };
}
