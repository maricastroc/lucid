import { describe, expect, it } from "vitest";
import { createDataView } from "../src/locales/pt-BR/datasets/registry";
import { sentenceLengthPass } from "../src/locales/pt-BR/passes/sentence-length";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";
import { buildDocument } from "./support/pt";
import type { Config } from "../src/lucid/core/config";
import type { Document, PassContext, Sentence } from "../src/lucid/core/types";

function sentence(overrides: Partial<Sentence>): Sentence {
  const text = overrides.text ?? "x".repeat(10);
  return {
    text,
    start: overrides.start ?? 0,
    end: overrides.end ?? text.length,
    tokens: overrides.tokens ?? [],
    wordCount: overrides.wordCount ?? 0,
  };
}

function buildTestDocument(sentences: Sentence[]): Document {
  return { source: sentences.map((s) => s.text).join(" "), sentences, tokens: [], blocks: [] };
}

function buildContext(sentences: Sentence[], config: Config = DEFAULT_CONFIG): PassContext {
  return { doc: buildTestDocument(sentences), config, data: createDataView([]) };
}

describe("sentenceLengthPass — below the limit", () => {
  it("a sentence with wordCount below warnAbove yields no finding", () => {
    const ctx = buildContext([sentence({ wordCount: 10 })]);
    expect(sentenceLengthPass.run(ctx)).toEqual([]);
  });
});

describe("sentenceLengthPass — exactly at the limit (exclusive)", () => {
  it("wordCount === warnAbove (20) yields no finding — the threshold is '>', not '>='", () => {
    const ctx = buildContext([sentence({ wordCount: DEFAULT_CONFIG.sentenceLength.warnAbove })]);
    expect(sentenceLengthPass.run(ctx)).toEqual([]);
  });

  it("wordCount === errorAbove (30) yields 'warning', not 'error' — the same exclusive threshold", () => {
    const ctx = buildContext([sentence({ wordCount: DEFAULT_CONFIG.sentenceLength.errorAbove })]);
    const findings = sentenceLengthPass.run(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("warning");
    expect(findings[0].meta).toMatchObject({ threshold: DEFAULT_CONFIG.sentenceLength.warnAbove });
  });
});

describe("sentenceLengthPass — above the limit", () => {
  it("wordCount === warnAbove + 1 yields 'warning'", () => {
    const ctx = buildContext([sentence({ wordCount: DEFAULT_CONFIG.sentenceLength.warnAbove + 1 })]);
    const findings = sentenceLengthPass.run(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("warning");
  });

  it("wordCount === errorAbove + 1 yields 'error'", () => {
    const ctx = buildContext([sentence({ wordCount: DEFAULT_CONFIG.sentenceLength.errorAbove + 1 })]);
    const findings = sentenceLengthPass.run(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("error");
    expect(findings[0].meta).toMatchObject({ threshold: DEFAULT_CONFIG.sentenceLength.errorAbove });
  });
});

describe("sentenceLengthPass — several sentences", () => {
  it("evaluates each sentence independently and only reports the ones over the limit", () => {
    const short = sentence({ text: "curta", start: 0, end: 5, wordCount: 5 });
    const warning = sentence({ text: "media", start: 6, end: 11, wordCount: 25 });
    const error = sentence({ text: "longa", start: 12, end: 17, wordCount: 40 });

    const ctx = buildContext([short, warning, error]);
    const findings = sentenceLengthPass.run(ctx);

    expect(findings).toHaveLength(2);
    expect(findings[0].span.text).toBe("media");
    expect(findings[0].severity).toBe("warning");
    expect(findings[1].span.text).toBe("longa");
    expect(findings[1].severity).toBe("error");
  });
});

describe("sentenceLengthPass — different severity levels", () => {
  it("meta.threshold distinguishes which threshold was crossed (warning vs. error)", () => {
    const warning = sentence({ text: "a", start: 0, end: 1, wordCount: 25 });
    const error = sentence({ text: "b", start: 2, end: 3, wordCount: 35 });

    const findings = sentenceLengthPass.run(buildContext([warning, error]));

    expect(findings[0].meta).toEqual({ words: 25, threshold: DEFAULT_CONFIG.sentenceLength.warnAbove });
    expect(findings[1].meta).toEqual({ words: 35, threshold: DEFAULT_CONFIG.sentenceLength.errorAbove });
  });
});

describe("sentenceLengthPass — empty text", () => {
  it("a document with no sentences yields no finding at all", () => {
    const doc = buildDocument("");
    const findings = sentenceLengthPass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });
    expect(findings).toEqual([]);
  });
});

describe("sentenceLengthPass — exact offsets", () => {
  it("the span uses the Sentence's exact start/end/text, reconstructing by slice", () => {
    const source = "Esta é uma frase razoavelmente longa para efeitos de teste de comprimento aqui mesmo.";
    const doc = buildDocument(source);
    const config: Config = { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 5, errorAbove: 100 } };

    const findings = sentenceLengthPass.run({ doc, config, data: createDataView([]) });

    expect(findings).toHaveLength(1);
    const [finding] = findings;
    const docSentence = doc.sentences[0];

    expect(finding.span.start).toBe(docSentence.start);
    expect(finding.span.end).toBe(docSentence.end);
    expect(finding.span.text).toBe(docSentence.text);
    expect(source.slice(finding.span.start, finding.span.end)).toBe(finding.span.text);
  });
});

describe("sentenceLengthPass — deterministic order", () => {
  it("findings come out in the same order as the sentences in the document (increasing offsets)", () => {
    const f1 = sentence({ text: "um", start: 0, end: 2, wordCount: 25 });
    const f2 = sentence({ text: "dois", start: 3, end: 7, wordCount: 26 });
    const f3 = sentence({ text: "tres", start: 8, end: 12, wordCount: 27 });

    const findings = sentenceLengthPass.run(buildContext([f1, f2, f3]));

    expect(findings.map((f) => f.span.start)).toEqual([0, 3, 8]);
  });
});

describe("sentenceLengthPass — byte-identical on repeated runs", () => {
  it("the same input always produces the same JSON", () => {
    const source =
      "Esta primeira frase é longa o bastante para ultrapassar o limite de alerta configurado aqui. " +
      "Esta segunda frase também é bem longa e deve ultrapassar o limite de erro que foi definido para o teste.";
    const doc = buildDocument(source);
    const config: Config = { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 5, errorAbove: 15 } };
    const ctx: PassContext = { doc, config, data: createDataView([]) };

    const r1 = JSON.stringify(sentenceLengthPass.run(ctx));
    const r2 = JSON.stringify(sentenceLengthPass.run(ctx));
    const r3 = JSON.stringify(sentenceLengthPass.run({ doc: buildDocument(source), config, data: createDataView([]) }));

    expect(r2).toBe(r1);
    expect(r3).toBe(r1);
  });
});

describe("sentenceLengthPass — regression: sentences merged by the conservative segmentation policy", () => {
  const lowThresholdConfig: Config = { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 3, errorAbove: 1000 } };

  it("'etc.' followed by a new sentence stays merged and is evaluated as a single sentence", () => {
    const source = "Compramos frutas, verduras, etc. Voltamos cedo para casa.";
    const doc = buildDocument(source);

    expect(doc.sentences).toHaveLength(1);

    const findings = sentenceLengthPass.run({ doc, config: lowThresholdConfig, data: createDataView([]) });

    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe(source);
    expect(findings[0].meta).toMatchObject({ words: doc.sentences[0].wordCount });
  });

  it("an acronym ending in a period followed by a new sentence stays merged and is evaluated as a single sentence", () => {
    const source = "Nós moramos nos E.U.A. Eles moram na França.";
    const doc = buildDocument(source);

    expect(doc.sentences).toHaveLength(1);

    const findings = sentenceLengthPass.run({ doc, config: lowThresholdConfig, data: createDataView([]) });

    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe(source);
    expect(findings[0].meta).toMatchObject({ words: doc.sentences[0].wordCount });
  });
});
