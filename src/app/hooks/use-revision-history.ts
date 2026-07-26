"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analyze } from "@/lucid";
import { documentBurden, type LedgerEntry } from "../lib/ledger";

export interface RevisionHistory {
  /** Provenance trail of every change applied in this session, in order. */
  ledger: readonly LedgerEntry[];
  canUndo: boolean;
  /**
   * Applies a change authored by the human or by the AI — never by the engine (ADR-054) —
   * weighing the audit burden before and after. Returns `false` when the change was refused:
   * a reentrant call, an unsettled analysis, or a no-op.
   */
  applyChange: (entry: Omit<LedgerEntry, "burdenBefore" | "burdenAfter">, nextText: string) => boolean;
  undo: () => void;
  /** Free typing invalidates the stack: undoing over hand-typed text would destroy it. */
  noteFreeEdit: () => void;
  /** A different document arrived — the previous trail says nothing about it. */
  reset: () => void;
}

/**
 * The session's edit history. The ledger and the undo stack move together: undoing pops
 * both, so the trail never claims a change the text no longer carries.
 */
export function useRevisionHistory(
  text: string,
  setText: (value: string) => void,
  isSettled: boolean,
): RevisionHistory {
  const undoStack = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);

  // Guards against a second apply landing before the new text has been rendered back.
  const applying = useRef(false);
  useEffect(() => {
    applying.current = false;
  }, [text]);

  const applyChange = useCallback(
    (entry: Omit<LedgerEntry, "burdenBefore" | "burdenAfter">, nextText: string): boolean => {
      if (applying.current) return false;
      if (!isSettled) return false;
      if (nextText === text) return false;
      applying.current = true;

      const burdenBefore = documentBurden(analyze(text).findings);
      const burdenAfter = documentBurden(analyze(nextText).findings);
      undoStack.current.push(text);
      setCanUndo(true);
      setLedger((prev) => [...prev, { ...entry, burdenBefore, burdenAfter }]);
      setText(nextText);
      return true;
    },
    [text, isSettled, setText],
  );

  const undo = useCallback(() => {
    const previous = undoStack.current.pop();
    if (previous === undefined) return;
    setText(previous);
    setLedger((prev) => prev.slice(0, -1));
    setCanUndo(undoStack.current.length > 0);
  }, [setText]);

  const noteFreeEdit = useCallback(() => {
    if (undoStack.current.length === 0) return;
    undoStack.current = [];
    setCanUndo(false);
  }, []);

  const reset = useCallback(() => {
    undoStack.current = [];
    setCanUndo(false);
    setLedger([]);
  }, []);

  return { ledger, canUndo, applyChange, undo, noteFreeEdit, reset };
}
