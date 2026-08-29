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
import type { PdfNotes, PdfRefusalKind } from "@/importers/pdf";
import { SAMPLE_TEXT } from "../lib/sample";
import { type WorkspaceSnapshot } from "../lib/workspace";

export type ImportError = DocxRefusalKind | PdfRefusalKind;

export type ImportNotes = ({ readonly format: "docx" } & DocxNotes) | ({ readonly format: "pdf" } & PdfNotes);

export interface DocumentSource {
  text: string;
  setText: (value: string) => void;
  /**
   * The document as it entered, held untouched for the whole life of that document. `null` only in
   * a session restored from before this was recorded; `""` says the document was written here.
   */
  originalText: string | null;
  diagnostic: Diagnostic;
  silentCriteria: readonly string[];
  missingBlockKinds: readonly string[];
  importNotes: ImportNotes | null;
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
  openDocument: (file: File) => Promise<boolean>;
  /** A paste that replaced the whole draft: a different document has entered, structure and all. */
  enterPastedDocument: (value: string) => void;
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
  const [importNotes, setImportNotes] = useState<ImportNotes | null>(null);
  const [originalText, setOriginalText] = useState<string | null>(() => (initial === null ? "" : initial.originalText));

  const adopt = useCallback((doc: Document | null, value: string) => {
    importedRef.current = doc;
    refusedRef.current = null;
    setImportedDoc(doc);
    setRefusedEdit(null);
    setTextState(value);
  }, []);

  /**
   * A different document takes the place of the current one, so the entry text is redefined. Every
   * other path through `adopt` is an edit to the same document and must leave the original alone.
   */
  const enter = useCallback(
    (doc: Document | null, value: string) => {
      adopt(doc, value);
      setOriginalText(value);
    },
    [adopt],
  );

  const setText = useCallback(
    (value: string) => {
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
    },
    [adopt],
  );

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

  const loadExample = useCallback(() => enter(null, SAMPLE_TEXT), [enter]);

  const clear = useCallback(() => enter(null, ""), [enter]);

  const enterPastedDocument = useCallback((value: string) => enter(null, value), [enter]);

  const openDocument = useCallback(
    async (file: File): Promise<boolean> => {
      setImporting(true);
      setImportError(null);
      try {
        const bytes = await file.arrayBuffer();
        const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);

        if (isPdf) {
          const { importPdf } = await import("@/importers/pdf");
          const result = await importPdf(bytes, ptDocumentServices);
          if (!result.ok) {
            setImportError(result.refusal);
            return false;
          }
          setImportNotes({ format: "pdf", ...result.value.notes });
          enter(result.value.doc, result.value.doc.source);
          return true;
        }

        const { importDocx } = await import("@/importers/docx");
        const result = await importDocx(bytes, ptDocumentServices);
        if (!result.ok) {
          setImportError(result.refusal);
          return false;
        }
        setImportNotes({ format: "docx", ...result.value.notes });
        enter(result.value.doc, result.value.doc.source);
        return true;
      } catch {
        setImportError("unreadable");
        return false;
      } finally {
        setImporting(false);
      }
    },
    [enter],
  );

  const rawBlocks = useMemo(() => (importedDoc === null ? null : toRawBlocks(importedDoc.blocks)), [importedDoc]);

  return {
    text,
    setText,
    originalText,
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
    openDocument,
    enterPastedDocument,
  };
}
