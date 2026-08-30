"use client";

import { useCallback, useMemo, useState } from "react";
import type { Bucket, FindingQuery, SortOrder, StateFilter } from "../lib/finding-query";

export interface FindingQueryControls {
  query: FindingQuery;
  setCriterion: (criterion: string | null) => void;
  setBucket: (bucket: Bucket) => void;
  setState: (state: StateFilter) => void;
  setSearch: (search: string) => void;
  setOrder: (order: SortOrder) => void;
  clearFilters: () => void;
  filtered: boolean;
}

export function useFindingQuery(initialCriterion: string | null = null): FindingQueryControls {
  const [criterion, setCriterion] = useState<string | null>(initialCriterion);
  const [bucket, setBucket] = useState<Bucket>("all");
  const [state, setState] = useState<StateFilter>("all");
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState<SortOrder>("severity");

  const clearFilters = useCallback(() => {
    setCriterion(null);
    setBucket("all");
    setState("all");
    setSearch("");
  }, []);

  const query = useMemo<FindingQuery>(
    () => ({ criterion, bucket, state, search, order }),
    [criterion, bucket, state, search, order],
  );

  const filtered = criterion !== null || bucket !== "all" || state !== "all" || search.trim() !== "";

  return {
    query,
    setCriterion,
    setBucket,
    setState,
    setSearch,
    setOrder,
    clearFilters,
    filtered,
  };
}
