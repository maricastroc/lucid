import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const findingsOf = (text: string) => analyze(text).findings.filter((f) => f.criterion === "nominalizacao_encadeada");
const spans = (text: string): string[] => findingsOf(text).map((f) => f.span.text);

describe("nominalizacao_encadeada — chain", () => {
  it("head + de + head (a strong link) marks the whole chain as a warning", () => {
    const [f] = findingsOf("A realização da atualização depende do gestor.");
    expect(f.span.text).toBe("realização da atualização");
    expect(f.severity).toBe("warning");
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
  });

  it("a link held only by a deverbal suffix (absent from the lexicon) marks as info", () => {
    const [f] = findingsOf("A confirmação dos documentos é rápida.");
    expect(f.span.text).toBe("confirmação dos documentos");
    expect(f.severity).toBe("info");
  });

  it("allows ONE intervening word between the “de” and the link", () => {
    expect(spans("Após a identificação de eventuais inconsistências, o pedido segue.")).toEqual([
      "identificação de eventuais inconsistências",
    ]);
  });

  it("does NOT allow a word between the head and the “de” (a verb there would be a false positive)", () => {
    expect(spans("A verificação prévia das informações é necessária.")).toEqual([]);
    expect(spans("A análise depende da aprovação do chefe.")).toEqual([]);
  });

  it("extends greedily: three links become ONE chain", () => {
    const found = findingsOf("A realização da atualização da verificação atrasou.");
    expect(found).toHaveLength(1);
    expect(found[0].span.text).toBe("realização da atualização da verificação");
    expect(found[0].meta?.links).toBe(2);
  });

  it("punctuation breaks the chain", () => {
    expect(spans("A realização, da atualização, depende do órgão.")).toEqual([]);
  });

  it("a lexicalized noun outside the lexicon does not become a head", () => {
    expect(spans("O documento do departamento está no regulamento.")).toEqual([]);
  });
});

describe("nominalizacao_encadeada — density", () => {
  it("≥3 heads in the sentence mark the ones that are not in a chain", () => {
    expect(spans("A avaliação, a aferição e a validação seguem o rito.")).toEqual([
      "avaliação",
      "aferição",
      "validação",
    ]);
  });

  it("density is per sentence, not per document", () => {
    expect(spans("A avaliação começou. A aferição e a validação continuam.")).toEqual([]);
  });

  it("heads already covered by a chain are not marked again by density", () => {
    const found = findingsOf(
      "A realização da atualização cadastral depende da verificação prévia das informações apresentadas e da confirmação dos documentos exigidos.",
    );
    expect(found.map((f) => f.span.text)).toEqual([
      "realização da atualização",
      "verificação",
      "confirmação dos documentos",
    ]);
    const byKind = new Map(found.map((f) => [f.span.text, f.meta?.kind]));
    expect(byKind.get("realização da atualização")).toBe("chain");
    expect(byKind.get("verificação")).toBe("density");
    expect(byKind.get("confirmação dos documentos")).toBe("chain");
  });

  it("below the threshold and with no chain, it does not mark", () => {
    expect(spans("A avaliação e a aferição terminam hoje.")).toEqual([]);
  });
});

describe("nominalizacao_encadeada — contract", () => {
  it("every finding cites 5.3.3, is syntactic and requires a human decision", () => {
    const found = findingsOf("A realização da atualização e a emissão da autorização de funcionamento atrasaram.");
    expect(found.length).toBeGreaterThan(0);
    for (const f of found) {
      expect(f.normativeReference?.section).toBe("5.3.3");
      expect(f.category).toBe("syntactic");
      expect(f.requiresHuman).toBe(true);
      expect(f.suggestion).toBeUndefined();
    }
  });

  it("the span reconstructs from the text itself", () => {
    const d = analyze("A realização da atualização depende da anuência do órgão.");
    for (const f of d.findings.filter((x) => x.criterion === "nominalizacao_encadeada")) {
      expect(d.text.slice(f.span.start, f.span.end)).toBe(f.span.text);
    }
  });
});

describe("nominalizacao_encadeada — kill switch", () => {
  it("produces no findings when switched off", () => {
    const config = { ...DEFAULT_CONFIG, nominalizacaoEncadeada: { enabled: false, minPorFrase: 3 } };
    const found = analyze("A realização da atualização depende da verificação.", config).findings.filter(
      (f) => f.criterion === "nominalizacao_encadeada",
    );
    expect(found).toEqual([]);
  });
});
