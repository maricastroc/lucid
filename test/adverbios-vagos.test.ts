import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const spans = (text: string): string[] =>
  analyze(text)
    .findings.filter((f) => f.criterion === "adverbios_vagos")
    .map((f) => f.span.text);

describe("adverbios_vagos — presence (ADR-058)", () => {
  it("marks every vague adverb, even in isolation (density plays no part)", () => {
    expect(spans("Basicamente, o pedido foi negado.")).toEqual(["Basicamente"]);
    expect(spans("O sistema está efetivamente fora do ar.")).toEqual(["efetivamente"]);
  });

  it("marks several within the same sentence", () => {
    expect(spans("Isso é realmente e absolutamente desnecessário.")).toEqual(["realmente", "absolutamente"]);
  });

  it("is on by default, info severity, and requires a human decision", () => {
    const f = analyze("Simplesmente não há prazo.").findings.find((x) => x.criterion === "adverbios_vagos")!;
    expect(f.severity).toBe("info");
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.source).toBe("editorial-pt-br");
    expect(f.principleGroup).toBe("understandable");
    expect(f.normativeReference).toBeUndefined();
  });
});

describe("adverbios_vagos — precision (it is not 'any -mente adverb')", () => {
  it("MANNER adverbs carrying content do NOT mark (avoids pushing toward 'de forma X')", () => {
    expect(spans("O documento deve ser assinado digitalmente e enviado mensalmente.")).toEqual([]);
    expect(spans("Ele resolveu o problema rapidamente e silenciosamente.")).toEqual([]);
    expect(spans("A audiência ocorrerá judicialmente na próxima semana.")).toEqual([]);
  });

  it("borderline cases left OUT of the initial list do not mark", () => {
    expect(spans("Isso ocorre naturalmente e afeta particularmente os idosos.")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, adverbiosVagos: { enabled: false } };
    expect(
      analyze("Basicamente, o pedido foi negado.", config).findings.filter((f) => f.criterion === "adverbios_vagos"),
    ).toEqual([]);
  });
});

describe("ampliação do léxico contra o critério declarado (A-20)", () => {
  const hits = (text: string): string[] =>
    analyze(text)
      .findings.filter((f) => f.criterion === "adverbios_vagos")
      .map((f) => f.span.text);

  it("aponta o reforço vazio típico do burocratês", () => {
    expect(hits("O formulário devidamente preenchido deve ser entregue.")).toEqual(["devidamente"]);
    expect(hits("O prazo é razoavelmente adequado.")).toEqual(["razoavelmente"]);
    expect(hits("O pedido é relativamente simples.")).toEqual(["relativamente"]);
    expect(hits("A regra é perfeitamente clara.")).toEqual(["perfeitamente"]);
  });

  it("continua fora o advérbio que carrega conteúdo — remover mudaria o que a frase afirma", () => {
    for (const text of [
      "Provavelmente o pedido será deferido.",
      "O pagamento é feito mensalmente.",
      "Somente o titular pode pedir.",
      "O valor é de aproximadamente mil reais.",
      "Geralmente o prazo é de dez dias.",
      "Eventualmente o setor recusa o pedido.",
    ]) {
      expect(hits(text), text).toEqual([]);
    }
  });
});

