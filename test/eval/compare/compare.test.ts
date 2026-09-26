import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  classify,
  compareArms,
  flipRate,
  labelKept,
  renderComparison,
  restrict,
  scoreArm,
  type Arm,
  type Checks,
} from "./compare";

const arm = (label: string, runs: number[], items: Record<string, boolean[]>, check = "c"): Arm => ({
  label,
  runs,
  items: new Map(
    Object.entries(items).map(([key, values]) => [
      `rewrite|${key}`,
      new Map(values.map((v, i): [number, Checks] => [runs[i], { [check]: v }])),
    ]),
  ),
});

describe("paired comparison — classification by majority (offline)", () => {
  it("classifies by 2/3 majority and sets apart an item unstable in the base", () => {
    expect(classify({ runs: 3, passes: 3 }, { runs: 3, passes: 1 })).toBe("regressao");
    expect(classify({ runs: 3, passes: 2 }, { runs: 3, passes: 0 })).toBe("regressao_fraca");
    expect(classify({ runs: 3, passes: 0 }, { runs: 3, passes: 2 })).toBe("melhora");
    expect(classify({ runs: 3, passes: 1 }, { runs: 3, passes: 3 })).toBe("melhora_fraca");
    expect(classify({ runs: 3, passes: 1 }, { runs: 3, passes: 0 })).toBe("preexistente");
    expect(classify({ runs: 3, passes: 2 }, { runs: 3, passes: 2 })).toBe("igual");
    expect(classify(null, { runs: 3, passes: 3 })).toBe("incompleto");
  });

  it("a problem that already failed in the base never becomes a candidate regression", () => {
    const base = arm("base", [1, 2, 3], { a: [false, false, false], b: [false, true, false] });
    const candidate = arm("cand", [1, 2, 3], { a: [false, false, false], b: [false, false, false] });
    const row = compareArms(base, candidate).checks.find((c) => c.check === "c")!;
    expect(row.counts.preexistente).toBe(2);
    expect(row.regressions).toEqual([]);
  });

  it("keeps each round's result next to the majority", () => {
    const base = arm("base", [1, 2, 3], { a: [true, true, true], b: [true, false, true] });
    const candidate = arm("cand", [1, 2, 3], { a: [false, true, false], b: [true, true, true] });
    const row = compareArms(base, candidate).checks.find((c) => c.check === "c")!;
    expect(row.basePerRun).toEqual([2, 1, 2]);
    expect(row.candidatePerRun).toEqual([1, 2, 1]);
    expect(row.regressions).toEqual(["a"]);
  });

  it("measures flips as items without unanimity across rounds", () => {
    const a = arm(
      "a",
      [1, 2, 3],
      { x: [true, true, true], y: [true, false, true], z: [false, false, false] },
      "verdict.sem_veto",
    );
    expect(flipRate(a, "rewrite")).toMatchObject({ items: 3, unstable: 1, unstableItems: ["y"] });
  });

  it("restricts an arm to a subset of rounds", () => {
    const a = arm("a", [1, 2, 3], { x: [true, false, true] });
    const only2 = restrict(a, [2], "a·r2");
    expect(compareArms(restrict(a, [1], "a·r1"), only2).checks[0].regressions).toEqual(["x"]);
  });

  it("compares the device label regardless of line breaks or spaces", () => {
    expect(labelKept("Art.\n19 O prazo será de dez dias.", "Art. 19 O prazo é de dez dias.")).toBe(true);
    expect(labelKept("§ 2º Na atualização...", "§  2º Na atualização...")).toBe(true);
    expect(labelKept("Art. 19 O prazo será de dez dias.", "O prazo é de dez dias.")).toBe(false);
    expect(labelKept("Art. 19 O prazo será de dez dias.", "Art. 18 O prazo é de dez dias.")).toBe(false);
    expect(labelKept("O prazo será de dez dias.", "Art. 19 O prazo é de dez dias.")).toBeUndefined();
  });
});

const BASELINE_CALLS = path.join(process.cwd(), "eval/baseline-gemini-2.5-flash/calls.jsonl");
const OUT_DIR = path.join(process.cwd(), "eval/comparacao-gemini-3.8");

describe.runIf(process.env.COMPARE_AA === "1")("A/A test — 2.5 against 2.5 (offline, zero calls)", () => {
  it("runs the comparison machine round against round and publishes the noise", async () => {
    const base = await scoreArm("gemini-2.5-flash", BASELINE_CALLS, [1, 2, 3]);
    const pairs: [number, number][] = [
      [1, 2],
      [1, 3],
      [2, 3],
    ];
    const sections: string[] = [
      "# Teste A/A: gemini-2.5-flash contra ele mesmo",
      "",
      "A máquina da comparação, aplicada rodada contra rodada do mesmo modelo, com a mesma configuração. " +
        "Tudo o que aparece como regressão ou melhora aqui é ruído do próprio 2.5. Com uma rodada por lado " +
        "não existe maioria nem item instável, então toda diferença aparece como regressão ou melhora forte.",
      "",
    ];
    const summary: Record<string, unknown> = {};
    for (const [a, b] of pairs) {
      const comparison = compareArms(restrict(base, [a], `2.5·r${a}`), restrict(base, [b], `2.5·r${b}`));
      sections.push(renderComparison(comparison).replace(/^# /u, "## "));
      summary[`r${a}×r${b}`] = comparison.checks
        .filter((c) => c.regressions.length + c.improvements.length > 0)
        .map((c) => ({
          suite: c.suite,
          check: c.check,
          regressions: c.regressions.length,
          improvements: c.improvements.length,
        }));
    }
    const flips = {
      rewrite: flipRate(base, "rewrite"),
      directed: flipRate(base, "directed"),
      probe: flipRate(base, "probe", "probe.agrees"),
    };
    sections.push("## Viradas nas 3 rodadas do 2.5");
    sections.push("");
    for (const [suite, f] of Object.entries(flips)) {
      sections.push(
        `- ${suite}: ${f.unstable}/${f.items} (${(100 * f.rate).toFixed(1)}%)${f.unstableItems.length ? ` · ${f.unstableItems.join(", ")}` : ""}`,
      );
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, "aa-2.5.md"), `${sections.join("\n")}\n`);
    fs.writeFileSync(path.join(OUT_DIR, "aa-2.5.json"), `${JSON.stringify({ summary, flips }, null, 2)}\n`);
    expect(base.items.size).toBeGreaterThan(0);
  }, 600_000);
});
