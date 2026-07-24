import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const findingsOf = (text: string) => analyze(text).findings.filter((f) => f.criterion === "nominalizacao_encadeada");
const spans = (text: string): string[] => findingsOf(text).map((f) => f.span.text);

describe("nominalizacao_encadeada — cadeia", () => {
  it("cabeça + de + cabeça (elo forte) marca a cadeia inteira como warning", () => {
    const [f] = findingsOf("A realização da atualização depende do gestor.");
    expect(f.span.text).toBe("realização da atualização");
    expect(f.severity).toBe("warning");
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
  });

  it("elo só por sufixo deverbal (não está no léxico) marca como info", () => {
    const [f] = findingsOf("A confirmação dos documentos é rápida.");
    expect(f.span.text).toBe("confirmação dos documentos");
    expect(f.severity).toBe("info");
  });

  it("admite UMA palavra intermediária entre o “de” e o elo", () => {
    expect(spans("Após a identificação de eventuais inconsistências, o pedido segue.")).toEqual([
      "identificação de eventuais inconsistências",
    ]);
  });

  it("NÃO admite palavra entre a cabeça e o “de” (verbo ali seria falso positivo)", () => {
    expect(spans("A verificação prévia das informações é necessária.")).toEqual([]);
    expect(spans("A análise depende da aprovação do chefe.")).toEqual([]);
  });

  it("estende gulosamente: três elos viram UMA cadeia", () => {
    const found = findingsOf("A realização da atualização da verificação atrasou.");
    expect(found).toHaveLength(1);
    expect(found[0].span.text).toBe("realização da atualização da verificação");
    expect(found[0].meta?.links).toBe(2);
  });

  it("pontuação quebra a cadeia", () => {
    expect(spans("A realização, da atualização, depende do órgão.")).toEqual([]);
  });

  it("substantivo lexicalizado fora do léxico não vira cabeça", () => {
    expect(spans("O documento do departamento está no regulamento.")).toEqual([]);
  });
});

describe("nominalizacao_encadeada — densidade", () => {
  it("≥3 cabeças na frase marcam as que não estão em cadeia", () => {
    expect(spans("A avaliação, a aferição e a validação seguem o rito.")).toEqual([
      "avaliação",
      "aferição",
      "validação",
    ]);
  });

  it("densidade é por frase, não pelo documento", () => {
    expect(spans("A avaliação começou. A aferição e a validação continuam.")).toEqual([]);
  });

  it("cabeças cobertas por cadeia não são marcadas de novo pela densidade", () => {
    const found = findingsOf(
      "A realização da atualização cadastral depende da verificação prévia das informações apresentadas e da confirmação dos documentos exigidos.",
    );
    expect(found.map((f) => f.span.text)).toEqual([
      "realização da atualização",
      "verificação",
      "confirmação dos documentos",
    ]);
    const porTipo = new Map(found.map((f) => [f.span.text, f.meta?.kind]));
    expect(porTipo.get("realização da atualização")).toBe("chain");
    expect(porTipo.get("verificação")).toBe("density");
    expect(porTipo.get("confirmação dos documentos")).toBe("chain");
  });

  it("abaixo do limiar e sem cadeia, não marca", () => {
    expect(spans("A avaliação e a aferição terminam hoje.")).toEqual([]);
  });
});

describe("nominalizacao_encadeada — contrato", () => {
  it("todo finding cita 5.3.3, é sintático e exige decisão humana", () => {
    const found = findingsOf("A realização da atualização e a emissão da autorização de funcionamento atrasaram.");
    expect(found.length).toBeGreaterThan(0);
    for (const f of found) {
      expect(f.normativeReference?.section).toBe("5.3.3");
      expect(f.category).toBe("syntactic");
      expect(f.requiresHuman).toBe(true);
      expect(f.suggestion).toBeUndefined();
    }
  });

  it("span reconstrói do próprio texto", () => {
    const d = analyze("A realização da atualização depende da anuência do órgão.");
    for (const f of d.findings.filter((x) => x.criterion === "nominalizacao_encadeada")) {
      expect(d.text.slice(f.span.start, f.span.end)).toBe(f.span.text);
    }
  });
});

describe("nominalizacao_encadeada — kill switch", () => {
  it("desligado não produz findings", () => {
    const config = { ...DEFAULT_CONFIG, nominalizacaoEncadeada: { enabled: false, minPorFrase: 3 } };
    const found = analyze("A realização da atualização depende da verificação.", config).findings.filter(
      (f) => f.criterion === "nominalizacao_encadeada",
    );
    expect(found).toEqual([]);
  });
});
