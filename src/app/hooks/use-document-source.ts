"use client";

import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import {
  analyzeDocument,
  missingBlockKindsIn,
  buildDocument,
  buildStructuredDocument,
  rawUnitTexts,
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
import { htmlToRawBlocks } from "@/importers/html-blocks";
import type { PdfNotes, PdfRefusalKind } from "@/importers/pdf";
import { SAMPLE_TEXT } from "../lib/sample";
import { type WorkspaceSnapshot } from "../lib/workspace";

export type ImportError = DocxRefusalKind | PdfRefusalKind;

export type ImportNotes = ({ readonly format: "docx" } & DocxNotes) | ({ readonly format: "pdf" } & PdfNotes);

export interface DocumentSource {
  text: string;
  setText: (value: string) => void;
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
  enterPastedDocument: (value: string, html: string | null) => void;
}

const words = (text: string): string => text.replace(/\s+/g, " ").trim();

function refinesPastedLines(units: readonly string[], plain: string): boolean {
  const lines = plain
    .split("\n")
    .map(words)
    .filter((line) => line !== "");
  let at = 0;
  let joined = "";

  for (const unit of units) {
    if (at >= lines.length) return false;
    joined = joined === "" ? words(unit) : `${joined} ${words(unit)}`;
    if (joined === lines[at]) {
      at += 1;
      joined = "";
      continue;
    }
    if (!lines[at].startsWith(`${joined} `)) return false;
  }

  return at === lines.length && joined === "";
}

function documentFrom(blocks: readonly RawBlock[] | null): Document | null {
  return blocks === null ? null : buildStructuredDocument(blocks, ptDocumentServices);
}

interface DocumentSourceState {
  readonly text: string;
  readonly doc: Document | null;
}

export function useDocumentSource(initial: WorkspaceSnapshot | null, config: Config): DocumentSource {
  const [source, setSource] = useState<DocumentSourceState>(() => ({
    text: initial?.text ?? "",
    doc: documentFrom(initial?.blocks ?? null),
  }));
  const importedRef = useRef<Document | null>(source.doc);
  const refusedRef = useRef<{ reason: SpliceRefusal; text: string } | null>(null);
  const [refusedEdit, setRefusedEdit] = useState<{ reason: SpliceRefusal; text: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<ImportError | null>(null);
  const [importNotes, setImportNotes] = useState<ImportNotes | null>(null);
  const [originalText, setOriginalText] = useState<string | null>(() => (initial === null ? "" : initial.originalText));

  const adopt = useCallback((doc: Document | null, value: string) => {
    importedRef.current = doc;
    refusedRef.current = null;
    setRefusedEdit(null);
    setSource({ text: value, doc });
  }, []);

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
        setSource({ text: value, doc: null });
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
    setRefusedEdit(null);
    setSource({ text: pending.text, doc: null });
  }, []);

  const discardRefusedEdit = useCallback(() => {
    refusedRef.current = null;
    setRefusedEdit(null);
  }, []);

  const deferred = useDeferredValue(source);
  const structured = deferred.doc !== null && deferred.text === deferred.doc.source;

  const doc = useMemo(() => (structured ? deferred.doc! : buildDocument(deferred.text)), [structured, deferred]);

  const diagnostic = useMemo(() => analyzeDocument(doc, config), [doc, config]);

  const silentCriteria = useMemo(() => silentCriteriaIn(doc.blocks), [doc]);
  const missingBlockKinds = useMemo(
    () => (silentCriteria.length === 0 ? [] : missingBlockKindsIn(doc.blocks)),
    [doc, silentCriteria],
  );

  const loadExample = useCallback(() => enter(null, SAMPLE_TEXT), [enter]);

  const clear = useCallback(() => enter(null, ""), [enter]);

  const enterPastedDocument = useCallback(
    (value: string, html: string | null) => {
      const blocks = html === null || html.trim() === "" ? [] : htmlToRawBlocks(html);
      if (blocks.length === 0) {
        enter(null, value);
        return;
      }

      const units = blocks.flatMap(rawUnitTexts);
      if (!refinesPastedLines(units, value)) {
        enter(null, value);
        return;
      }
      const doc = buildStructuredDocument(blocks, ptDocumentServices);
      enter(doc, doc.source);
    },
    [enter],
  );

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

  const rawBlocks = useMemo(() => (source.doc === null ? null : toRawBlocks(source.doc.blocks)), [source.doc]);

  return {
    text: source.text,
    setText,
    originalText,
    diagnostic,
    silentCriteria,
    missingBlockKinds,
    importNotes: structured ? importNotes : null,
    blocks: structured ? deferred.doc!.blocks : null,
    rawBlocks,
    isEmpty: source.text.trim() === "" && (source.doc === null || source.doc.blocks.length === 0),
    isSettled: deferred === source,
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
