import { describe, expect, it } from "vitest";
import { analyze, type Finding } from "../src/lucid";

function leitorFindings(text: string): Finding[] {
  return analyze(text).findings.filter((f) => f.criterion === "leitor_terceira_pessoa");
}

describe("leitor_terceira_pessoa — marca sujeito-leitor + obrigação", () => {
  it("'O interessado deverá apresentar' → 1 finding info, span article→verbo, sem sugestão", () => {
    const [f, ...rest] = leitorFindings("O interessado deverá apresentar os documentos.");
    expect(rest).toHaveLength(0);
    expect(f.severity).toBe("info");
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.span.text).toBe("O interessado deverá");
  });

  it("sujeito no início da frase, sem artigo, com modificadores na janela", () => {
    const [f] = leitorFindings("Os candidatos aprovados no concurso deverão comparecer.");
    expect(f.span.text).toBe("Os candidatos aprovados no concurso deverão");
  });

  it("permissão também conta (pode/podem)", () => {
    const [f] = leitorFindings("O usuário pode acessar o sistema.");
    expect(f.span.text).toBe("O usuário pode");
  });
});

describe("leitor_terceira_pessoa — deônticos perifrásticos e sujeitos com quantificador (F6)", () => {
  it("'é obrigado a' é reconhecido como obrigação", () => {
    const [f, ...rest] = leitorFindings("O contribuinte é obrigado a declarar os rendimentos.");
    expect(rest).toHaveLength(0);
    expect(f.span.text).toBe("O contribuinte é obrigado a");
    expect(f.meta?.deonticVerb).toBe("é obrigado a");
  });

  it("'tem que' e 'tem de' são reconhecidos", () => {
    expect(leitorFindings("O usuário tem que enviar o formulário.")[0].span.text).toBe("O usuário tem que");
    expect(leitorFindings("O usuário tem de enviar o formulário.")[0].span.text).toBe("O usuário tem de");
  });

  it("'será obrigado a' (futuro) também conta", () => {
    expect(leitorFindings("O interessado será obrigado a comparecer.")[0].span.text).toBe("O interessado será obrigado a");
  });

  it("sujeito com quantificador genérico (todo/cada/qualquer) é reconhecido", () => {
    expect(leitorFindings("Todo cidadão deve pagar a taxa.")[0].span.text).toBe("Todo cidadão deve");
    expect(leitorFindings("Cada interessado deverá apresentar o pedido.")[0].span.text).toBe("Cada interessado deverá");
    expect(leitorFindings("Qualquer usuário pode consultar o sistema.")[0].span.text).toBe("Qualquer usuário pode");
  });
});

describe("leitor_terceira_pessoa — precisão: exige sujeito E obrigação", () => {
  it("'tem' + substantivo (não de/que) NÃO marca ('o interessado tem razão')", () => {
    expect(leitorFindings("O interessado tem razão no pedido.")).toHaveLength(0);
  });

  it("'obrigado' sem sujeito-leitor (agradecimento) NÃO marca", () => {
    expect(leitorFindings("Muito obrigado a todos pela presença.")).toHaveLength(0);
  });

  it("sem verbo deôntico → não marca ('o cidadão tem direitos')", () => {
    expect(leitorFindings("O cidadão tem direitos e deveres.")).toHaveLength(0);
  });

  it("leitor em posição oblíqua (contração) → não marca ('ao interessado')", () => {
    expect(leitorFindings("Cabe recurso ao interessado no prazo legal.")).toHaveLength(0);
  });

  it("leitura adjetival (não é sujeito nominal) → não marca ('está interessado')", () => {
    expect(leitorFindings("Está interessado e deverá decidir depois.")).toHaveLength(0);
  });

  it("conjunção entre leitor e verbo barra a associação (outra oração)", () => {
    expect(leitorFindings("O prazo do interessado venceu e deve ser renovado.")).toHaveLength(0);
  });
});
