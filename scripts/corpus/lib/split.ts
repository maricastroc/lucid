import { sha256 } from "./jsonl";
import type { Split } from "./types";

export function splitOf(docId: string, seed: string, testFraction: number): Split {
  const digest = sha256(`${seed}:${docId}`);
  const bucket = Number.parseInt(digest.slice(0, 13), 16) / 2 ** 52;
  return bucket < testFraction ? "test" : "dev";
}

export function sealedEvalEnabled(): boolean {
  return process.env.LUCID_SEALED_EVAL === "1";
}
