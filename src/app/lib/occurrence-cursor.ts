import type { BriefingCheck, Span } from "@/lucid";

export interface OccurrenceCursor {
  readonly expression: string;
  readonly index: number;
}

export const occurrenceKey = (span: Span): string => `${span.start}-${span.end}`;

export function occurrencesOf(check: BriefingCheck, expression: string): readonly Span[] {
  return check.coverage.find((item) => item.expression === expression)?.occurrences ?? [];
}

export function resolveCursor(
  check: BriefingCheck,
  cursor: OccurrenceCursor | null,
): { spans: readonly Span[]; index: number; active: Span | null } {
  if (cursor === null) return { spans: [], index: -1, active: null };

  const spans = occurrencesOf(check, cursor.expression);
  if (spans.length === 0) return { spans: [], index: -1, active: null };

  const index = Math.min(Math.max(cursor.index, 0), spans.length - 1);
  return { spans, index, active: spans[index] };
}

export function stepCursor(cursor: OccurrenceCursor, total: number, delta: number): OccurrenceCursor {
  if (total <= 0) return cursor;
  const index = (((cursor.index + delta) % total) + total) % total;
  return { expression: cursor.expression, index };
}
