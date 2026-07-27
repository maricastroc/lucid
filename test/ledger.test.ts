import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { documentBurden, renderLedgerMarkdown, sourceLabel, type LedgerEntry } from "../src/app/lib/ledger";

const ENTRIES: LedgerEntry[] = [
  { source: "manual", label: "Edição do autor · Jargão", before: "em sede de", after: "durante", burdenBefore: 6, burdenAfter: 5 },
  { source: "ai", label: "Reescrita por IA · groq:llama", before: "Foi realizada a análise", after: "A comissão analisou", burdenBefore: 5, burdenAfter: 2 },
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
    expect(md).toContain("## Trilha de revisão");
    expect(md).toContain("Peso da auditoria na sessão:** 6 → 2");
    expect(md).toContain("**1. Edição do autor · Jargão** — peso 6 → 5 ↓");
    expect(md).toContain("**2. Reescrita por IA · groq:llama** — peso 5 → 2 ↓");
    expect(md).toContain('_de:_ "em sede de" · _para:_ "durante"');
    expect(md).toContain("não um atestado de qualidade");
  });

  it("deterministic: same entries → byte-identical markdown", () => {
    expect(renderLedgerMarkdown(ENTRIES)).toBe(renderLedgerMarkdown(ENTRIES));
  });
});
