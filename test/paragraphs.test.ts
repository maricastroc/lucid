import { describe, expect, it } from "vitest";
import { paragraphSpanAt } from "../src/app/lib/paragraphs";

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
