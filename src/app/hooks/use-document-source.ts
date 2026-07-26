"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { analyze, analyzeDocument, ptDocumentServices, type Block, type Diagnostic, type Document } from "@/lucid";
import { SAMPLE_TEXT } from "../lib/sample";

export interface DocumentSource {
  text: string;
  /** Free typing. Does not touch the edit history — the caller decides what that means. */
  setText: (value: string) => void;

  /** The engine's reading of the current text, structured when the document came from a .docx. */
  diagnostic: Diagnostic;
  /** Block layer, only when the structure came from an import — `null` for pasted text. */
  blocks: readonly Block[] | null;
  isEmpty: boolean;
  /** False while a keystroke has not reached the deferred analysis yet. */
  isSettled: boolean;

  importing: boolean;
  importError: string | null;
  dismissImportError: () => void;

  /** Each of these REPLACES the document; the caller is responsible for the reset that follows. */
  loadExample: () => void;
  clear: () => void;
  /** `true` when a document was actually loaded — on failure the current one stays untouched. */
  openDocx: (file: File) => Promise<boolean>;
}

/**
 * The document under audit and its reading: where the text came from, and what the engine
 * says about it. Owns nothing about revisions or selection — replacing the document is
 * announced by the return value of each action, not by reaching into other state.
 */
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
