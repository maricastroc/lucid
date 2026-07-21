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

describe("fronteira arquitetural (I1)", () => {
  it("não viola nenhuma regra de dependency-cruiser em src/", () => {
    const result = runDependencyCruiser();
    const erros = result.summary.violations.filter((v) => v.rule.severity === "error");

    if (erros.length > 0) {
      const detalhe = erros.map((v) => `  [${v.rule.name}] ${v.from} -> ${v.to}`).join("\n");
      throw new Error(`Violações de fronteira encontradas:\n${detalhe}`);
    }

    expect(result.summary.error).toBe(0);
  });
});
