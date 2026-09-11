import { describe, expect, it } from "vitest";
import { entryLabel, renderLedgerMarkdown, type LedgerEntry } from "../src/app/lib/ledger";

const SOURCE = "Federal Plain Language Guidelines (2011), p. 23";

const attested: LedgerEntry = {
  source: "attested",
  label: "Troca atestada por fonte",
  attestedIn: SOURCE,
  before: "make an application",
  after: "apply",
  burdenBefore: 1,
  burdenAfter: 0,
};

const glossary: LedgerEntry = {
  source: "glossary",
  label: "Troca direta do glossário",
  before: "supracitado",
  after: "citado",
  burdenBefore: 1,
  burdenAfter: 0,
};

describe("the trail names where an attested swap came from", () => {
  it("labels it as attested, with its source, in both interface languages", () => {
    expect(entryLabel(attested, "pt-BR")).toBe(`Troca atestada por fonte · ${SOURCE}`);
    expect(entryLabel(attested, "en")).toBe(`Swap attested by a source · ${SOURCE}`);
    expect(entryLabel(glossary, "pt-BR")).toBe("Troca direta do glossário");
  });

  it("carries the source into the exported report and never labels it a glossary swap", () => {
    const md = renderLedgerMarkdown([attested], "en-US");
    expect(md).toContain("**1. Troca atestada por fonte**");
    expect(md).toContain(`_equivalência atestada em:_ ${SOURCE}`);
    expect(md).not.toContain("Troca direta do glossário");
    expect(renderLedgerMarkdown([glossary], "pt-BR")).not.toContain("equivalência atestada");
  });
});
