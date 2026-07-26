"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analyze } from "@/lucid";
import { documentBurden, type LedgerEntry } from "../lib/ledger";

export interface RevisionHistory {
  ledger: readonly LedgerEntry[];
  canUndo: boolean;
  applyChange: (entry: Omit<LedgerEntry, "burdenBefore" | "burdenAfter">, nextText: string) => boolean;
  undo: () => void;
  noteFreeEdit: () => void;
  reset: () => void;
}

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
