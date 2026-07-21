import { describe, expect, it } from "vitest";
import { paragraphSpanAt, rewriteTargetAt } from "../src/app/lib/paragraphs";
import { sentenceSpanAt } from "../src/lucid";

const DOC = "Primeiro parágrafo aqui.\n\nSegundo parágrafo, mais longo, no meio.\n\nTerceiro e último.";

describe("paragraphSpanAt", () => {
  it("devolve o parágrafo que contém o offset (do meio)", () => {
    const offset = DOC.indexOf("mais longo");
    const span = paragraphSpanAt(DOC, offset);
    expect(span.text).toBe("Segundo parágrafo, mais longo, no meio.");
    expect(DOC.slice(span.start, span.end)).toBe(span.text);
  });

  it("primeiro parágrafo: começa em 0", () => {
    const span = paragraphSpanAt(DOC, 3);
    expect(span.text).toBe("Primeiro parágrafo aqui.");
    expect(span.start).toBe(0);
  });

  it("último parágrafo: vai até o fim", () => {
    const offset = DOC.indexOf("último");
    const span = paragraphSpanAt(DOC, offset);
    expect(span.text).toBe("Terceiro e último.");
    expect(span.end).toBe(DOC.length);
  });

  it("sem linhas em branco: o parágrafo é o texto inteiro (aparado)", () => {
    const t = "  uma frase só, sem quebras.  ";
    const span = paragraphSpanAt(t, 5);
    expect(span.text).toBe("uma frase só, sem quebras.");
  });

  it("offset dentro da linha em branco cai no parágrafo seguinte", () => {
    const span = paragraphSpanAt(DOC, DOC.indexOf("\n\n") + 1);
    expect(span.text).toBe("Segundo parágrafo, mais longo, no meio.");
  });
});

describe("sentenceSpanAt", () => {
  const T = "A primeira frase é curta. A segunda frase é bem mais longa e cheia de detalhes.";
  it("devolve a frase que contém o offset", () => {
    expect(sentenceSpanAt(T, T.indexOf("segunda")).text).toBe(
      "A segunda frase é bem mais longa e cheia de detalhes.",
    );
    expect(sentenceSpanAt(T, 2).text).toBe("A primeira frase é curta.");
  });
});

describe("rewriteTargetAt — unidade certa (nunca o documento inteiro)", () => {
  it("texto COM parágrafos: alvo é o parágrafo", () => {
    const t = "Parágrafo um, primeiro.\n\nParágrafo dois, com uma frase. E outra frase aqui.";
    const r = rewriteTargetAt(t, t.indexOf("outra"));
    expect(r.unit).toBe("paragraph");
    expect(r.span.text).toBe("Parágrafo dois, com uma frase. E outra frase aqui.");
  });

  it("BLOCO contínuo (sem linha em branco): alvo é a FRASE, não o texto todo", () => {
    const t = "Primeira frase do bloco corrido. Segunda frase, bem mais longa, do mesmo bloco sem quebras.";
    const r = rewriteTargetAt(t, t.indexOf("Segunda"));
    expect(r.unit).toBe("sentence");
    expect(r.span.text).toBe("Segunda frase, bem mais longa, do mesmo bloco sem quebras.");
    expect(r.span.text).not.toBe(t); // NUNCA o documento inteiro
  });
});
