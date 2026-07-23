import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { documentBurden, renderLedgerMarkdown, sourceLabel, type LedgerEntry } from "../src/app/lib/ledger";

const ENTRIES: LedgerEntry[] = [
  { source: "safe", label: "Correção segura · Jargão", before: "em sede de", after: "durante", burdenBefore: 6, burdenAfter: 5 },
  { source: "ai", label: "Reescrita por IA · groq:llama", before: "Foi realizada a análise", after: "A comissão analisou", burdenBefore: 5, burdenAfter: 2 },
];

describe("ledger — trilha de proveniência", () => {
  it("sourceLabel dá rótulos humanos (nomes internos nunca vazam)", () => {
    expect(sourceLabel("ai")).toBe("Reescrita por IA");
    expect(sourceLabel("manual")).toBe("Edição do autor");
    expect(sourceLabel("safe")).toBe("Correção segura");
  });

  it("documentBurden usa a régua canônica de severidade (não contagem crua)", () => {
    const clean = analyze("O gato dorme no sol.");
    const heavy = analyze("Foi realizada a análise em sede de procedimento administrativo supracitado.");
    expect(documentBurden([])).toBe(0);
    expect(documentBurden(clean.findings)).toBeLessThan(documentBurden(heavy.findings));
  });

  it("renderLedgerMarkdown: vazio → string vazia (o chamador omite a seção)", () => {
    expect(renderLedgerMarkdown([])).toBe("");
  });

  it("renderLedgerMarkdown: cabeçalho, resumo de peso, entradas com antes→depois e caveat", () => {
    const md = renderLedgerMarkdown(ENTRIES);
    expect(md).toContain("## Trilha de revisão");
    expect(md).toContain("Peso da auditoria na sessão:** 6 → 2");
    expect(md).toContain("**1. Correção segura · Jargão** — peso 6 → 5 ↓");
    expect(md).toContain("**2. Reescrita por IA · groq:llama** — peso 5 → 2 ↓");
    expect(md).toContain('_de:_ "em sede de" · _para:_ "durante"');
    expect(md).toContain("não um atestado de qualidade");
  });

  it("determinístico: mesmas entradas → markdown byte-idêntico", () => {
    expect(renderLedgerMarkdown(ENTRIES)).toBe(renderLedgerMarkdown(ENTRIES));
  });
});
