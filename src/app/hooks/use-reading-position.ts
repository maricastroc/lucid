"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import type { Span } from "@/lucid";
import {
  blockTopForOffset,
  measureDraftLines,
  offsetAtBlockTop,
  offsetAtScroll,
  readBlockBoxes,
  rebaseOffset,
  scrollForOffset,
  type DraftLine,
} from "../lib/document-position";
import type { Mode } from "../components/document-view";

interface DraftTable {
  readonly text: string;
  readonly width: number;
  readonly lines: readonly DraftLine[];
}

export interface ReadingPosition {
  readonly rebase: (target: Span, delta: number) => void;
}

export function useReadingPosition(
  scrollRef: RefObject<HTMLDivElement | null>,
  mode: Mode,
  text: string,
): ReadingPosition {
  const offsetRef = useRef(0);
  const tableRef = useRef<DraftTable | null>(null);
  const modeRef = useRef(mode);
  const restoredRef = useRef(false);

  const draftLines = useCallback((textarea: HTMLTextAreaElement): readonly DraftLine[] => {
    const cached = tableRef.current;
    if (cached !== null && cached.text === textarea.value && cached.width === textarea.clientWidth) return cached.lines;
    const lines = measureDraftLines(textarea);
    tableRef.current = { text: textarea.value, width: textarea.clientWidth, lines };
    return lines;
  }, []);

  useEffect(() => {
    tableRef.current = null;
  }, [text]);

  const hasDocument = text !== "";

  useEffect(() => {
    const container = scrollRef.current;
    if (container === null) return;

    let queued = 0;
    const capture = () => {
      queued = 0;
      const textarea = container.querySelector("textarea");
      if (modeRef.current === "edit") {
        if (textarea !== null) offsetRef.current = offsetAtScroll(draftLines(textarea), textarea.scrollTop);
        return;
      }
      offsetRef.current = offsetAtBlockTop(readBlockBoxes(container), container.scrollTop);
    };

    const onScroll = () => {
      if (queued !== 0) return;
      queued = window.requestAnimationFrame(capture);
    };

    container.addEventListener("scroll", onScroll, true);
    return () => {
      container.removeEventListener("scroll", onScroll, true);
      if (queued !== 0) window.cancelAnimationFrame(queued);
    };
  }, [scrollRef, draftLines, hasDocument, mode]);

  useLayoutEffect(() => {
    modeRef.current = mode;
    const container = scrollRef.current;

    if (container === null || !restoredRef.current) {
      restoredRef.current = true;
      return;
    }

    const offset = offsetRef.current;
    if (mode === "edit") {
      const textarea = container.querySelector("textarea");
      if (textarea === null) return;

      textarea.setSelectionRange(offset, offset);
      textarea.scrollTop = scrollForOffset(draftLines(textarea), offset);
      return;
    }

    const top = blockTopForOffset(readBlockBoxes(container), offset);
    if (top !== null) container.scrollTop = top;
  }, [mode, scrollRef, draftLines]);

  const rebase = useCallback((target: Span, delta: number) => {
    offsetRef.current = rebaseOffset(offsetRef.current, target, delta);
  }, []);

  return { rebase };
}
