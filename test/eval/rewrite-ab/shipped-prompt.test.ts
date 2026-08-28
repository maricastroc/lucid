import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { candidateById } from "./candidates";
import { resultRows } from "./runner";
import { loadEvalTargets } from "./targets";

const RUNS = path.join(process.cwd(), "eval/rewrite-ab/runs.jsonl");
const present = fs.existsSync(RUNS);

describe.runIf(present)("o prompt medido é o prompt que sai", () => {
  it("reconstrói cada prompt gravado com o mesmo tamanho", () => {
    const byId = new Map(loadEvalTargets(500).map((t) => [t.id, t]));
    const rows = resultRows(RUNS).filter((r) => r.context === "full");
    expect(rows.length).toBeGreaterThan(0);

    const diverged: string[] = [];
    for (const row of rows) {
      const target = byId.get(row.targetId);
      const candidate = candidateById(row.candidate);
      if (!target || !candidate) continue;
      const rebuilt = candidate.build(target, target.text).length;
      if (rebuilt !== row.promptChars) {
        diverged.push(`${row.candidate} · ${row.targetId}: gravado ${row.promptChars}, hoje ${rebuilt}`);
      }
    }
    expect(diverged, `prompt divergiu do que foi medido:\n${diverged.join("\n")}`).toEqual([]);
  });
});
