"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  analyze,
  analyzeDocument,
  buildStructuredDocument,
  ptDocumentServices,
  toRawBlocks,
  type Block,
  type Diagnostic,
  type Document,
  type RawBlock,
} from "@/lucid";
import { SAMPLE_TEXT } from "../lib/sample";
import { type WorkspaceSnapshot } from "../lib/workspace";

export interface DocumentSource {
  text: string;
  setText: (value: string) => void;
  diagnostic: Diagnostic;
  blocks: readonly Block[] | null;
  rawBlocks: readonly RawBlock[] | null;
  isEmpty: boolean;
  isSettled: boolean;

  importing: boolean;
  importError: string | null;
  dismissImportError: () => void;

  loadExample: () => void;
  clear: () => void;
  openDocx: (file: File) => Promise<boolean>;
}

function documentFrom(blocks: readonly RawBlock[] | null): Document | null {
  return blocks === null ? null : buildStructuredDocument(blocks, ptDocumentServices);
}

export function useDocumentSource(initial: WorkspaceSnapshot | null): DocumentSource {
  const [text, setText] = useState(() => initial?.text ?? "");
  const [importedDoc, setImportedDoc] = useState<Document | null>(() => documentFrom(initial?.blocks ?? null));
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const deferredText = useDeferredValue(text);
  const structured = importedDoc !== null && deferredText === importedDoc.source;

  const diagnostic = useMemo(
    () => (structured ? analyzeDocument(importedDoc!) : analyze(deferredText)),
    [structured, importedDoc, deferredText],
  );

  const loadExample = useCallback(() => {
    setImportedDoc(null);
    setText(SAMPLE_TEXT);
  }, []);

  const clear = useCallback(() => {
    setImportedDoc(null);
    setText("");
  }, []);

  const openDocx = useCallback(async (file: File): Promise<boolean> => {
    setImporting(true);
    setImportError(null);
    try {
      const bytes = await file.arrayBuffer();

      const { importDocx } = await import("@/importers/docx");
      const doc = await importDocx(bytes, ptDocumentServices);
      setImportedDoc(doc);
      setText(doc.source);
      return true;
    } catch {
      setImportError("Não foi possível ler o arquivo. Confirme que é um .docx válido.");
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
    importing,
    importError,
    dismissImportError: useCallback(() => setImportError(null), []),
    loadExample,
    clear,
    openDocx,
  };
}
