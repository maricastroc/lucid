import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const spans = (text: string): string[] =>
  analyze(text)
    .findings.filter((f) => f.criterion === "passiva_sintetica")
    .map((f) => f.span.text);

describe("passiva_sintetica — detecting the enclitic 'se'", () => {
  it("plain synthetic passive (singular and plural agreement)", () => {
    expect(spans("Aplica-se a multa ao infrator.")).toEqual(["Aplica-se"]);
    expect(spans("Publicam-se os resultados no diário oficial.")).toEqual(["Publicam-se"]);
    expect(spans("Considera-se aprovado o pedido.")).toEqual(["Considera-se"]);
  });

  it("always requiresHuman (the ambiguity of 'se' is irreducible), warning, no suggestion, ISO 5.3.3", () => {
    const f = analyze("Aplicou-se a penalidade.").findings.find((x) => x.criterion === "passiva_sintetica")!;
    expect(f.severity).toBe("warning");
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.source).toBe("iso-24495-1");
    expect(f.principleGroup).toBe("understandable");
    expect(f.normativeReference?.section).toBe("5.3.3");
  });
});

describe("passiva_sintetica — exclusions (low false positive rate)", () => {
  it("inherently pronominal verbs do NOT mark (the 'se' is an integral particle)", () => {
    expect(spans("Trata-se de um recurso administrativo.")).toEqual([]);
    expect(spans("O artigo refere-se ao prazo legal.")).toEqual([]);
    expect(spans("Torna-se necessário revisar o texto.")).toEqual([]);
  });

  it("mesoclisis ('realizar-se-á') belongs to the mesoclise criterion, not here", () => {
    expect(spans("A análise realizar-se-á em breve.")).toEqual([]);
  });

  it("conditional 'se' (a separate word, not enclitic) does not mark", () => {
    expect(spans("Se o prazo vencer, o pedido será arquivado.")).toEqual([]);
  });

  it("an explicit human subject with an ordinary verb does not mark (there is no enclitic '-se')", () => {
    expect(spans("A comissão aplicou a penalidade ao servidor.")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, passivaSintetica: { enabled: false } };
    expect(analyze("Aplica-se a multa.", config).findings.filter((f) => f.criterion === "passiva_sintetica")).toEqual([]);
  });
});

describe("passiva_sintetica — mesoclisis coexists without double counting under the same criterion", () => {
  it("'realizar-se-á' triggers mesoclise, and passiva_sintetica leaves it alone", () => {
    const d = analyze("O ato realizar-se-á amanhã.");
    expect(d.findings.some((f) => f.criterion === "mesoclise")).toBe(true);
    expect(d.findings.some((f) => f.criterion === "passiva_sintetica")).toBe(false);
  });
});
