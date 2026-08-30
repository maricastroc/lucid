import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { detectedProse, detectionHeadline, longSentenceGuidance } from "../src/app/lib/narrative";
import { findingsInsideSpan } from "../src/app/lib/finding-query";
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

  it("a 30-word sentence yields 'warning' — there is no second, harsher threshold", () => {
    const ctx = buildContext([sentence({ wordCount: 30 })]);
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

  it("no sentence length reaches 'error' — length never escalates past inspection", () => {
    for (const wordCount of [21, 31, 40, 60, 95, 400]) {
      const findings = sentenceLengthPass.run(buildContext([sentence({ wordCount })]));
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe("warning");
      expect(findings[0].meta).toMatchObject({ threshold: DEFAULT_CONFIG.sentenceLength.warnAbove });
    }
  });
});

describe("sentenceLengthPass — several sentences", () => {
  it("evaluates each sentence independently and only reports the ones over the limit", () => {
    const short = sentence({ text: "curta", start: 0, end: 5, wordCount: 5 });
    const medium = sentence({ text: "media", start: 6, end: 11, wordCount: 25 });
    const long = sentence({ text: "longa", start: 12, end: 17, wordCount: 40 });

    const ctx = buildContext([short, medium, long]);
    const findings = sentenceLengthPass.run(ctx);

    expect(findings).toHaveLength(2);
    expect(findings[0].span.text).toBe("media");
    expect(findings[0].severity).toBe("warning");
    expect(findings[1].span.text).toBe("longa");
    expect(findings[1].severity).toBe("warning");
  });
});

describe("sentenceLengthPass — meta", () => {
  it("meta carries the measured count and the single inspection trigger", () => {
    const a = sentence({ text: "a", start: 0, end: 1, wordCount: 25 });
    const b = sentence({ text: "b", start: 2, end: 3, wordCount: 35 });

    const findings = sentenceLengthPass.run(buildContext([a, b]));

    expect(findings[0].meta).toEqual({ words: 25, threshold: DEFAULT_CONFIG.sentenceLength.warnAbove });
    expect(findings[1].meta).toEqual({ words: 35, threshold: DEFAULT_CONFIG.sentenceLength.warnAbove });
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
    const config: Config = { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 5 } };

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
    const config: Config = { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 5 } };
    const ctx: PassContext = { doc, config, data: createDataView([]) };

    const r1 = JSON.stringify(sentenceLengthPass.run(ctx));
    const r2 = JSON.stringify(sentenceLengthPass.run(ctx));
    const r3 = JSON.stringify(sentenceLengthPass.run({ doc: buildDocument(source), config, data: createDataView([]) }));

    expect(r2).toBe(r1);
    expect(r3).toBe(r1);
  });
});

describe("sentenceLengthPass — regression: sentences merged by the conservative segmentation policy", () => {
  const lowThresholdConfig: Config = { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 3 } };

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

describe("long_sentence — the finding as the product presents it (ADR-094)", () => {
  const LONG =
    "A equipe da secretaria revisou todos os documentos que chegaram durante a semana passada para " +
    "garantir que o relatório final ficasse completo e correto.";

  it("the headline is the measured count, not a verdict on the sentence", () => {
    const finding = analyze(LONG).findings.find((f) => f.criterion === "long_sentence")!;
    const headline = detectionHeadline(finding);
    expect(headline).toBe("Frase com 24 palavras");
    expect(headline).not.toContain("longa");
  });

  it("the prose separates the standard's guideline from Lucid's own parameter", () => {
    const finding = analyze(LONG).findings.find((f) => f.criterion === "long_sentence")!;
    const prose = detectedProse(finding);
    expect(prose).toContain("parâmetro metodológico do produto");
    expect(prose).toContain("sem estabelecer contagem");
    expect(prose).toContain("mais de uma ideia");
    expect(prose).toContain("não precisa necessariamente ser dividida");
    expect(prose).not.toContain("recomendamos");
  });

  it("the engine justification says the same thing, for the report and the CLI", () => {
    const finding = analyze(LONG).findings.find((f) => f.criterion === "long_sentence")!;
    expect(finding.justification).toContain("um parâmetro do produto, não um limite da norma");
    expect(finding.justification).toContain("mais de uma ideia");
    expect(finding.justification).not.toContain("Considere dividir");
  });

  it("the guidance no longer prescribes how many sentences to split into", () => {
    const finding = analyze(LONG).findings.find((f) => f.criterion === "long_sentence")!;
    const guide = longSentenceGuidance(finding, LONG);
    expect(guide.words).toBe(24);
    expect(guide.threshold).toBe(20);
    expect(guide).not.toHaveProperty("targetSentences");
    expect(guide).not.toHaveProperty("over");
  });

  it("still cites 5.3.4, and the clause it cites is the one the standard titles", () => {
    const finding = analyze(LONG).findings.find((f) => f.criterion === "long_sentence")!;
    expect(finding.source).toBe("iso-24495-1");
    expect(finding.normativeReference).toEqual({ standard: "ABNT NBR ISO 24495-1", section: "5.3.4" });
  });
});

describe("long_sentence — other signals in the same sentence (ADR-094)", () => {
  it("collects the other criteria inside the span without adding them up", () => {
    const text =
      "O relatório supramencionado foi assinado pelo gestor responsável, e a realização da análise dos " +
      "documentos apresentados foi concluída dentro do prazo estabelecido no edital publicado ontem.";
    const findings = analyze(text).findings;
    const long = findings.find((f) => f.criterion === "long_sentence")!;
    const inside = findingsInsideSpan(long, findings);

    expect(inside.length).toBeGreaterThan(0);
    expect(inside.map((f) => f.criterion)).not.toContain("long_sentence");
    for (const other of inside) {
      expect(other.span.start).toBeGreaterThanOrEqual(long.span.start);
      expect(other.span.end).toBeLessThanOrEqual(long.span.end);
    }
  });

  it("an empty result is the absence of signals, and carries no claim of clarity", () => {
    const text =
      "A equipe da secretaria revisou todos os documentos que chegaram durante a semana passada para " +
      "garantir que o relatório final ficasse completo e correto.";
    const findings = analyze(text).findings;
    const long = findings.find((f) => f.criterion === "long_sentence")!;
    expect(findingsInsideSpan(long, findings)).toEqual([]);
  });
});
