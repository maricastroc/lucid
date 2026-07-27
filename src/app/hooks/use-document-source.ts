"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  analyze,
  analyzeDocument,
  buildStructuredDocument,
  ptDocumentServices,
  spliceStructuredDocument,
  toRawBlocks,
  type Block,
  type Config,
  type Diagnostic,
  type Document,
  type RawBlock,
} from "@/lucid";
import { SAMPLE_TEXT } from "../lib/sample";
import { type WorkspaceSnapshot } from "../lib/workspace";

export type ImportError = "unreadable";

export interface DocumentSource {
  text: string;
  setText: (value: string) => void;
  diagnostic: Diagnostic;
  blocks: readonly Block[] | null;
  rawBlocks: readonly RawBlock[] | null;
  isEmpty: boolean;
  isSettled: boolean;
  structureLost: boolean;

  importing: boolean;
  importError: ImportError | null;
  dismissImportError: () => void;

  loadExample: () => void;
  clear: () => void;
  openDocx: (file: File) => Promise<boolean>;
}

function documentFrom(blocks: readonly RawBlock[] | null): Document | null {
  return blocks === null ? null : buildStructuredDocument(blocks, ptDocumentServices);
}

export function useDocumentSource(initial: WorkspaceSnapshot | null, config: Config): DocumentSource {
  const [text, setTextState] = useState(() => initial?.text ?? "");
  const [importedDoc, setImportedDoc] = useState<Document | null>(() => documentFrom(initial?.blocks ?? null));
  const [structureLost, setStructureLost] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<ImportError | null>(null);

  const setText = useCallback((value: string) => {
    setImportedDoc((current) => {
      if (current === null) return null;
      const next = spliceStructuredDocument(current, value, ptDocumentServices);
      if (next === null) setStructureLost(true);
      return next;
    });
    setTextState(value);
  }, []);

  const deferredText = useDeferredValue(text);
  const structured = importedDoc !== null && deferredText === importedDoc.source;

  const diagnostic = useMemo(
    () => (structured ? analyzeDocument(importedDoc!, config) : analyze(deferredText, config)),
    [structured, importedDoc, deferredText, config],
  );

  const loadExample = useCallback(() => {
    setImportedDoc(null);
    setStructureLost(false);
    setTextState(SAMPLE_TEXT);
  }, []);

  const clear = useCallback(() => {
    setImportedDoc(null);
    setStructureLost(false);
    setTextState("");
  }, []);

  const openDocx = useCallback(async (file: File): Promise<boolean> => {
    setImporting(true);
    setImportError(null);
    try {
      const bytes = await file.arrayBuffer();

      const { importDocx } = await import("@/importers/docx");
      const doc = await importDocx(bytes, ptDocumentServices);
      setImportedDoc(doc);
      setStructureLost(false);
      setTextState(doc.source);
      return true;
    } catch {
      setImportError("unreadable");
      return false;
    } finally {
      setImporting(false);
    }
  }, []);

  const rawBlocks = useMemo(
    () => (importedDoc === null ? null : toRawBlocks(importedDoc.blocks)),
    [importedDoc],
  );

  return {
    text,
    setText,
    diagnostic,
    blocks: structured ? importedDoc!.blocks : null,
    rawBlocks,
    isEmpty: text.trim() === "" && importedDoc === null,
    isSettled: deferredText === text,
    structureLost,
    importing,
    importError,
    dismissImportError: useCallback(() => setImportError(null), []),
    loadExample,
    clear,
    openDocx,
  };
}
