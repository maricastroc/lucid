import type { Document } from "@/lucid";
import { buildStructuredDocument, type RawBlock } from "@/lucid/core/document/structured";
import type { DocumentBuildServices } from "@/lucid/core/document/model";
import { cleanRunningLines } from "./clean";
import { hasPersistentGutter } from "./columns";
import { median, type PdfLine, type PdfPageGeometry } from "./geometry";
import { assembleLines } from "./lines";
import { buildParagraphs, metricsOf } from "./paragraphs";
import { emptyPages, isGlued, isScanned, qualityOf } from "./quality";
import { countRuledRegions } from "./ruled-regions";

export type { PdfPageGeometry, PdfTextItem, PdfRule } from "./geometry";

export type PdfRefusalKind = "unreadable" | "scanned" | "columns" | "glued" | "invariant" | "no_readable_content";

export interface PdfNotes {
  readonly pages: number;
  readonly emptyPages: number;
  readonly removedHeaders: number;
  readonly removedFooters: number;
  readonly removedPageNumbers: number;
  readonly dehyphenated: number;
  readonly shortLineBreaks: number;
  readonly ruledRegions: number;
}

export interface PdfImport {
  readonly doc: Document;
  readonly notes: PdfNotes;
}

export type PdfResult =
  { readonly ok: true; readonly value: PdfImport } | { readonly ok: false; readonly refusal: PdfRefusalKind };

const DIGITS = /\d+/g;

const digitsOf = (text: string): string[] => text.match(DIGITS) ?? [];

export function missingDigits(before: readonly string[], removed: readonly string[], after: string): string[] {
  const budget = new Map<string, number>();
  for (const digit of after.match(DIGITS) ?? []) budget.set(digit, (budget.get(digit) ?? 0) + 1);
  for (const digit of removed) budget.set(digit, (budget.get(digit) ?? 0) + 1);

  const missing: string[] = [];
  for (const digit of before) {
    const left = budget.get(digit) ?? 0;
    if (left > 0) budget.set(digit, left - 1);
    else missing.push(digit);
  }

  return missing;
}

const refuse = (refusal: PdfRefusalKind): PdfResult => ({ ok: false, refusal });

const toParagraphs = (text: string): RawBlock[] =>
  text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block !== "")
    .map((block) => ({ kind: "paragraph", text: block }));

export function importPdfPages(pages: readonly PdfPageGeometry[], services: DocumentBuildServices): PdfResult {
  if (pages.length === 0) return refuse("unreadable");
  if (isScanned(pages)) return refuse("scanned");

  const lines: PdfLine[] = [];
  for (const [index, page] of pages.entries()) lines.push(...assembleLines(page, index + 1));
  if (lines.length === 0) return refuse("no_readable_content");

  if (hasPersistentGutter(pages)) return refuse("columns");

  const pageHeight = median(pages.map((page) => page.height));
  const pageWidth = median(pages.map((page) => page.width));

  const cleaned = cleanRunningLines(lines, pageHeight);
  const metrics = metricsOf(cleaned.lines, pageWidth);
  const built = buildParagraphs(cleaned.lines, metrics);

  if (built.text.trim() === "") return refuse("no_readable_content");
  if (isGlued(qualityOf(built.text))) return refuse("glued");

  const missing = missingDigits(
    lines.flatMap((line) => digitsOf(line.text)),
    cleaned.removedText.flatMap(digitsOf),
    built.text,
  );
  if (missing.length > 0) return refuse("invariant");

  const blocks = toParagraphs(built.text);
  if (blocks.length === 0) return refuse("no_readable_content");

  return {
    ok: true,
    value: {
      doc: buildStructuredDocument(blocks, services),
      notes: {
        pages: pages.length,
        emptyPages: emptyPages(pages),
        removedHeaders: cleaned.removed.header,
        removedFooters: cleaned.removed.footer,
        removedPageNumbers: cleaned.removed.pageNumber,
        dehyphenated: built.dehyphenated,
        shortLineBreaks: built.shortLineBreaks,
        ruledRegions: countRuledRegions(pages),
      },
    },
  };
}

export async function importPdf(bytes: ArrayBuffer | Uint8Array, services: DocumentBuildServices): Promise<PdfResult> {
  const { loadPdfPages } = await import("./load");

  let pages: PdfPageGeometry[];
  try {
    pages = await loadPdfPages(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  } catch {
    return refuse("unreadable");
  }

  return importPdfPages(pages, services);
}
