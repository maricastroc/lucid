import { describe, expect, it } from "vitest";
import { buildDocument } from "./support/pt";

describe("known regression — the 'etc.' abbreviation can merge sentences", () => {
  it("'etc. Voltamos' stays as ONE sentence (documented trade-off, not fixed here)", () => {
    const source = "Compramos frutas, verduras, etc. Voltamos cedo para casa.";
    const doc = buildDocument(source);

    expect(doc.sentences).toHaveLength(1);
    expect(doc.sentences[0].text).toBe(source);
  });

  it("even merged, the sentence tokenizes 'etc' and 'Voltamos' as distinct words", () => {
    const source = "Compramos frutas, verduras, etc. Voltamos cedo para casa.";
    const doc = buildDocument(source);

    const texts = doc.sentences[0].tokens.map((t) => t.text);
    expect(texts).toContain("etc");
    expect(texts).toContain("Voltamos");

    const etcIndex = texts.indexOf("etc");
    expect(texts[etcIndex + 1]).toBe(".");
  });
});

describe("known regression — an acronym ending in a period can merge sentences", () => {
  it("'E.U.A. Eles moram' stays as ONE sentence (documented trade-off, not fixed here)", () => {
    const source = "Nós moramos nos E.U.A. Eles moram na França.";
    const doc = buildDocument(source);

    expect(doc.sentences).toHaveLength(1);
    expect(doc.sentences[0].text).toBe(source);
  });

  it("even merged, the acronym tokenizes as a single word token ('E.U.A')", () => {
    const source = "Nós moramos nos E.U.A. Eles moram na França.";
    const doc = buildDocument(source);

    const acronym = doc.sentences[0].tokens.find((t) => t.text.startsWith("E."));
    expect(acronym?.text).toBe("E.U.A");
    expect(acronym?.isWord).toBe(true);

    const texts = doc.sentences[0].tokens.map((t) => t.text);
    expect(texts).toContain("Eles");
    expect(texts).toContain("moram");
  });

  it("the merged sentence's wordCount adds up the words of both 'grammatical sentences'", () => {
    const source = "Nós moramos nos E.U.A. Eles moram na França.";
    const doc = buildDocument(source);

    expect(doc.sentences[0].wordCount).toBe(8);
  });
});
