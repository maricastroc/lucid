import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { burdenMove, documentBurden, renderLedgerMarkdown, sourceLabel, type LedgerEntry } from "../src/app/lib/ledger";

const ENTRIES: LedgerEntry[] = [
  {
    source: "manual",
    label: "Edição do autor · Jargão",
    before: "em sede de",
    after: "durante",
    burdenBefore: 6,
    burdenAfter: 5,
  },
  {
    source: "ai",
    label: "Reescrita por IA · gemini:2.5-flash",
    before: "Foi realizada a análise",
    after: "A comissão analisou",
    burdenBefore: 5,
    burdenAfter: 2,
  },
];

describe("ledger — provenance trail", () => {
  it("sourceLabel yields human labels (internal names never leak)", () => {
    expect(sourceLabel("ai")).toBe("Reescrita por IA");
    expect(sourceLabel("manual")).toBe("Edição do autor");
  });

  it("only two legitimate authors exist: the human and the AI — the engine is never a source (ADR-054)", () => {
    const sources: LedgerEntry["source"][] = ["manual", "ai"];
    expect(sources.map((source) => sourceLabel(source))).toEqual(["Edição do autor", "Reescrita por IA"]);
  });

  it("documentBurden uses the canonical severity scale (not a raw count)", () => {
    const clean = analyze("O gato dorme no sol.");
    const heavy = analyze("Foi realizada a análise em sede de procedimento administrativo supracitado.");
    expect(documentBurden([])).toBe(0);
    expect(documentBurden(clean.findings)).toBeLessThan(documentBurden(heavy.findings));
  });

  it("renderLedgerMarkdown: empty → empty string (the caller omits the section)", () => {
    expect(renderLedgerMarkdown([])).toBe("");
  });

  it("renderLedgerMarkdown: heading, burden summary, entries with before→after and caveat", () => {
    const md = renderLedgerMarkdown(ENTRIES);
    expect(md).toContain("## Alterações registradas");
    expect(md).toContain("Peso da auditoria na sessão:** 6 → 2");
    expect(md).toContain("**1. Edição do autor · Jargão** — peso 6 → 5 ↓");
    expect(md).toContain("**2. Reescrita por IA · gemini:2.5-flash** — peso 5 → 2 ↓");
    expect(md).toContain('_de:_ "em sede de" · _para:_ "durante"');
    expect(md).toContain("não um atestado de qualidade");
    expect(md).toContain("não é o histórico completo de edição");
  });

  it("deterministic: same entries → byte-identical markdown", () => {
    expect(renderLedgerMarkdown(ENTRIES)).toBe(renderLedgerMarkdown(ENTRIES));
  });
});

describe("ledger — a tie is not a fall", () => {
  const at = (before: number, after: number) => ({
    source: "glossary" as const,
    label: "Troca direta do glossário",
    before: "em sede de",
    after: "no âmbito de",
    burdenBefore: before,
    burdenAfter: after,
  });

  it("classifies the three outcomes apart", () => {
    expect(burdenMove(at(6, 5))).toBe("down");
    expect(burdenMove(at(5, 6))).toBe("up");
    expect(burdenMove(at(15.9, 15.9))).toBe("level");
  });

  it("says a change left the weight where it was, instead of drawing a fall", () => {
    const md = renderLedgerMarkdown([at(15.9, 15.9)]);
    expect(md).toContain("peso 15.9 → 15.9 (sem mudança de peso)");
    expect(md).not.toContain("↓");
  });

  it("still marks a real fall and a real rise", () => {
    expect(renderLedgerMarkdown([at(6, 5)])).toContain("peso 6 → 5 ↓");
    expect(renderLedgerMarkdown([at(5, 6)])).toContain("peso 5 → 6 ↑");
  });
});
