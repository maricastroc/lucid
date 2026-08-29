import { describe, expect, it } from "vitest";
import { paragraphSpanAt, rewriteTargetAt } from "../src/app/lib/paragraphs";
import { sentenceSpanAt } from "../src/lucid";

const DOC = "Primeiro parágrafo aqui.\n\nSegundo parágrafo, mais longo, no meio.\n\nTerceiro e último.";

describe("paragraphSpanAt", () => {
  it("returns the paragraph containing the offset (a middle one)", () => {
    const offset = DOC.indexOf("mais longo");
    const span = paragraphSpanAt(DOC, offset);
    expect(span.text).toBe("Segundo parágrafo, mais longo, no meio.");
    expect(DOC.slice(span.start, span.end)).toBe(span.text);
  });

  it("first paragraph: starts at 0", () => {
    const span = paragraphSpanAt(DOC, 3);
    expect(span.text).toBe("Primeiro parágrafo aqui.");
    expect(span.start).toBe(0);
  });

  it("last paragraph: runs to the end", () => {
    const offset = DOC.indexOf("último");
    const span = paragraphSpanAt(DOC, offset);
    expect(span.text).toBe("Terceiro e último.");
    expect(span.end).toBe(DOC.length);
  });

  it("no blank lines: the paragraph is the whole text (trimmed)", () => {
    const t = "  uma frase só, sem quebras.  ";
    const span = paragraphSpanAt(t, 5);
    expect(span.text).toBe("uma frase só, sem quebras.");
  });

  it("an offset inside the blank line falls into the next paragraph", () => {
    const span = paragraphSpanAt(DOC, DOC.indexOf("\n\n") + 1);
    expect(span.text).toBe("Segundo parágrafo, mais longo, no meio.");
  });
});

describe("sentenceSpanAt", () => {
  const T = "A primeira frase é curta. A segunda frase é bem mais longa e cheia de detalhes.";
  it("returns the sentence containing the offset", () => {
    expect(sentenceSpanAt(T, T.indexOf("segunda")).text).toBe("A segunda frase é bem mais longa e cheia de detalhes.");
    expect(sentenceSpanAt(T, 2).text).toBe("A primeira frase é curta.");
  });
});

describe("rewriteTargetAt — the right unit (never the whole document)", () => {
  it("text WITH paragraphs: the target is the paragraph", () => {
    const t = "Parágrafo um, primeiro.\n\nParágrafo dois, com uma frase. E outra frase aqui.";
    const r = rewriteTargetAt(t, t.indexOf("outra"));
    expect(r.unit).toBe("paragraph");
    expect(r.span.text).toBe("Parágrafo dois, com uma frase. E outra frase aqui.");
  });

  it("a continuous BLOCK (no blank line): the target is the SENTENCE, not the whole text", () => {
    const t = "Primeira frase do bloco corrido. Segunda frase, bem mais longa, do mesmo bloco sem quebras.";
    const r = rewriteTargetAt(t, t.indexOf("Segunda"));
    expect(r.unit).toBe("sentence");
    expect(r.span.text).toBe("Segunda frase, bem mais longa, do mesmo bloco sem quebras.");
    expect(r.span.text).not.toBe(t);
  });
});
