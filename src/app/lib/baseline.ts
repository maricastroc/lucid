import {
  analyze,
  analyzeDocument,
  buildStructuredDocument,
  type Config,
  type Diagnostic,
  type DiagnosticMeta,
  ptDocumentServices,
  type Finding,
  hashConfig,
  isRawBlock,
  type OrgTerm,
  type RawBlock,
  type Severity,
  stableHash,
} from "@/lucid";
import { balance, type CriterionBalance } from "./attribution";
import { findingId } from "./criteria";
import { isProfileId, type ProfileId } from "./profiles";
import { parseOrgTerms } from "./workspace";
import type { ReviewMarkKind, ReviewMarks } from "./review-marks";

export const BASELINE_SCHEMA_VERSION = 2;

const READABLE_SCHEMA_VERSIONS: readonly number[] = [1, 2];

export interface BaselineDecision {
  readonly criterion: string;
  readonly excerpt: string;
  readonly kind: ReviewMarkKind;
  readonly note: string | null;
}

export interface BaselineFinding {
  readonly criterion: string;
  readonly excerpt: string;
  readonly severity: Severity;
}

export interface Baseline {
  readonly schemaVersion: number;
  readonly title: string;
  readonly savedAt: string;
  readonly source: {
    readonly text: string;
    readonly blocks: readonly RawBlock[] | null;
    readonly textHash: string;
  };
  readonly historical: {
    readonly stamp: DiagnosticMeta;
    readonly profileId: ProfileId;
    readonly config: Config;
    readonly findings: readonly BaselineFinding[];
  };
  readonly decisions: readonly BaselineDecision[];
  readonly vocabulary: readonly OrgTerm[];
}

export const STAMP_FIELDS = ["lucidVersion", "localeId", "configHash", "dataHash", "standardVersion"] as const;

export type StampField = (typeof STAMP_FIELDS)[number];

export type BaselineRefusal = "unreadable" | "schema" | "locale";

export function foldExcerpt(text: string): string {
  return text.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

export function textHashOf(text: string): string {
  return stableHash(text.normalize("NFC"));
}

export function buildBaseline(input: {
  title: string;
  savedAt: string;
  text: string;
  blocks: readonly RawBlock[] | null;
  diagnostic: Diagnostic;
  findings: readonly Finding[];
  profileId: ProfileId;
  config: Config;
  marks: ReviewMarks;
  vocabulary: readonly OrgTerm[];
}): Baseline {
  const decisions: BaselineDecision[] = [];
  for (const finding of input.findings) {
    const mark = input.marks[findingId(finding)];
    if (mark === undefined) continue;
    decisions.push({
      criterion: finding.criterion,
      excerpt: finding.span.text,
      kind: mark.kind,
      note: mark.note ?? null,
    });
  }

  return {
    schemaVersion: BASELINE_SCHEMA_VERSION,
    title: input.title.trim(),
    savedAt: input.savedAt,
    source: { text: input.text, blocks: input.blocks, textHash: textHashOf(input.text) },
    historical: {
      stamp: input.diagnostic.meta,
      profileId: input.profileId,
      config: input.config,
      findings: input.findings.map((f) => ({
        criterion: f.criterion,
        excerpt: f.span.text,
        severity: f.severity,
      })),
    },
    decisions,
    vocabulary: input.vocabulary,
  };
}

export interface StillThere {
  readonly criterion: string;
  readonly excerpt: string;
  readonly severity: Severity;
  readonly count: number;
  readonly decision: BaselineDecision | null;
}

export interface BaselineComparison {
  readonly title: string;
  readonly savedAt: string;
  readonly divergence: readonly StampField[];
  readonly historicalCount: number;
  readonly rebasedCount: number;
  readonly rebased: readonly Finding[];
  readonly byCriterion: readonly CriterionBalance[];
  readonly stillThere: readonly StillThere[];
  readonly stillThereCount: number;
}

function countsByExcerpt(items: readonly { criterion: string; excerpt: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = `${item.criterion} ${foldExcerpt(item.excerpt)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function divergenceOf(historical: DiagnosticMeta, current: DiagnosticMeta): StampField[] {
  return STAMP_FIELDS.filter((field) => historical[field] !== current[field]);
}

export function rebaseline(baseline: Baseline, config: Config): readonly Finding[] {
  const blocks = baseline.source.blocks;
  if (blocks === null) return analyze(baseline.source.text, config).findings;
  return analyzeDocument(buildStructuredDocument(blocks, ptDocumentServices), config).findings;
}

export function compareToBaseline(baseline: Baseline, current: Diagnostic, config: Config): BaselineComparison {
  const rebased = rebaseline(baseline, config);

  const before = countsByExcerpt(rebased.map((f) => ({ criterion: f.criterion, excerpt: f.span.text })));
  const after = countsByExcerpt(current.findings.map((f) => ({ criterion: f.criterion, excerpt: f.span.text })));

  const decisions = new Map<string, BaselineDecision>();
  for (const decision of baseline.decisions) {
    decisions.set(`${decision.criterion} ${foldExcerpt(decision.excerpt)}`, decision);
  }

  const seen = new Set<string>();
  const stillThere: StillThere[] = [];
  for (const finding of rebased) {
    const key = `${finding.criterion} ${foldExcerpt(finding.span.text)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const count = Math.min(before.get(key) ?? 0, after.get(key) ?? 0);
    if (count === 0) continue;
    stillThere.push({
      criterion: finding.criterion,
      excerpt: finding.span.text,
      severity: finding.severity,
      count,
      decision: decisions.get(key) ?? null,
    });
  }

  return {
    title: baseline.title,
    savedAt: baseline.savedAt,
    divergence: divergenceOf(baseline.historical.stamp, current.meta),
    historicalCount: baseline.historical.findings.length,
    rebasedCount: rebased.length,
    rebased,
    byCriterion: balance(rebased, current.findings),
    stillThere,
    stillThereCount: stillThere.reduce((sum, item) => sum + item.count, 0),
  };
}

export const configDiffers = (comparison: BaselineComparison): boolean => comparison.divergence.includes("configHash");

export const profileMatches = (baseline: Baseline, config: Config): boolean =>
  hashConfig(baseline.historical.config) === hashConfig(config);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const SEVERITIES: readonly string[] = ["info", "warning", "error"];
const KINDS: readonly string[] = ["seen", "dismissed"];

function parseRawBlocks(value: unknown): readonly RawBlock[] | null | undefined {
  if (value === null) return null;
  if (!Array.isArray(value)) return undefined;
  return value.every(isRawBlock) ? (value as RawBlock[]) : undefined;
}

function parseStamp(value: unknown): DiagnosticMeta | null {
  if (!isRecord(value)) return null;
  for (const field of STAMP_FIELDS) if (typeof value[field] !== "string") return null;
  return value as unknown as DiagnosticMeta;
}

export type BaselineParse = { ok: true; baseline: Baseline } | { ok: false; refusal: BaselineRefusal };

const refuse = (refusal: BaselineRefusal): BaselineParse => ({ ok: false, refusal });

export function parseBaseline(raw: string): BaselineParse {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return refuse("unreadable");
  }
  if (!isRecord(value)) return refuse("unreadable");

  if (typeof value.schemaVersion !== "number") return refuse("unreadable");
  if (!READABLE_SCHEMA_VERSIONS.includes(value.schemaVersion)) return refuse("schema");

  const { title, savedAt, source, historical, decisions } = value;
  if (typeof title !== "string" || title.trim() === "") return refuse("unreadable");
  if (typeof savedAt !== "string") return refuse("unreadable");

  if (!isRecord(source) || typeof source.text !== "string" || typeof source.textHash !== "string") {
    return refuse("unreadable");
  }
  const blocks = parseRawBlocks(source.blocks);
  if (blocks === undefined) return refuse("unreadable");
  if (textHashOf(source.text) !== source.textHash) return refuse("unreadable");

  if (!isRecord(historical)) return refuse("unreadable");
  const stamp = parseStamp(historical.stamp);
  if (stamp === null) return refuse("unreadable");
  if (!isProfileId(historical.profileId)) return refuse("unreadable");
  if (!isRecord(historical.config)) return refuse("unreadable");
  if (!Array.isArray(historical.findings)) return refuse("unreadable");
  for (const finding of historical.findings) {
    if (!isRecord(finding)) return refuse("unreadable");
    if (typeof finding.criterion !== "string" || typeof finding.excerpt !== "string") return refuse("unreadable");
    if (!SEVERITIES.includes(finding.severity as string)) return refuse("unreadable");
  }

  if (!Array.isArray(decisions)) return refuse("unreadable");
  for (const decision of decisions) {
    if (!isRecord(decision)) return refuse("unreadable");
    if (typeof decision.criterion !== "string" || typeof decision.excerpt !== "string") return refuse("unreadable");
    if (!KINDS.includes(decision.kind as string)) return refuse("unreadable");
    if (decision.note !== null && typeof decision.note !== "string") return refuse("unreadable");
  }

  const vocabulary = value.vocabulary === undefined ? [] : parseOrgTerms(value.vocabulary);
  if (vocabulary === null) return refuse("unreadable");

  return { ok: true, baseline: { ...(value as unknown as Baseline), vocabulary } };
}

export function acceptBaseline(baseline: Baseline, current: DiagnosticMeta): BaselineRefusal | null {
  return baseline.historical.stamp.localeId === current.localeId ? null : "locale";
}

export function serializeBaseline(baseline: Baseline): string {
  return JSON.stringify(baseline, null, 2);
}
