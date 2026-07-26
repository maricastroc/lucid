"use client";

import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import type { Diagnostic, Finding } from "@/lucid";
import { findingId } from "../lib/criteria";

export interface FindingNavigation {
  /** Selected finding's id, or `null` — never an id that left the current index. */
  selectedId: string | null;
  selectedIndex: number;
  selectedFinding: Finding | null;
  /** Id being briefly highlighted after a scroll, so the eye finds it. */
  flashId: string | null;
  select: (finding: Finding) => void;
  clear: () => void;
  /** Walks the index, wrapping around. `delta` is +1/-1. */
  goTo: (delta: number) => void;
}

export interface FindingNavigationOptions {
  findings: readonly Finding[];
  /** Container the selected finding is scrolled into view within. */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Re-runs the scroll after the document is re-rendered. */
  diagnostic: Diagnostic;
  /** Selection and keyboard navigation only make sense while auditing. */
  enabled: boolean;
  /** Fired whenever navigation lands on a finding — the caller may reveal its panel. */
  onNavigate?: () => void;
}

/**
 * Which finding the reviewer is looking at, and how they walk between them — pointer,
 * `j`/`k`, or arrow keys. The selection is DERIVED against the current index: filtering a
 * criterion out drops the selection instead of leaving a dangling id behind.
 */
export function useFindingNavigation({
  findings,
  scrollRef,
  diagnostic,
  enabled,
  onNavigate,
}: FindingNavigationOptions): FindingNavigation {
  const [selectedIdRaw, setSelectedId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  const selectedId = useMemo(
    () => (selectedIdRaw && findings.some((f) => findingId(f) === selectedIdRaw) ? selectedIdRaw : null),
    [selectedIdRaw, findings],
  );
  const selectedIndex = selectedId ? findings.findIndex((f) => findingId(f) === selectedId) : -1;
  const selectedFinding = selectedIndex >= 0 ? findings[selectedIndex] : null;

  useEffect(() => {
    if (!selectedId || !enabled) return;
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-finding-id="${cssEscape(selectedId)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashId(selectedId);
    const t = window.setTimeout(() => setFlashId(null), 660);
    return () => window.clearTimeout(t);
  }, [selectedId, enabled, diagnostic, scrollRef]);

  const select = useCallback(
    (finding: Finding) => {
      setSelectedId(findingId(finding));
      onNavigate?.();
    },
    [onNavigate],
  );

  const clear = useCallback(() => setSelectedId(null), []);

  const goTo = useCallback(
    (delta: number) => {
      if (findings.length === 0) return;
      const from = selectedIndex < 0 ? (delta > 0 ? -1 : 0) : selectedIndex;
      const next = (from + delta + findings.length) % findings.length;
      setSelectedId(findingId(findings[next]));
      onNavigate?.();
    },
    [findings, selectedIndex, onNavigate],
  );

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) return;
      if (e.key === "Escape") return setSelectedId(null);
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        goTo(1);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        goTo(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, enabled]);

  return { selectedId, selectedIndex, selectedFinding, flashId, select, clear, goTo };
}

function cssEscape(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}
