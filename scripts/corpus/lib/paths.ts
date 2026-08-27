import { join } from "node:path";
import type { CriterionId } from "./types";

export const CORPUS_ROOT = "corpus";
export const DEFAULT_VERSION = process.env.LUCID_CORPUS_VERSION ?? "v1";

export function versionDir(version: string = DEFAULT_VERSION): string {
  return join(CORPUS_ROOT, version);
}

export const paths = {
  sources: () => join(CORPUS_ROOT, "sources.json"),
  raw: (sha: string) => join(CORPUS_ROOT, "raw", `${sha.slice(0, 2)}`, `${sha}.bin`),
  manifest: (v?: string) => join(versionDir(v), "manifest.json"),
  fetched: (v?: string) => join(versionDir(v), "fetched.jsonl"),
  text: (docId: string, v?: string) => join(versionDir(v), "text", `${docId}.txt`),
  documents: (v?: string) => join(versionDir(v), "documents.jsonl"),
  passages: (v?: string) => join(versionDir(v), "passages.jsonl"),
  labels: (criterion: CriterionId, v?: string) => join(versionDir(v), "labels", `${criterion}.jsonl`),
  runs: (criterion: CriterionId, labelerId: string, v?: string) =>
    join(versionDir(v), "runs", criterion, `${labelerId}.jsonl`),
  review: (criterion: CriterionId, v?: string) => join(versionDir(v), "review", `${criterion}.jsonl`),
  queue: (criterion: CriterionId, v?: string) => join(versionDir(v), "review", `${criterion}.queue.jsonl`),
  testRuns: (v?: string) => join(versionDir(v), "test-runs.jsonl"),
  measurement: (v?: string) => join(versionDir(v), "measurement.json"),
};
