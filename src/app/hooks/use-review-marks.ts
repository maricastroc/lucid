"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Finding, Span } from "@/lucid";
import {
  EMPTY_MARKS,
  pruneMarks,
  reanchorMarks,
  withMark,
  withMarks,
  withNote,
  type ReviewMarkKind,
  type ReviewMarks,
} from "../lib/review-marks";

export interface ReviewMarkControls {
  marks: ReviewMarks;
  mark: (finding: Finding, value: ReviewMarkKind | null) => void;
  markMany: (findings: readonly Finding[], value: ReviewMarkKind | null) => void;
  note: (finding: Finding, text: string) => void;
  shiftForEdit: (target: Span, delta: number) => void;
  snapshot: (current: ReviewMarks) => void;
  restore: () => void;
  forgetHistory: () => void;
  reset: () => void;
}

export function useReviewMarks(
  findings: readonly Finding[],
  isSettled: boolean,
  initial: ReviewMarks = EMPTY_MARKS,
): ReviewMarkControls {
  const [marks, setMarks] = useState<ReviewMarks>(initial);
  const shifting = useRef(false);
  const history = useRef<ReviewMarks[]>([]);

  useEffect(() => {
    if (!isSettled) return;
    if (shifting.current) {
      shifting.current = false;
      return;
    }
    setMarks((prev) => pruneMarks(prev, findings));
  }, [findings, isSettled]);

  const mark = useCallback(
    (finding: Finding, value: ReviewMarkKind | null) => setMarks((prev) => withMark(prev, finding, value)),
    [],
  );

  const markMany = useCallback(
    (targets: readonly Finding[], value: ReviewMarkKind | null) => setMarks((prev) => withMarks(prev, targets, value)),
    [],
  );

  const note = useCallback((finding: Finding, text: string) => setMarks((prev) => withNote(prev, finding, text)), []);

  const shiftForEdit = useCallback((target: Span, delta: number) => {
    shifting.current = true;
    setMarks((prev) => reanchorMarks(prev, target, delta));
  }, []);

  const snapshot = useCallback((current: ReviewMarks) => {
    history.current = [...history.current, current];
  }, []);

  const restore = useCallback(() => {
    const previous = history.current[history.current.length - 1];
    if (previous === undefined) return;
    history.current = history.current.slice(0, -1);
    shifting.current = true;
    setMarks(previous);
  }, []);

  const forgetHistory = useCallback(() => {
    history.current = [];
  }, []);

  const reset = useCallback(() => {
    history.current = [];
    setMarks(EMPTY_MARKS);
  }, []);

  return { marks, mark, markMany, note, shiftForEdit, snapshot, restore, forgetHistory, reset };
}
