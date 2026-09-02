import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildDocument } from "@/lucid";

const CORPUS = path.join(process.cwd(), "corpus/v1/text");

interface Split {
  readonly candidates: number;
  readonly hardWraps: number;
}

function splitsOnSingleNewline(): Split {
  let candidates = 0;
  let hardWraps = 0;

  for (const file of fs.readdirSync(CORPUS).filter((f) => f.endsWith(".txt"))) {
    const lines = fs.readFileSync(path.join(CORPUS, file), "utf8").split("\n");
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      const next = lines[i + 1].trim();
      if (line === "" || next === "") continue;
      if (/[.;:!?]$/u.test(line)) continue;
      if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9]/u.test(next)) candidates += 1;
      if (/^[a-zà-ÿ]/u.test(next)) hardWraps += 1;
    }
  }

  return { candidates, hardWraps };
}

describe("a single newline does not close a sentence, and the corpus says why", () => {
  it("keeps a title glued to the next line when only one newline separates them", () => {
    const doc = buildDocument("Concessão do benefício\nO pedido foi indeferido pela comissão.");

    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0].kind).toBe("paragraph");
  });

  it("separates them the moment a blank line appears, which is the rule that shipped", () => {
    const doc = buildDocument("Concessão do benefício\n\nO pedido foi indeferido pela comissão.");

    expect(doc.blocks).toHaveLength(2);
  });

  it("measures the cost of the obvious discriminator instead of trusting intuition", () => {
    const { candidates, hardWraps } = splitsOnSingleNewline();

    expect(candidates).toBeGreaterThan(300);
    expect(hardWraps).toBeGreaterThan(300);
  });

  it("does not fragment a hard-wrapped provision, which is what the discriminator would cost", () => {
    const wrapped = "Art. 4º São criadas, na Tabela de\nGratificação de Representação de Gabinete, mais 151 funções.";
    const doc = buildDocument(wrapped);

    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0].kind).toBe("paragraph");
  });
});
