import type { Span } from "@/lucid";

export const WINDOWS = [1, 2, 3] as const;

function paragraphRanges(text: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const block of text.split(/\n{2,}/u)) {
    const start = text.indexOf(block, cursor);
    ranges.push({ start, end: start + block.length });
    cursor = start + block.length;
  }
  return ranges;
}

export function windowAround(text: string, target: Span, paragraphs: number): string {
  const ranges = paragraphRanges(text);
  const hit = ranges.findIndex((r) => r.start <= target.start && r.end >= target.end);
  const i = hit === -1 ? ranges.findIndex((r) => r.end >= target.start) : hit;
  if (i === -1) return target.text;
  const from = ranges[Math.max(0, i - paragraphs)];
  const to = ranges[Math.min(ranges.length - 1, i + paragraphs)];
  return text.slice(from.start, to.end);
}
