import { EMPTY_BRIEFING, type RawBlock, type ReaderBriefing } from "@/lucid";
import type { Mode } from "../components/document-view";
import type { LedgerEntry } from "./ledger";

const STORAGE_KEY = "lucid-workspace";
const SCHEMA_VERSION = 2;
const READABLE_VERSIONS: readonly number[] = [1, 2];

export interface WorkspaceSnapshot {
  readonly text: string;
  readonly blocks: readonly RawBlock[] | null;
  readonly ledger: readonly LedgerEntry[];
  readonly mode: Mode;
  readonly briefing: ReaderBriefing;
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

function isLedgerEntry(value: unknown): value is LedgerEntry {
  if (!isRecord(value)) return false;
  if (value.source !== "manual" && value.source !== "ai") return false;
  if (typeof value.label !== "string") return false;
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

  const blocks = value.blocks === null ? null : Array.isArray(value.blocks) && value.blocks.every(isRawBlock) ? (value.blocks as RawBlock[]) : undefined;
  if (blocks === undefined) return null;

  if (!Array.isArray(value.ledger) || !value.ledger.every(isLedgerEntry)) return null;

  const briefing = parseBriefing(value.briefing);
  if (briefing === null) return null;

  return { text: value.text, blocks, ledger: value.ledger as LedgerEntry[], mode: value.mode, briefing };
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, ...snapshot }));
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
