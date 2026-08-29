"use client";

import { useCallback } from "react";
import type { Diagnostic, Span } from "@/lucid";
import type { RewriteProposal } from "@/report/rewrite";
import { sourceLabel, type LedgerEntry } from "../lib/ledger";
import { spliceSpan } from "../lib/text-edit";
import type { ReviewMarks } from "../lib/review-marks";

export interface DocumentEditsOptions {
  readonly diagnostic: Diagnostic;
  readonly marks: ReviewMarks;
  readonly previewText: (value: string) => string | null;
  readonly snapshotMarks: (marks: ReviewMarks) => void;
  readonly shiftForEdit: (target: Span, delta: number) => void;
  readonly restoreMarks: () => void;
  readonly recordChange: (entry: Omit<LedgerEntry, "burdenBefore" | "burdenAfter">, nextText: string) => boolean;
  readonly undo: () => void;
  readonly clearSelection: () => void;
}

export interface DocumentEdits {
  readonly applyManualEdit: (target: Span, replacement: string) => void;
  readonly applyRewrite: (target: Span, proposal: RewriteProposal) => void;
  readonly undoChange: () => void;
}

export function useDocumentEdits({
  diagnostic,
  marks,
  previewText,
  snapshotMarks,
  shiftForEdit,
  restoreMarks,
  recordChange,
  undo,
  clearSelection,
}: DocumentEditsOptions): DocumentEdits {
  const applyChange = useCallback(
    (entry: Omit<LedgerEntry, "burdenBefore" | "burdenAfter">, nextText: string) => {
      if (recordChange(entry, nextText)) clearSelection();
    },
    [recordChange, clearSelection],
  );

  const moveMarks = useCallback(
    (target: Span, nextText: string) => {
      const canonical = previewText(nextText);
      if (canonical === null) return;
      snapshotMarks(marks);
      shiftForEdit(target, canonical.length - diagnostic.text.length);
    },
    [diagnostic, marks, previewText, snapshotMarks, shiftForEdit],
  );

  const applyManualEdit = useCallback(
    (target: Span, replacement: string) => {
      const nextText = spliceSpan(diagnostic.text, target, replacement);
      moveMarks(target, nextText);
      applyChange(
        { source: "manual", label: sourceLabel("manual"), before: target.text, after: replacement },
        nextText,
      );
    },
    [diagnostic, applyChange, moveMarks],
  );

  const applyRewrite = useCallback(
    (target: Span, proposal: RewriteProposal) => {
      const nextText = spliceSpan(diagnostic.text, target, proposal.proposed);
      moveMarks(target, nextText);
      applyChange(
        {
          source: "ai",
          label: `${sourceLabel("ai")} · ${proposal.proposerId}`,
          proposerId: proposal.proposerId,
          before: target.text,
          after: proposal.proposed,
        },
        nextText,
      );
    },
    [diagnostic, applyChange, moveMarks],
  );

  const undoChange = useCallback(() => {
    restoreMarks();
    undo();
  }, [restoreMarks, undo]);

  return { applyManualEdit, applyRewrite, undoChange };
}
