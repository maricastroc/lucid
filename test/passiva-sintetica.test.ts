import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const spans = (text: string): string[] =>
  analyze(text)
    .findings.filter((f) => f.criterion === "passiva_sintetica")
    .map((f) => f.span.text);

describe("passiva_sintetica — detecção do 'se' enclítico", () => {
  it("passiva sintética evidente (singular e plural com concordância)", () => {
    expect(spans("Aplica-se a multa ao infrator.")).toEqual(["Aplica-se"]);
    expect(spans("Publicam-se os resultados no diário oficial.")).toEqual(["Publicam-se"]);
    expect(spans("Considera-se aprovado o pedido.")).toEqual(["Considera-se"]);
  });

  it("sempre requiresHuman (a ambiguidade do 'se' é irredutível), warning, sem sugestão, ISO 5.3.3", () => {
    const f = analyze("Aplicou-se a penalidade.").findings.find((x) => x.criterion === "passiva_sintetica")!;
    expect(f.severity).toBe("warning");
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.source).toBe("iso-24495-1");
    expect(f.principleGroup).toBe("understandable");
    expect(f.normativeReference?.section).toBe("5.3.3");
  });
});

describe("passiva_sintetica — exclusões (baixo falso positivo)", () => {
  it("verbos inerentemente pronominais NÃO marcam (o 'se' é partícula integrante)", () => {
    expect(spans("Trata-se de um recurso administrativo.")).toEqual([]);
    expect(spans("O artigo refere-se ao prazo legal.")).toEqual([]);
    expect(spans("Torna-se necessário revisar o texto.")).toEqual([]);
  });

  it("mesóclise ('realizar-se-á') fica com o critério mesoclise, não aqui", () => {
    expect(spans("A análise realizar-se-á em breve.")).toEqual([]);
  });

  it("'se' condicional (palavra à parte, não enclítico) não marca", () => {
    expect(spans("Se o prazo vencer, o pedido será arquivado.")).toEqual([]);
  });

  it("sujeito humano explícito com verbo comum não marca (não há '-se' enclítico)", () => {
    expect(spans("A comissão aplicou a penalidade ao servidor.")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, passivaSintetica: { enabled: false } };
    expect(analyze("Aplica-se a multa.", config).findings.filter((f) => f.criterion === "passiva_sintetica")).toEqual([]);
  });
});

describe("passiva_sintetica — mesóclise coexiste sem dupla contagem no mesmo critério", () => {
  it("'realizar-se-á' dispara mesoclise, e passiva_sintetica não o toca", () => {
    const d = analyze("O ato realizar-se-á amanhã.");
    expect(d.findings.some((f) => f.criterion === "mesoclise")).toBe(true);
    expect(d.findings.some((f) => f.criterion === "passiva_sintetica")).toBe(false);
  });
});
