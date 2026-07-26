import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(__dirname, "..");
const DEPCRUISE_BIN = path.join(REPO_ROOT, "node_modules", ".bin", "depcruise");

interface DependencyCruiserModule {
  rules?: { name: string; severity: string }[];
}

interface DependencyCruiserSummary {
  violations: { rule: { name: string; severity: string }; from: string; to: string }[];
  error: number;
  warn: number;
}

interface DependencyCruiserOutput {
  summary: DependencyCruiserSummary;
  modules: DependencyCruiserModule[];
}

function runDependencyCruiser(): DependencyCruiserOutput {
  const raw = execFileSync(
    DEPCRUISE_BIN,
    ["src", "--config", ".dependency-cruiser.cjs", "--output-type", "json"],
    { cwd: REPO_ROOT, encoding: "utf-8" },
  );
  return JSON.parse(raw) as DependencyCruiserOutput;
}

describe("architectural boundary (I1)", () => {
  it("violates no dependency-cruiser rule under src/", () => {
    const result = runDependencyCruiser();
    const errors = result.summary.violations.filter((v) => v.rule.severity === "error");

    if (errors.length > 0) {
      const detail = errors.map((v) => `  [${v.rule.name}] ${v.from} -> ${v.to}`).join("\n");
      throw new Error(`Boundary violations found:\n${detail}`);
    }

    expect(result.summary.error).toBe(0);
  });
});
