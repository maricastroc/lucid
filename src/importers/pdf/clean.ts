import { median, type PdfLine } from "./geometry";

const MARGIN_BAND = 0.2;
const MIN_PAGES = 3;
const TOP_TOLERANCE = 0.015;

const DIGITS = /\d+/g;
const SPACES = /\s+/g;

export type RemovalKind = "header" | "footer" | "pageNumber";

export interface CleanResult {
  readonly lines: readonly PdfLine[];
  readonly removed: Record<RemovalKind, number>;
  readonly removedText: readonly string[];
}

export function shapeOf(text: string): string {
  return text.trim().toLowerCase().replace(SPACES, " ").replace(DIGITS, "#");
}

const isPageNumber = (text: string): boolean => {
  const trimmed = text.trim();
  return /^\d{1,4}$/.test(trimmed) || /^\d{1,4}\s+de\s+\d{1,4}$/i.test(trimmed);
};

export function cleanRunningLines(lines: readonly PdfLine[], pageHeight: number): CleanResult {
  const topBand = pageHeight * MARGIN_BAND;
  const bottomBand = pageHeight * (1 - MARGIN_BAND);
  const tolerance = Math.max(3, pageHeight * TOP_TOLERANCE);

  const groups = new Map<string, PdfLine[]>();
  for (const line of lines) {
    if (line.top > topBand && line.top < bottomBand) continue;
    const shape = shapeOf(line.text);
    const group = groups.get(shape);
    if (group) group.push(line);
    else groups.set(shape, [line]);
  }

  const doomed = new Set<PdfLine>();
  const removed: Record<RemovalKind, number> = { header: 0, footer: 0, pageNumber: 0 };
  const removedText: string[] = [];

  for (const group of groups.values()) {
    if (new Set(group.map((line) => line.page)).size < MIN_PAGES) continue;

    const center = median(group.map((line) => line.top));
    const aligned = group.filter((line) => Math.abs(line.top - center) <= tolerance);
    if (new Set(aligned.map((line) => line.page)).size < MIN_PAGES) continue;

    for (const line of aligned) {
      doomed.add(line);
      removedText.push(line.text);
      if (isPageNumber(line.text)) removed.pageNumber += 1;
      else if (line.top <= topBand) removed.header += 1;
      else removed.footer += 1;
    }
  }

  return { lines: lines.filter((line) => !doomed.has(line)), removed, removedText };
}
