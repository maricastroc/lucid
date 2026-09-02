import { describe, expect, it } from "vitest";
import { analyze, type Finding } from "../src/lucid";

function subordinationFindings(text: string): Finding[] {
  return analyze(text).findings.filter((f) => f.criterion === "subordinacao_densa");
}

describe("subordinacao_densa — triggers on density, not on a lone connective", () => {
  it("3 subordinators in the same sentence → 1 finding (passage) per sentence, warning + requiresHuman", () => {
    const text = "Embora o prazo tenha vencido, o pedido avança porque o sistema falhou, ainda que o gestor recuse.";
    const [f, ...rest] = subordinationFindings(text);
    expect(rest).toHaveLength(0);
    expect(f).toBeDefined();
    expect(f.severity).toBe("warning");
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.span.text).toBe(text);
    expect(f.meta?.clauses).toBe(3);
  });

  it("2 subordinators (below the threshold of 3) → does not trigger", () => {
    const text = "Embora o prazo tenha vencido, o pedido avança porque o sistema falhou.";
    expect(subordinationFindings(text)).toHaveLength(0);
  });
});

describe("subordinacao_densa — phrasal connectives count as one clause each", () => {
  it("multi-word connectives (para que / desde que / uma vez que) count", () => {
    const text = "Para que o pedido avance, desde que haja verba, uma vez que o setor aprove, o processo segue.";
    const found = subordinationFindings(text);
    expect(found).toHaveLength(1);
    expect(found[0].meta?.clauses).toBe(3);
  });

  it("a connective with a grave accent (à medida que) is recognized", () => {
    const text = "À medida que os prazos correm, para que o setor aja, desde que haja verba, o pedido avança.";
    const found = subordinationFindings(text);
    expect(found).toHaveLength(1);
    expect(found[0].meta?.clauses).toBe(3);
  });
});

describe("subordinacao_densa — precision: polysemous words do NOT count", () => {
  it("'se' and 'caso' (the noun) still do not inflate the count", () => {
    const text =
      "O documento que foi assinado, o caso que analisamos e o recurso que segue, se possível, vão em anexo.";
    const [f] = subordinationFindings(text);
    expect(f).toBeDefined();
    expect(f.meta?.clauses).toBe(3);

    expect(subordinationFindings("O caso segue, se possível, em anexo.")).toHaveLength(0);
  });
});

describe("subordinacao_densa — switchable off and deterministic", () => {
  it("same input → same output (byte for byte in span/among)", () => {
    const text = "Embora o prazo tenha vencido, o pedido avança porque o sistema falhou, ainda que o gestor recuse.";
    expect(subordinationFindings(text)).toEqual(subordinationFindings(text));
  });
});

describe("o \u201cque\u201d simples entra, com a ambiguidade tratada (A-19)", () => {
  it("encadeamento de relativas agora dispara — era o buraco que deixava o critério inerte", () => {
    const text =
      "O requerente que apresentar o documento que comprove a renda que foi declarada receberá o benefício.";
    const [f] = subordinationFindings(text);
    expect(f).toBeDefined();
    expect(f.meta?.clauses).toBe(3);
  });

  it("conta a relativa mesmo separada por vírgula", () => {
    expect(subordinationFindings("A norma que trata do prazo, que é de dez dias, e que consta do art. 5º.")).toHaveLength(1);
  });

  it("não conta o \u201cque\u201d comparativo, que não abre oração", () => {
    expect(subordinationFindings("Ele é mais alto que o irmão e mais rápido que o primo e mais forte que o pai.")).toHaveLength(0);
    expect(subordinationFindings("O prazo é tão curto que assusta, tão curto que espanta, tão curto que dói.")).toHaveLength(0);
  });

  it("não conta o \u201cque\u201d da clivada", () => {
    expect(subordinationFindings("O que importa é que o prazo venceu.")).toHaveLength(0);
  });

  it("a pontuação encerra a janela: uma vírgula separa a comparação da relativa seguinte", () => {
    const text = "O prazo é mais curto, e a norma que trata dele, que é antiga, e que ninguém lê, confunde.";
    expect(subordinationFindings(text)).toHaveLength(1);
  });
});

