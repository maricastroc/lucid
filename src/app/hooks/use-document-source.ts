"use client";

import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import {
  analyzeDocument,
  missingBlockKindsIn,
  buildDocument,
  buildStructuredDocument,
  ptDocumentServices,
  silentCriteriaIn,
  spliceStructuredDocument,
  toRawBlocks,
  type Block,
  type SpliceRefusal,
  type Config,
  type Diagnostic,
  type Document,
  type RawBlock,
} from "@/lucid";
import type { DocxNotes, DocxRefusalKind } from "@/importers/docx";
import { SAMPLE_TEXT } from "../lib/sample";
import { type WorkspaceSnapshot } from "../lib/workspace";

export type ImportError = DocxRefusalKind;

export interface DocumentSource {
  text: string;
  setText: (value: string) => void;
  diagnostic: Diagnostic;
  silentCriteria: readonly string[];
  missingBlockKinds: readonly string[];
  importNotes: DocxNotes | null;
  blocks: readonly Block[] | null;
  rawBlocks: readonly RawBlock[] | null;
  isEmpty: boolean;
  isSettled: boolean;
  refusedEdit: { reason: SpliceRefusal; text: string } | null;
  acceptAsPlainText: () => void;
  discardRefusedEdit: () => void;
  previewText: (value: string) => string | null;

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
  const importedRef = useRef<Document | null>(importedDoc);
  const refusedRef = useRef<{ reason: SpliceRefusal; text: string } | null>(null);
  const [refusedEdit, setRefusedEdit] = useState<{ reason: SpliceRefusal; text: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<ImportError | null>(null);
  const [importNotes, setImportNotes] = useState<DocxNotes | null>(null);

  const adopt = useCallback((doc: Document | null, value: string) => {
    importedRef.current = doc;
    refusedRef.current = null;
    setImportedDoc(doc);
    setRefusedEdit(null);
    setTextState(value);
  }, []);

  const setText = useCallback((value: string) => {
    const current = importedRef.current;
    if (current === null) {
      setTextState(value);
      return;
    }

    const result = spliceStructuredDocument(current, value, ptDocumentServices);
    if (!result.ok) {
      refusedRef.current = { reason: result.reason, text: value };
      setRefusedEdit(refusedRef.current);
      return;
    }

    adopt(result.document, result.document.source);
  }, [adopt]);

  const previewText = useCallback((value: string): string | null => {
    const current = importedRef.current;
    if (current === null) return value;
    const result = spliceStructuredDocument(current, value, ptDocumentServices);
    return result.ok ? result.document.source : null;
  }, []);

  const acceptAsPlainText = useCallback(() => {
    const pending = refusedRef.current;
    if (pending === null) return;
    refusedRef.current = null;
    importedRef.current = null;
    setImportedDoc(null);
    setRefusedEdit(null);
    setTextState(pending.text);
  }, []);

  const discardRefusedEdit = useCallback(() => {
    refusedRef.current = null;
    setRefusedEdit(null);
  }, []);

  const deferredText = useDeferredValue(text);
  const structured = importedDoc !== null && deferredText === importedDoc.source;

  const doc = useMemo(
    () => (structured ? importedDoc! : buildDocument(deferredText)),
    [structured, importedDoc, deferredText],
  );

  const diagnostic = useMemo(() => analyzeDocument(doc, config), [doc, config]);

  const silentCriteria = useMemo(() => silentCriteriaIn(doc.blocks), [doc]);
  const missingBlockKinds = useMemo(
    () => (silentCriteria.length === 0 ? [] : missingBlockKindsIn(doc.blocks)),
    [doc, silentCriteria],
  );

  const loadExample = useCallback(() => adopt(null, SAMPLE_TEXT), [adopt]);

  const clear = useCallback(() => adopt(null, ""), [adopt]);

  const openDocx = useCallback(async (file: File): Promise<boolean> => {
    setImporting(true);
    setImportError(null);
    try {
      const bytes = await file.arrayBuffer();

      const { importDocx } = await import("@/importers/docx");
      const result = await importDocx(bytes, ptDocumentServices);
      if (!result.ok) {
        setImportError(result.refusal);
        return false;
      }
      setImportNotes(result.value.notes);
      adopt(result.value.doc, result.value.doc.source);
      return true;
    } catch {
      setImportError("unreadable");
      return false;
    } finally {
      setImporting(false);
    }
  }, [adopt]);

  const rawBlocks = useMemo(
    () => (importedDoc === null ? null : toRawBlocks(importedDoc.blocks)),
    [importedDoc],
  );

  return {
    text,
    setText,
    diagnostic,
    silentCriteria,
    missingBlockKinds,
    importNotes: structured ? importNotes : null,
    blocks: structured ? importedDoc!.blocks : null,
    rawBlocks,
    isEmpty: text.trim() === "" && importedDoc === null,
    isSettled: deferredText === text,
    refusedEdit,
    acceptAsPlainText,
    discardRefusedEdit,
    previewText,
    importing,
    importError,
    dismissImportError: useCallback(() => setImportError(null), []),
    loadExample,
    clear,
    openDocx,
  };
}
