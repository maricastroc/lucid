"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Finding, Span } from "@/lucid";
import {
  EMPTY_MARKS,
  pruneMarks,
  reanchorMarks,
  withMark,
  withMarks,
  type ReviewMark,
  type ReviewMarks,
} from "../lib/review-marks";

export interface ReviewMarkControls {
  marks: ReviewMarks;
  mark: (finding: Finding, value: ReviewMark | null) => void;
  markMany: (findings: readonly Finding[], value: ReviewMark | null) => void;
  shiftForEdit: (target: Span, replacement: string) => void;
  reset: () => void;
}

export function useReviewMarks(
  findings: readonly Finding[],
  isSettled: boolean,
  initial: ReviewMarks = EMPTY_MARKS,
): ReviewMarkControls {
  const [marks, setMarks] = useState<ReviewMarks>(initial);
  const shifting = useRef(false);

  useEffect(() => {
    if (!isSettled) return;
    if (shifting.current) {
      shifting.current = false;
      return;
    }
    setMarks((prev) => pruneMarks(prev, findings));
  }, [findings, isSettled]);

  const mark = useCallback(
    (finding: Finding, value: ReviewMark | null) => setMarks((prev) => withMark(prev, finding, value)),
    [],
  );

  const markMany = useCallback(
    (targets: readonly Finding[], value: ReviewMark | null) => setMarks((prev) => withMarks(prev, targets, value)),
    [],
  );

  const shiftForEdit = useCallback((target: Span, replacement: string) => {
    shifting.current = true;
    setMarks((prev) => reanchorMarks(prev, target, replacement));
  }, []);

  const reset = useCallback(() => setMarks(EMPTY_MARKS), []);

  return { marks, mark, markMany, shiftForEdit, reset };
}
