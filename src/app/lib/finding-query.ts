import type { Diagnostic, Finding, Severity } from "@/lucid";
import { CRITERION_ORDER, criterionRank, isSafe, severityRank } from "./criteria";
import { isPending, reviewStateOf, type ReviewMarks } from "./review-marks";

export type Bucket = "all" | "safe" | "human";
export type StateFilter = "all" | "pending" | "seen" | "dismissed";
export type SortOrder = "severity" | "document";

export interface FindingQuery {
  readonly criterion: string | null;
  readonly bucket: Bucket;
  readonly state: StateFilter;
  readonly search: string;
  readonly order: SortOrder;
}

export const EMPTY_SEARCH = "";

export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesSearch(finding: Finding, needle: string): boolean {
  if (needle === "") return true;
  return normalize(finding.span.text).includes(needle);
}

function matchesBucket(finding: Finding, bucket: Bucket): boolean {
  if (bucket === "all") return true;
  return bucket === "safe" ? isSafe(finding) : !isSafe(finding);
}

function matchesState(finding: Finding, state: StateFilter, marks: ReviewMarks): boolean {
  if (state === "all") return true;
  if (state === "pending") return isPending(marks, finding);
  return reviewStateOf(marks, finding) === state;
}

export interface FindingGroup {
  readonly criterion: string;
  readonly items: readonly Finding[];
  readonly filteredOut: number;
  readonly maxSeverity: Severity;
}

const SEVERITY_BY_RANK: readonly Severity[] = ["info", "warning", "error"];

export function queryFindings(
  all: readonly Finding[],
  query: FindingQuery,
  marks: ReviewMarks,
): { groups: readonly FindingGroup[]; visible: readonly Finding[] } {
  const needle = normalize(query.search);

  const byCriterion = new Map<string, { kept: Finding[]; filteredOut: number; maxRank: number; first: number }>();
  for (const finding of all) {
    const entry = byCriterion.get(finding.criterion) ?? {
      kept: [],
      filteredOut: 0,
      maxRank: 0,
      first: Number.MAX_SAFE_INTEGER,
    };
    entry.maxRank = Math.max(entry.maxRank, severityRank(finding.severity));
    const kept =
      (query.criterion === null || query.criterion === finding.criterion) &&
      matchesBucket(finding, query.bucket) &&
      matchesState(finding, query.state, marks) &&
      matchesSearch(finding, needle);
    if (kept) {
      entry.kept.push(finding);
      entry.first = Math.min(entry.first, finding.span.start);
    } else {
      entry.filteredOut++;
    }
    byCriterion.set(finding.criterion, entry);
  }

  const groups: FindingGroup[] = [];
  for (const [criterion, entry] of byCriterion) {
    if (entry.kept.length === 0) continue;
    const items = [...entry.kept].sort((a, b) => a.span.start - b.span.start);
    groups.push({
      criterion,
      items,
      filteredOut: entry.filteredOut,
      maxSeverity: SEVERITY_BY_RANK[entry.maxRank],
    });
  }

  groups.sort((a, b) => {
    if (query.order === "document") {
      return a.items[0].span.start - b.items[0].span.start;
    }
    const bySeverity = severityRank(b.maxSeverity) - severityRank(a.maxSeverity);
    if (bySeverity !== 0) return bySeverity;
    const byVolume = b.items.length - a.items.length;
    if (byVolume !== 0) return byVolume;
    return criterionRank(a.criterion) - criterionRank(b.criterion);
  });

  return { groups, visible: groups.flatMap((g) => g.items) };
}

export function distinctTexts(items: readonly Finding[]): number {
  return new Set(items.map((f) => normalize(f.span.text))).size;
}

export function occurrenceCount(diagnostic: Diagnostic, criterion: string): number {
  const score = diagnostic.score.byCriterion.find((entry) => entry.criterion === criterion);
  return score ? score.count.info + score.count.warning + score.count.error : 0;
}

export function cleanCriteria(diagnostic: Diagnostic): readonly string[] {
  return CRITERION_ORDER.filter((criterion) => occurrenceCount(diagnostic, criterion) === 0);
}

export function hiddenHighlightCount(
  groups: readonly FindingGroup[],
  hidden: ReadonlySet<string>,
): number {
  return groups.filter((group) => hidden.has(group.criterion)).length;
}
