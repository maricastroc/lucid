import type { Finding, Span } from "@/lucid";
import { metaFor, severityRank } from "./criteria";

export interface LineSegment {
  text: string;
  start: number;
  end: number;
  inline?: Finding;
  passage?: Finding;
  mark?: Span;
}

export interface DocLine {
  number: number;
  start: number;
  end: number;
  text: string;
  segments: LineSegment[];
  markers: Finding[];
}

function pickHighest(candidates: Finding[]): Finding | undefined {
  if (candidates.length === 0) return undefined;
  return candidates.reduce((best, f) => (severityRank(f.severity) > severityRank(best.severity) ? f : best));
}

export function segmentRange(
  text: string,
  findings: readonly Finding[],
  start: number,
  end: number,
  marks: readonly Span[] = [],
): LineSegment[] {
  const inlineF = findings.filter((f) => metaFor(f.criterion).channel !== "passage");
  const passageF = findings.filter((f) => metaFor(f.criterion).channel === "passage");

  const bset = new Set<number>([start, end]);
  for (const f of findings) {
    if (f.span.start > start && f.span.start < end) bset.add(f.span.start);
    if (f.span.end > start && f.span.end < end) bset.add(f.span.end);
  }
  for (const m of marks) {
    if (m.start > start && m.start < end) bset.add(m.start);
    if (m.end > start && m.end < end) bset.add(m.end);
  }
  const bounds = [...bset].sort((a, b) => a - b);

  const segments: LineSegment[] = [];
  for (let k = 0; k < bounds.length - 1; k++) {
    const a = bounds[k];
    const b = bounds[k + 1];
    if (b <= a) continue;
    const inline = pickHighest(inlineF.filter((f) => f.span.start <= a && f.span.end >= b));
    const passage = pickHighest(passageF.filter((f) => f.span.start <= a && f.span.end >= b));
    const mark = marks.find((m) => m.start <= a && m.end >= b);
    segments.push({ text: text.slice(a, b), start: a, end: b, inline, passage, mark });
  }
  return segments;
}

export function buildLines(text: string, findings: readonly Finding[], marks: readonly Span[] = []): DocLine[] {
  const lines: DocLine[] = [];
  const rawLines = text.split("\n");
  let offset = 0;

  rawLines.forEach((lineText, i) => {
    const start = offset;
    const end = start + lineText.length;
    offset = end + 1;

    const markers = findings.filter((f) => f.span.end > f.span.start && f.span.start < end && f.span.end > start);

    lines.push({
      number: i + 1,
      start,
      end,
      text: lineText,
      segments: segmentRange(text, findings, start, end, marks),
      markers,
    });
  });

  return lines;
}
