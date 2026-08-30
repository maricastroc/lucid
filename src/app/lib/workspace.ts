import { DEFAULT_CONFIG, EMPTY_BRIEFING, type Config, type RawBlock, type ReaderBriefing } from "@/lucid";
import type { Mode } from "../components/document-view";
import type { LedgerEntry } from "./ledger";
import { parseBaseline, serializeBaseline, type Baseline } from "./baseline";
import { isProfileId, type ProfileId } from "./profiles";
import { parseStoredMarks, type ReviewMarks } from "./review-marks";

const STORAGE_KEY = "lucid-workspace";
const SCHEMA_VERSION = 9;
const READABLE_VERSIONS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export interface WorkspaceSnapshot {
  readonly text: string;
  readonly originalText: string | null;
  readonly blocks: readonly RawBlock[] | null;
  readonly ledger: readonly LedgerEntry[];
  readonly mode: Mode;
  readonly briefing: ReaderBriefing;
  readonly config: Config;
  readonly profileId: ProfileId;
  readonly reviewMarks: ReviewMarks;
  readonly guidedStep: string | null;
  readonly baseline?: Baseline | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRawBlock(value: unknown): value is RawBlock {
  if (!isRecord(value)) return false;
  if (value.kind === "paragraph") return typeof value.text === "string";
  if (value.kind === "heading") return typeof value.level === "number" && typeof value.text === "string";
  if (value.kind === "list") {
    return (
      typeof value.ordered === "boolean" &&
      Array.isArray(value.items) &&
      value.items.every((item) => typeof item === "string")
    );
  }
  return false;
}

function isAttribution(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const { region, changes } = value;
  if (!isRecord(region)) return false;
  if (typeof region.start !== "number" || typeof region.end !== "number" || typeof region.length !== "number") {
    return false;
  }
  if (!Array.isArray(changes)) return false;
  return changes.every(
    (change) =>
      isRecord(change) &&
      typeof change.criterion === "string" &&
      typeof change.before === "number" &&
      typeof change.after === "number" &&
      (change.scope === "region" || change.scope === "indirect") &&
      typeof change.kind === "string",
  );
}

const LEDGER_SOURCES: readonly string[] = ["manual", "ai", "glossary", "typing"];

function isLedgerEntry(value: unknown): value is LedgerEntry {
  if (!isRecord(value)) return false;
  if (typeof value.source !== "string" || !LEDGER_SOURCES.includes(value.source)) return false;
  if (value.attribution !== undefined && !isAttribution(value.attribution)) return false;
  if (typeof value.label !== "string") return false;
  if (value.proposerId !== undefined && typeof value.proposerId !== "string") return false;
  if (typeof value.burdenBefore !== "number" || typeof value.burdenAfter !== "number") return false;
  if (value.before !== undefined && typeof value.before !== "string") return false;
  if (value.after !== undefined && typeof value.after !== "string") return false;
  return true;
}

function parseBriefing(value: unknown): ReaderBriefing | null {
  if (value === undefined) return EMPTY_BRIEFING;
  if (!isRecord(value)) return null;
  const { audience, purpose, priorKnowledge, mustFind } = value;
  if (typeof audience !== "string" || typeof purpose !== "string" || typeof priorKnowledge !== "string") return null;
  if (!Array.isArray(mustFind) || !mustFind.every((item) => typeof item === "string")) return null;
  return { audience, purpose, priorKnowledge, mustFind: mustFind as string[] };
}

function parseConfig(value: unknown): Config | null {
  if (value === undefined) return DEFAULT_CONFIG;
  if (!isRecord(value)) return null;
  const merged = { ...DEFAULT_CONFIG } as unknown as Record<string, Record<string, unknown>>;
  const base = DEFAULT_CONFIG as unknown as Record<string, Record<string, unknown>>;
  for (const [section, defaults] of Object.entries(base)) {
    const incoming = (value as Record<string, unknown>)[section];
    if (incoming === undefined) continue;
    if (!isRecord(incoming)) return null;
    const next: Record<string, unknown> = { ...defaults };
    for (const [field, fallback] of Object.entries(defaults)) {
      const candidate = incoming[field];
      if (candidate === undefined) continue;
      if (typeof candidate !== typeof fallback) return null;
      if (typeof candidate === "number" && !Number.isFinite(candidate)) return null;
      next[field] = candidate;
    }
    merged[section] = next;
  }
  return merged as unknown as Config;
}

function parse(raw: string): WorkspaceSnapshot | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  if (typeof value.version !== "number" || !READABLE_VERSIONS.includes(value.version)) return null;
  if (typeof value.text !== "string") return null;
  if (value.mode !== "audit" && value.mode !== "edit") return null;

  const blocks =
    value.blocks === null
      ? null
      : Array.isArray(value.blocks) && value.blocks.every(isRawBlock)
        ? (value.blocks as RawBlock[])
        : undefined;
  if (blocks === undefined) return null;

  if (!Array.isArray(value.ledger) || !value.ledger.every(isLedgerEntry)) return null;

  const briefing = parseBriefing(value.briefing);
  if (briefing === null) return null;

  const config = parseConfig(value.config);
  if (config === null) return null;

  const reviewMarks = parseStoredMarks(value.reviewMarks);
  if (reviewMarks === null) return null;

  if (value.originalText !== undefined && value.originalText !== null && typeof value.originalText !== "string") {
    return null;
  }

  if (value.guidedStep !== undefined && value.guidedStep !== null && typeof value.guidedStep !== "string") {
    return null;
  }

  return {
    baseline: parseAttachedBaseline(value.baseline),
    profileId: isProfileId(value.profileId) ? value.profileId : "base",
    text: value.text,
    originalText: typeof value.originalText === "string" ? value.originalText : null,
    blocks,
    ledger: value.ledger as LedgerEntry[],
    mode: value.mode,
    briefing,
    config,
    reviewMarks,
    guidedStep: typeof value.guidedStep === "string" ? value.guidedStep : null,
  };
}

function parseAttachedBaseline(value: unknown): Baseline | null {
  if (typeof value !== "string") return null;
  const parsed = parseBaseline(value);
  return parsed.ok ? parsed.baseline : null;
}

export function readWorkspace(): WorkspaceSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? null : parse(raw);
  } catch {
    return null;
  }
}

let saveFailed = false;
const listeners = new Set<() => void>();

function setSaveFailed(value: boolean): void {
  if (saveFailed === value) return;
  saveFailed = value;
  for (const listener of listeners) listener();
}

export function subscribeSaveStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSaveFailed(): boolean {
  return saveFailed;
}

export function writeWorkspace(snapshot: WorkspaceSnapshot): void {
  try {
    const { baseline = null, ...rest } = snapshot;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: SCHEMA_VERSION,
        ...rest,
        baseline: baseline === null ? null : serializeBaseline(baseline),
      }),
    );
    setSaveFailed(false);
  } catch {
    setSaveFailed(true);
  }
}

export function clearWorkspace(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
  setSaveFailed(false);
}
