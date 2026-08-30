"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { affixSplice, analyze } from "@/lucid";
import { attribute } from "../lib/attribution";
import { documentBurden, sourceLabel, type LedgerEntry } from "../lib/ledger";

export interface RevisionHistory {
  ledger: readonly LedgerEntry[];
  canUndo: boolean;
  applyChange: (entry: Omit<LedgerEntry, "burdenBefore" | "burdenAfter" | "attribution">, nextText: string) => boolean;
  undo: () => void;
  noteFreeEdit: () => void;
  closeTypingSession: () => void;
  reset: () => void;
}

export function useRevisionHistory(
  text: string,
  setText: (value: string) => void,
  isSettled: boolean,
  initialLedger: readonly LedgerEntry[] = [],
): RevisionHistory {
  const undoStack = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [ledger, setLedger] = useState<LedgerEntry[]>(() => [...initialLedger]);

  const applying = useRef(false);
  const typingFrom = useRef<string | null>(null);
  useEffect(() => {
    applying.current = false;
  }, [text]);

  const closeTypingSession = useCallback(() => {
    const from = typingFrom.current;
    typingFrom.current = null;
    if (from === null || from === text) return;

    const before = analyze(from).findings;
    const after = analyze(text).findings;
    const splice = affixSplice(from, text);
    setLedger((prev) => [
      ...prev,
      {
        source: "typing",
        label: sourceLabel("typing"),
        before: from.slice(splice.start, splice.end),
        after: splice.replacement,
        burdenBefore: documentBurden(before),
        burdenAfter: documentBurden(after),
        attribution: attribute(before, after, splice),
      },
    ]);
  }, [text]);

  const applyChange = useCallback(
    (entry: Omit<LedgerEntry, "burdenBefore" | "burdenAfter">, nextText: string): boolean => {
      if (applying.current) return false;
      if (!isSettled) return false;
      if (nextText === text) return false;
      applying.current = true;

      closeTypingSession();

      const before = analyze(text).findings;
      const after = analyze(nextText).findings;
      undoStack.current.push(text);
      setCanUndo(true);
      setLedger((prev) => [
        ...prev,
        {
          ...entry,
          burdenBefore: documentBurden(before),
          burdenAfter: documentBurden(after),
          attribution: attribute(before, after, affixSplice(text, nextText)),
        },
      ]);
      setText(nextText);
      return true;
    },
    [text, isSettled, setText, closeTypingSession],
  );

  const undo = useCallback(() => {
    const previous = undoStack.current.pop();
    if (previous === undefined) return;
    setText(previous);
    setLedger((prev) => prev.slice(0, -1));
    setCanUndo(undoStack.current.length > 0);
  }, [setText]);

  const noteFreeEdit = useCallback(() => {
    if (typingFrom.current === null) typingFrom.current = text;
    if (undoStack.current.length === 0) return;
    undoStack.current = [];
    setCanUndo(false);
  }, [text]);

  const reset = useCallback(() => {
    undoStack.current = [];
    typingFrom.current = null;
    setCanUndo(false);
    setLedger([]);
  }, []);

  return { ledger, canUndo, applyChange, undo, noteFreeEdit, closeTypingSession, reset };
}
