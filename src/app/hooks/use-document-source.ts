"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { analyze, analyzeDocument, ptDocumentServices, type Block, type Diagnostic, type Document } from "@/lucid";
import { SAMPLE_TEXT } from "../lib/sample";

export interface DocumentSource {
  text: string;
  setText: (value: string) => void;
  diagnostic: Diagnostic;
  blocks: readonly Block[] | null;
  isEmpty: boolean;
  isSettled: boolean;

  importing: boolean;
  importError: string | null;
  dismissImportError: () => void;

  loadExample: () => void;
  clear: () => void;
  openDocx: (file: File) => Promise<boolean>;
}

export function useDocumentSource(): DocumentSource {
  const [text, setText] = useState("");
  const [importedDoc, setImportedDoc] = useState<Document | null>(null);
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

  return {
    text,
    setText,
    diagnostic,
    blocks: structured ? importedDoc!.blocks : null,
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
