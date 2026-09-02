import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyze } from "@/lucid";
import { candidateById } from "./candidates";
import { resultRows } from "./runner";
import { loadEvalTargets } from "./targets";

const OUT_DIR = path.join(process.cwd(), "eval/rewrite-ab");
const RUNS = path.join(OUT_DIR, "runs.jsonl");
const STAMP = path.join(OUT_DIR, "runs.stamp.json");
const present = fs.existsSync(RUNS);

const currentStamp = (): { lucidVersion: string; dataHash: string; configHash: string } => {
  const meta = analyze("O pedido foi aprovado pelo diretor.").meta;
  return { lucidVersion: meta.lucidVersion, dataHash: meta.dataHash, configHash: meta.configHash };
};

const recordedStamp = (): Record<string, unknown> | null =>
  fs.existsSync(STAMP) ? (JSON.parse(fs.readFileSync(STAMP, "utf-8")) as Record<string, unknown>) : null;

describe.runIf(present)("o prompt medido é o prompt que sai", () => {
  it("declara sob qual régua o A/B foi gravado, em vez de deixar a data implícita", () => {
    expect(recordedStamp(), `falta ${path.relative(process.cwd(), STAMP)}`).not.toBeNull();
  });

  it("reconstrói cada prompt gravado com o mesmo tamanho, quando a régua é a mesma", () => {
    const recorded = recordedStamp();
    const current = currentStamp();
    const sameRuler =
      recorded !== null &&
      recorded.lucidVersion === current.lucidVersion &&
      recorded.dataHash === current.dataHash &&
      recorded.configHash === current.configHash;

    if (!sameRuler) {
      expect(recorded?.stale, "o carimbo divergente precisa dizer que a medição está vencida").toBe(true);
      return;
    }

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
