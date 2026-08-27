import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { CRITERIA } from "../../scripts/corpus/lib/criteria";
import perifrases from "@/locales/pt-BR/datasets/perifrases.pt.json";
import siglasConhecidas from "@/locales/pt-BR/datasets/siglas-conhecidas.pt.json";

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (path.endsWith(".ts")) out.push(path);
  }
  return out;
}

const PIPELINE_FILES = sourceFiles("scripts/corpus");

const FORBIDDEN_IMPORT =
  /from\s+["'](?:@\/|\.\.\/\.\.\/src\/)(lucid|report|app|exporters|importers|locales\/pt-BR\/(?:passes|datasets|metrics|services|readability))/;

describe("cerca: a rotulagem não vê o detector", () => {
  it("nenhum arquivo do pipeline importa pass, dataset ou motor", () => {
    const offenders = PIPELINE_FILES.filter((path) => FORBIDDEN_IMPORT.test(readFileSync(path, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("o pipeline não menciona analyze() nem nome de pass", () => {
    const offenders = PIPELINE_FILES.filter((path) => {
      const source = readFileSync(path, "utf8");
      return /\banalyzeDocument\b|\bPass\b\s*=|Pass\s*\}/.test(source);
    });
    expect(offenders).toEqual([]);
  });
});

describe("cerca: o prompt não carrega o léxico do projeto", () => {
  const definitions = CRITERIA.map((criterion) => `${criterion.label}\n${criterion.definition}`).join("\n\n");

  it("nenhuma perífrase do dataset aparece na definição do critério", () => {
    const leaked = (perifrases.entries as { phrase: string }[])
      .map((entry) => entry.phrase)
      .filter((phrase) => new RegExp(`(?<!\\p{L})${escapeRegex(phrase)}(?!\\p{L})`, "iu").test(definitions));
    expect(leaked).toEqual([]);
  });

  it("nenhuma sigla da lista de exclusão aparece na definição do critério", () => {
    const leaked = (siglasConhecidas.forms as string[]).filter((form) =>
      new RegExp(`(?<!\\p{L})${escapeRegex(form)}(?!\\p{L})`, "u").test(definitions),
    );
    expect(leaked).toEqual([]);
  });

  it("as definições existem e descrevem o fenômeno, não a implementação", () => {
    for (const criterion of CRITERIA) {
      expect(criterion.definition.length).toBeGreaterThan(200);
      expect(criterion.definition).toMatch(/NÃO marque/);
    }
  });
});

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
