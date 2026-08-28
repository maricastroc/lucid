import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { IARIS_SOURCE, INCOMPATIBLE, PATCHED, VERBATIM_RANGES } from "@/report/rewrite";
import {
  buildIarisListGate2,
  buildIarisPort,
  buildIarisWithBriefing,
  IARIS_LIST_RULE,
} from "./iaris-baseline";
import { loadEvalTargets } from "./targets";
const IARIS_FILE = path.join(os.homedir(), "Desktop/@dev/iaris/src/core/prompt/system-prompt.ts");
const present = fs.existsSync(IARIS_FILE);

const EDITED = new Set(["MARKUP", "RULE1", "ROBUSTNESS"]);

function sourcePrompt(): string {
  const source = fs.readFileSync(IARIS_FILE, "utf8");
  const match = source.match(/export const SYSTEM_PROMPT_V20 = `([\s\S]*?)`;\n/u);
  if (!match) throw new Error("SYSTEM_PROMPT_V20 não encontrado no arquivo da IAris");
  return match[1].replace(/\\`/gu, "`").replace(/\\\\/gu, "\\");
}

const promptFor = (context = "«contexto»"): string => buildIarisPort(loadEvalTargets(1)[0], context);

describe.runIf(present)("IAris baseline — the copy still matches the source", () => {
  it("is still v20 with the recorded fingerprint", () => {
    const source = fs.readFileSync(IARIS_FILE, "utf8");
    expect(source).toContain(`export const PROMPT_VERSION = "${IARIS_SOURCE.version}"`);

    const fingerprint = createHash("sha256").update(sourcePrompt(), "utf8").digest("hex").slice(0, 12);
    expect(fingerprint).toBe(IARIS_SOURCE.fingerprint);
  });

  it("every unedited block is byte-identical to the lines it claims", () => {
    const lines = sourcePrompt().split("\n");
    const prompt = promptFor();
    for (const [name, [from, to]] of Object.entries(VERBATIM_RANGES)) {
      if (EDITED.has(name)) continue;
      const block = lines.slice(from - 1, to).join("\n");
      expect(prompt, `bloco ${name} (linhas ${from}–${to}) divergiu da fonte`).toContain(block);
    }
  });

  it("each edited block carries exactly the edit PATCHED declares — nothing more", () => {
    const lines = sourcePrompt().split("\n");
    const at = (name: string): string =>
      lines.slice(VERBATIM_RANGES[name][0] - 1, VERBATIM_RANGES[name][1]).join("\n");
    const prompt = promptFor();

    expect(at("MARKUP")).toContain('"simplifiedText"');
    expect(prompt).toContain(at("MARKUP").replace(/"simplifiedText"/gu, '"reescrita"'));
    expect(prompt).not.toContain("simplifiedText");

    expect(at("RULE1")).toContain('e registrada em "preservedTerms[].reason"');
    expect(prompt).toContain(at("RULE1").replace(' e registrada em "preservedTerms[].reason"', ""));
    expect(prompt).not.toContain("preservedTerms");

    expect(prompt).toContain(at("ROBUSTNESS").split("5. REFERÊNCIAS NORMATIVAS")[0].trimEnd());
    expect(at("ROBUSTNESS")).toContain("movidas para uma nota");
    expect(prompt).not.toContain("movidas para uma nota");
  });
});

describe("IAris baseline — the two variants", () => {
  it("differ by exactly the list bullet", () => {
    const target = loadEvalTargets(1)[0];
    expect(IARIS_LIST_RULE).toContain("três ou mais itens");
    expect(buildIarisPort(target, "«c»")).toContain(IARIS_LIST_RULE);
    expect(buildIarisWithBriefing(target, "«c»")).not.toContain(IARIS_LIST_RULE);
  });

  it("only the briefing variant carries the engine's findings", () => {
    const target = loadEvalTargets(1)[0];
    expect(buildIarisPort(target, "«c»")).not.toContain("BRIEFING DA ENGINE");
    expect(buildIarisWithBriefing(target, "«c»")).toContain("BRIEFING DA ENGINE");
  });

  it("closes the list gate when the engine found no enumeration in prose", () => {
    const target = loadEvalTargets(1)[0];
    expect(target.criteria).not.toContain("prose_enumeration");
    expect(buildIarisWithBriefing(target, "«c»")).toContain('a engine NÃO apontou "Enumeração em prosa"');
  });
});

describe("IAris baseline — the audit is stated, not implied", () => {
  it("names every section that could not be ported and why", () => {
    expect(INCOMPATIBLE.length).toBeGreaterThan(0);
    for (const item of INCOMPATIBLE) {
      expect(item.what.length).toBeGreaterThan(0);
      expect(item.why.length).toBeGreaterThan(0);
    }
  });

  it("names every block that was ported with an edit", () => {
    expect(PATCHED.map((p) => p.block)).toEqual([
      "MARKUP (SAÍDA, linhas 10–18)",
      "REGRA 1.2 (linha 84)",
      "REGRA 5 (linhas 152–155)",
      "TAREFA (linhas 20–26)",
    ]);
  });
});

describe("lista@2 — só o gatilho muda", () => {
  it("difere de iaris@v20+briefing exatamente no bullet de arquitetura da informação", () => {
    const target = loadEvalTargets(1)[0];
    const a = buildIarisWithBriefing(target, "«c»").split("\n");
    const b = buildIarisListGate2(target, "«c»").split("\n");

    const head = (lines: string[]): string[] =>
      lines.slice(0, lines.findIndex((l) => l.startsWith("- Arquitetura da informação")));
    const tail = (lines: string[]): string[] =>
      lines.slice(lines.findIndex((l) => l.startsWith("- Estrutura das frases")));

    expect(head(b)).toEqual(head(a));
    expect(tail(b)).toEqual(tail(a));
  });

  it("nunca proíbe a lista por ausência de prose_enumeration", () => {
    const target = loadEvalTargets(1)[0];
    expect(target.criteria).not.toContain("prose_enumeration");
    expect(buildIarisWithBriefing(target, "«c»")).toContain('a engine NÃO apontou "Enumeração em prosa"');
    expect(buildIarisListGate2(target, "«c»")).not.toContain('a engine NÃO apontou');
    expect(buildIarisListGate2(target, "«c»")).toContain("ITENS SEMANTICAMENTE PARALELOS E SEPARÁVEIS");
  });

  it("não impõe mínimo de três itens", () => {
    const prompt = buildIarisListGate2(loadEvalTargets(1)[0], "«c»");
    expect(prompt).toContain("DOIS itens já bastam");
    expect(prompt).not.toContain("três ou mais itens");
  });
});
