"use client";

import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import type { BriefingCheck, Span } from "@/lucid";
import {
  occurrenceKey,
  occurrencesOf,
  resolveCursor,
  stepCursor,
  type OccurrenceCursor,
} from "../lib/occurrence-cursor";

export interface OccurrenceNavigation {
  cursor: OccurrenceCursor | null;
  spans: readonly Span[];
  index: number;
  active: Span | null;
  select: (expression: string, index: number) => void;
  step: (delta: number) => void;
  clear: () => void;
}

export interface OccurrenceNavigationOptions {
  check: BriefingCheck;
  scrollRef: RefObject<HTMLDivElement | null>;
  enabled: boolean;
}

export function useOccurrenceNavigation({
  check,
  scrollRef,
  enabled,
}: OccurrenceNavigationOptions): OccurrenceNavigation {
  const [cursor, setCursor] = useState<OccurrenceCursor | null>(null);

  const { spans, index, active } = useMemo(() => resolveCursor(check, cursor), [check, cursor]);
  const activeKey = active === null ? null : occurrenceKey(active);

  useEffect(() => {
    if (activeKey === null || !enabled) return;
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-occurrence="${activeKey}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeKey, enabled, scrollRef]);

  const select = useCallback((expression: string, next: number) => {
    setCursor({ expression, index: next });
  }, []);

  const step = useCallback(
    (delta: number) => {
      setCursor((current) => {
        if (current === null) return current;
        const total = occurrencesOf(check, current.expression).length;
        return stepCursor({ ...current, index }, total, delta);
      });
    },
    [check, index],
  );

  const clear = useCallback(() => setCursor(null), []);

  return { cursor, spans, index, active, select, step, clear };
}
