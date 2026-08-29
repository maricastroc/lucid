import { median, type PdfLine, type PdfPageGeometry, type PdfTextItem } from "./geometry";

const BASELINE_TOLERANCE = 0.5;
const SPACE_GAP = 0.25;

const INVISIBLE = /[­​‌‍﻿‎‏]/g;
const EXOTIC_SPACE = /[  -   　]/g;

export function normalizeImported(text: string): string {
  return text.replace(INVISIBLE, "").replace(EXOTIC_SPACE, " ").normalize("NFC");
}

const averageCharWidth = (item: PdfTextItem): number =>
  item.text.length > 0 ? item.width / item.text.length : item.height * 0.5;

function joinLine(items: readonly PdfTextItem[]): string {
  let text = "";

  for (const [index, item] of items.entries()) {
    if (index === 0) {
      text += item.text;
      continue;
    }
    const previous = items[index - 1];
    const gap = item.left - (previous.left + previous.width);
    const needsSpace =
      gap > SPACE_GAP * averageCharWidth(previous) && !text.endsWith(" ") && !item.text.startsWith(" ");
    text += needsSpace ? ` ${item.text}` : item.text;
  }

  return text;
}

export function assembleLines(page: PdfPageGeometry, pageNumber: number): PdfLine[] {
  const items = page.items
    .map((item) => ({ ...item, text: normalizeImported(item.text) }))
    .filter((item) => item.text !== "");

  if (items.length === 0) return [];

  const tolerance = Math.max(1, median(items.map((item) => item.height)) * BASELINE_TOLERANCE);
  const ordered = [...items].sort((a, b) => a.top - b.top || a.left - b.left);

  const groups: PdfTextItem[][] = [];
  let current: PdfTextItem[] = [ordered[0]];
  let baseline = ordered[0].top;

  for (const item of ordered.slice(1)) {
    if (Math.abs(item.top - baseline) <= tolerance) {
      current.push(item);
      continue;
    }
    groups.push(current);
    current = [item];
    baseline = item.top;
  }
  groups.push(current);

  const lines: PdfLine[] = [];

  for (const group of groups) {
    const sorted = [...group].sort((a, b) => a.left - b.left);
    const text = joinLine(sorted).trimEnd();
    if (text.trim() === "") continue;

    lines.push({
      text,
      page: pageNumber,
      top: median(sorted.map((item) => item.top)),
      left: Math.min(...sorted.map((item) => item.left)),
      right: Math.max(...sorted.map((item) => item.left + item.width)),
      height: median(sorted.map((item) => item.height)),
    });
  }

  return lines;
}
