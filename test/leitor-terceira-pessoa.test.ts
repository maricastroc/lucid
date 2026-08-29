import { describe, expect, it } from "vitest";
import { analyze, type Finding } from "../src/lucid";

function readerFindings(text: string): Finding[] {
  return analyze(text).findings.filter((f) => f.criterion === "leitor_terceira_pessoa");
}

describe("leitor_terceira_pessoa — marks reader-as-subject + obligation", () => {
  it("'O interessado deverá apresentar' → 1 info finding, span article→verb, no suggestion", () => {
    const [f, ...rest] = readerFindings("O interessado deverá apresentar os documentos.");
    expect(rest).toHaveLength(0);
    expect(f.severity).toBe("info");
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.span.text).toBe("O interessado deverá");
  });

  it("subject at the start of the sentence, no article, with modifiers inside the window", () => {
    const [f] = readerFindings("Os candidatos aprovados no concurso deverão comparecer.");
    expect(f.span.text).toBe("Os candidatos aprovados no concurso deverão");
  });

  it("permission counts too (pode/podem)", () => {
    const [f] = readerFindings("O usuário pode acessar o sistema.");
    expect(f.span.text).toBe("O usuário pode");
  });
});

describe("leitor_terceira_pessoa — periphrastic deontics and quantified subjects (F6)", () => {
  it("'é obrigado a' is recognized as an obligation", () => {
    const [f, ...rest] = readerFindings("O contribuinte é obrigado a declarar os rendimentos.");
    expect(rest).toHaveLength(0);
    expect(f.span.text).toBe("O contribuinte é obrigado a");
    expect(f.meta?.deonticVerb).toBe("é obrigado a");
  });

  it("'tem que' and 'tem de' are recognized", () => {
    expect(readerFindings("O usuário tem que enviar o formulário.")[0].span.text).toBe("O usuário tem que");
    expect(readerFindings("O usuário tem de enviar o formulário.")[0].span.text).toBe("O usuário tem de");
  });

  it("'será obrigado a' (future) counts too", () => {
    expect(readerFindings("O interessado será obrigado a comparecer.")[0].span.text).toBe(
      "O interessado será obrigado a",
    );
  });

  it("a subject with a generic quantifier (todo/cada/qualquer) is recognized", () => {
    expect(readerFindings("Todo cidadão deve pagar a taxa.")[0].span.text).toBe("Todo cidadão deve");
    expect(readerFindings("Cada interessado deverá apresentar o pedido.")[0].span.text).toBe("Cada interessado deverá");
    expect(readerFindings("Qualquer usuário pode consultar o sistema.")[0].span.text).toBe("Qualquer usuário pode");
  });
});

describe("leitor_terceira_pessoa — precision: subject AND obligation are both required", () => {
  it("'tem' + noun (not de/que) does NOT mark ('o interessado tem razão')", () => {
    expect(readerFindings("O interessado tem razão no pedido.")).toHaveLength(0);
  });

  it("'obrigado' without a reader subject (a thank-you) does NOT mark", () => {
    expect(readerFindings("Muito obrigado a todos pela presença.")).toHaveLength(0);
  });

  it("no deontic verb → no finding ('o cidadão tem direitos')", () => {
    expect(readerFindings("O cidadão tem direitos e deveres.")).toHaveLength(0);
  });

  it("reader in an oblique position (contraction) → no finding ('ao interessado')", () => {
    expect(readerFindings("Cabe recurso ao interessado no prazo legal.")).toHaveLength(0);
  });

  it("adjectival reading (not a nominal subject) → no finding ('está interessado')", () => {
    expect(readerFindings("Está interessado e deverá decidir depois.")).toHaveLength(0);
  });

  it("a conjunction between reader and verb blocks the association (a different clause)", () => {
    expect(readerFindings("O prazo do interessado venceu e deve ser renovado.")).toHaveLength(0);
  });
});
