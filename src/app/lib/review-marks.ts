import type { Finding, Span } from "@/lucid";
import { findingId } from "./criteria";

export type ReviewMarkKind = "seen" | "dismissed";

export interface ReviewMark {
  readonly kind: ReviewMarkKind;
  readonly note?: string;
}

export type ReviewMarks = Readonly<Record<string, ReviewMark>>;

export const EMPTY_MARKS: ReviewMarks = Object.freeze({});

export type ReviewState = "pending" | ReviewMarkKind;

export function reviewStateOf(marks: ReviewMarks, finding: Finding): ReviewState {
  return marks[findingId(finding)]?.kind ?? "pending";
}

export function noteOf(marks: ReviewMarks, finding: Finding): string {
  return marks[findingId(finding)]?.note ?? "";
}

export const isPending = (marks: ReviewMarks, finding: Finding): boolean => marks[findingId(finding)] === undefined;

export function withMark(marks: ReviewMarks, finding: Finding, kind: ReviewMarkKind | null): ReviewMarks {
  const id = findingId(finding);
  const current = marks[id];

  if (kind === null) {
    if (current === undefined) return marks;
    const next = { ...marks };
    delete next[id];
    return next;
  }

  if (current !== undefined && current.kind === kind) return marks;
  const note = current?.note;
  return { ...marks, [id]: note === undefined ? { kind } : { kind, note } };
}

export function withNote(marks: ReviewMarks, finding: Finding, note: string): ReviewMarks {
  const id = findingId(finding);
  const current = marks[id];
  if (current === undefined) return marks;

  if ((current.note ?? "") === note) return marks;
  const blank = note.trim() === "";
  if (blank && current.note === undefined) return marks;
  return { ...marks, [id]: blank ? { kind: current.kind } : { kind: current.kind, note } };
}

export function withMarks(marks: ReviewMarks, findings: readonly Finding[], kind: ReviewMarkKind | null): ReviewMarks {
  if (findings.length === 0) return marks;
  const next = { ...marks };
  let changed = false;
  for (const finding of findings) {
    const id = findingId(finding);
    const current = next[id];
    if (kind === null) {
      if (current !== undefined) {
        delete next[id];
        changed = true;
      }
    } else if (current === undefined || current.kind !== kind) {
      const note = current?.note;
      next[id] = note === undefined ? { kind } : { kind, note };
      changed = true;
    }
  }
  return changed ? next : marks;
}

export interface MarkTally {
  readonly total: number;
  readonly pending: number;
  readonly seen: number;
  readonly dismissed: number;
}

export function tally(marks: ReviewMarks, findings: readonly Finding[]): MarkTally {
  let seen = 0;
  let dismissed = 0;
  for (const finding of findings) {
    const mark = marks[findingId(finding)];
    if (mark?.kind === "seen") seen++;
    else if (mark?.kind === "dismissed") dismissed++;
  }
  return { total: findings.length, pending: findings.length - seen - dismissed, seen, dismissed };
}

export interface KeptPoint {
  readonly finding: Finding;
  readonly kind: ReviewMarkKind;
  readonly note: string | null;
}

export function keptPoints(marks: ReviewMarks, findings: readonly Finding[]): readonly KeptPoint[] {
  const out: KeptPoint[] = [];
  for (const finding of findings) {
    const mark = marks[findingId(finding)];
    if (mark === undefined) continue;
    out.push({ finding, kind: mark.kind, note: mark.note ?? null });
  }
  return out;
}

function parseKey(key: string): { criterion: string; start: number; end: number } | null {
  const end = key.lastIndexOf(":");
  if (end <= 0) return null;
  const start = key.lastIndexOf(":", end - 1);
  if (start <= 0) return null;
  const startOffset = Number(key.slice(start + 1, end));
  const endOffset = Number(key.slice(end + 1));
  if (!Number.isInteger(startOffset) || !Number.isInteger(endOffset)) return null;
  return { criterion: key.slice(0, start), start: startOffset, end: endOffset };
}

export function reanchorMarks(marks: ReviewMarks, target: Span, delta: number): ReviewMarks {
  const next: Record<string, ReviewMark> = {};
  for (const [key, mark] of Object.entries(marks)) {
    const parsed = parseKey(key);
    if (parsed === null) continue;
    if (parsed.end <= target.start) {
      next[key] = mark;
      continue;
    }
    if (parsed.start >= target.end) {
      next[`${parsed.criterion}:${parsed.start + delta}:${parsed.end + delta}`] = mark;
      continue;
    }
  }
  return next;
}

export function pruneMarks(marks: ReviewMarks, findings: readonly Finding[]): ReviewMarks {
  const live = new Set(findings.map(findingId));
  const next: Record<string, ReviewMark> = {};
  let dropped = false;
  for (const [key, mark] of Object.entries(marks)) {
    if (live.has(key)) next[key] = mark;
    else dropped = true;
  }
  return dropped ? next : marks;
}

const isKind = (value: unknown): value is ReviewMarkKind => value === "seen" || value === "dismissed";

export function parseStoredMarks(value: unknown): ReviewMarks | null {
  if (value === undefined) return EMPTY_MARKS;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const out: Record<string, ReviewMark> = {};
  for (const [key, stored] of Object.entries(value as Record<string, unknown>)) {
    if (parseKey(key) === null) return null;

    if (isKind(stored)) {
      out[key] = { kind: stored };
      continue;
    }
    if (typeof stored !== "object" || stored === null || Array.isArray(stored)) return null;

    const { kind, note } = stored as Record<string, unknown>;
    if (!isKind(kind)) return null;
    if (note !== undefined && typeof note !== "string") return null;
    out[key] = note === undefined || note.trim() === "" ? { kind } : { kind, note };
  }
  return out;
}
