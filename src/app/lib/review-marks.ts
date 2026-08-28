import type { Finding, Span } from "@/lucid";
import { findingId } from "./criteria";

export type ReviewMark = "seen" | "dismissed";

export type ReviewMarks = Readonly<Record<string, ReviewMark>>;

export const EMPTY_MARKS: ReviewMarks = Object.freeze({});

export type ReviewState = "pending" | ReviewMark;

export function reviewStateOf(marks: ReviewMarks, finding: Finding): ReviewState {
  return marks[findingId(finding)] ?? "pending";
}

export const isPending = (marks: ReviewMarks, finding: Finding): boolean =>
  marks[findingId(finding)] === undefined;

export function withMark(marks: ReviewMarks, finding: Finding, mark: ReviewMark | null): ReviewMarks {
  const id = findingId(finding);
  if (mark === null) {
    if (marks[id] === undefined) return marks;
    const next = { ...marks };
    delete next[id];
    return next;
  }
  if (marks[id] === mark) return marks;
  return { ...marks, [id]: mark };
}

export function withMarks(marks: ReviewMarks, findings: readonly Finding[], mark: ReviewMark | null): ReviewMarks {
  if (findings.length === 0) return marks;
  const next = { ...marks };
  let changed = false;
  for (const finding of findings) {
    const id = findingId(finding);
    if (mark === null) {
      if (next[id] !== undefined) {
        delete next[id];
        changed = true;
      }
    } else if (next[id] !== mark) {
      next[id] = mark;
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
    if (mark === "seen") seen++;
    else if (mark === "dismissed") dismissed++;
  }
  return { total: findings.length, pending: findings.length - seen - dismissed, seen, dismissed };
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

export function reanchorMarks(marks: ReviewMarks, target: Span, replacement: string): ReviewMarks {
  const delta = replacement.length - (target.end - target.start);
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

export function parseStoredMarks(value: unknown): ReviewMarks | null {
  if (value === undefined) return EMPTY_MARKS;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const out: Record<string, ReviewMark> = {};
  for (const [key, mark] of Object.entries(value as Record<string, unknown>)) {
    if (mark !== "seen" && mark !== "dismissed") return null;
    if (parseKey(key) === null) return null;
    out[key] = mark;
  }
  return out;
}
