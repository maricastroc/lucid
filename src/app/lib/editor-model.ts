/**
 * Modelo do EDITOR — transforma `diagnostic.text` + findings em linhas numeradas (como um
 * editor de código), cada uma com seus segmentos anotados e os diagnósticos que a tocam
 * (para os marcadores de gutter). Função pura de view: só fatia a string nas fronteiras
 * que o engine já calculou; nunca reanalisa. Offsets são code units UTF-16 (NFC).
 */
import type { Finding } from "@/lucid";
import { severityRank } from "./criteria";

export interface LineSegment {
  text: string;
  start: number;
  end: number;
  inline?: Finding;
  passage?: Finding;
}

export interface DocLine {
  number: number;
  start: number;
  end: number;
  text: string;
  segments: LineSegment[];
  /** diagnósticos que intersectam esta linha (marcadores de gutter) */
  markers: Finding[];
}

function pickHighest(candidates: Finding[]): Finding | undefined {
  if (candidates.length === 0) return undefined;
  return candidates.reduce((best, f) => (severityRank(f.severity) > severityRank(best.severity) ? f : best));
}

export function buildLines(text: string, findings: readonly Finding[]): DocLine[] {
  const inlineF = findings.filter((f) => f.criterion !== "long_sentence");
  const passageF = findings.filter((f) => f.criterion === "long_sentence");

  const lines: DocLine[] = [];
  const rawLines = text.split("\n");
  let offset = 0;

  rawLines.forEach((lineText, i) => {
    const start = offset;
    const end = start + lineText.length;
    offset = end + 1; // pula o "\n"

    const markers = findings.filter(
      (f) => f.span.end > f.span.start && f.span.start < end && f.span.end > start,
    );

    const bset = new Set<number>([start, end]);
    for (const f of findings) {
      if (f.span.start > start && f.span.start < end) bset.add(f.span.start);
      if (f.span.end > start && f.span.end < end) bset.add(f.span.end);
    }
    const bounds = [...bset].sort((a, b) => a - b);

    const segments: LineSegment[] = [];
    for (let k = 0; k < bounds.length - 1; k++) {
      const a = bounds[k];
      const b = bounds[k + 1];
      if (b <= a) continue;
      const inline = pickHighest(inlineF.filter((f) => f.span.start <= a && f.span.end >= b));
      const passage = passageF.find((f) => f.span.start <= a && f.span.end >= b);
      segments.push({ text: text.slice(a, b), start: a, end: b, inline, passage });
    }

    lines.push({ number: i + 1, start, end, text: lineText, segments, markers });
  });

  return lines;
}
