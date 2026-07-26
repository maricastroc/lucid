import { describe, expect, it } from "vitest";
import { buildDocument } from "./support/pt";
import { runMetrics } from "./support/pt";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

describe("runMetrics — empty document", () => {
  it("empty text: counts go to zero, but Flesch-PT is null (not measured) — no NaN/Infinity", () => {
    const doc = buildDocument("");
    const metrics = runMetrics(doc);

    expect(metrics).toEqual({
      fleschPt: null,
      words: 0,
      sentences: 0,
      syllables: 0,
      wordsPerSentence: 0,
      syllablesPerWord: 0,
      cohesion: {
        referentialOverlap: 0,
        adjacentGapRatio: 0,
        connectivesPer100Words: 0,
        connectivesByClass: { additive: 0, adversative: 0, causal: 0, temporal: 0, conclusive: 0 },
      },
    });
  });

  it("text with only spaces/line breaks: no sentence and no word, hence no measurement", () => {
    const doc = buildDocument("   \n\n  \t  ");
    const metrics = runMetrics(doc);
    expect(metrics.sentences).toBe(0);
    expect(metrics.words).toBe(0);
    expect(metrics.fleschPt).toBeNull();
  });

  it("text with only punctuation (no word at all) does not get a 0 — it gets null", () => {
    const doc = buildDocument("!!! ??? ...");
    const metrics = runMetrics(doc);
    expect(metrics.words).toBe(0);
    expect(metrics.syllables).toBe(0);
    expect(metrics.fleschPt).toBeNull();
    expect(metrics.fleschPt).not.toBeNaN();
  });
});

describe("runMetrics — single-sentence text", () => {
  it("computes totals and Flesch-PT for a single sentence", () => {
    const doc = buildDocument("O gato subiu no telhado.");
    const metrics = runMetrics(doc);

    expect(metrics.sentences).toBe(1);
    expect(metrics.words).toBe(5);
    expect(metrics.wordsPerSentence).toBe(5);
    expect(metrics.syllablesPerWord).toBe(metrics.syllables / metrics.words);

    const expected = 248.835 - 1.015 * (metrics.words / metrics.sentences) - 84.6 * (metrics.syllables / metrics.words);
    expect(metrics.fleschPt).toBeCloseTo(expected, 1);
  });
});

describe("runMetrics — multi-sentence text", () => {
  it("aggregates totals for the whole document, not just the last sentence", () => {
    const source = "O gato subiu no telhado. O cachorro correu muito rápido pelo jardim ontem.";
    const doc = buildDocument(source);
    const metrics = runMetrics(doc);

    expect(metrics.sentences).toBe(2);
    expect(metrics.words).toBe(doc.tokens.filter((t) => t.isWord).length);
    expect(metrics.wordsPerSentence).toBe(metrics.words / metrics.sentences);
  });

  it("longer sentences on average lower the Flesch-PT relative to short ones", () => {
    const short = runMetrics(buildDocument("O gato subiu. O cão correu."));
    const long = runMetrics(
      buildDocument(
        "O gato subiu rapidamente pelo telhado alto da casa vizinha durante a tarde. " +
          "O cão correu atrás dele por muito tempo sem nunca conseguir alcançá-lo.",
      ),
    );
    expect(long.fleschPt).not.toBeNull();
    expect(short.fleschPt).not.toBeNull();
    expect(long.fleschPt!).toBeLessThan(short.fleschPt!);
  });
});

describe("runMetrics — rounding at the output boundary", () => {
  it("honors config.metrics.decimalPlaces for the three derived fields", () => {
    const doc = buildDocument("O gato subiu no telhado. O cachorro correu muito rápido pelo jardim.");

    const oneDecimal = runMetrics(doc, { ...DEFAULT_CONFIG, metrics: { decimalPlaces: 1 } });
    const zeroDecimals = runMetrics(doc, { ...DEFAULT_CONFIG, metrics: { decimalPlaces: 0 } });
    const threeDecimals = runMetrics(doc, { ...DEFAULT_CONFIG, metrics: { decimalPlaces: 3 } });

    for (const m of [oneDecimal, zeroDecimals, threeDecimals]) {
      expect(m.words).toBe(oneDecimal.words);
      expect(m.sentences).toBe(oneDecimal.sentences);
      expect(m.syllables).toBe(oneDecimal.syllables);
    }

    expect(Number.isInteger(zeroDecimals.fleschPt)).toBe(true);
    expect(Number.isInteger(zeroDecimals.wordsPerSentence)).toBe(true);
    expect(Number.isInteger(zeroDecimals.syllablesPerWord)).toBe(true);
  });

  it("no raw float leaks into the JSON — decimal places honor the configured limit", () => {
    const doc = buildDocument("O gato subiu rapidamente pelo telhado da casa vizinha durante a tarde de domingo.");
    const metrics = runMetrics(doc, { ...DEFAULT_CONFIG, metrics: { decimalPlaces: 2 } });

    for (const field of ["fleschPt", "wordsPerSentence", "syllablesPerWord"] as const) {
      const text = String(metrics[field]);
      const decimals = text.includes(".") ? text.split(".")[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(2);
    }
  });
});

describe("runMetrics — Unicode NFC/NFD", () => {
  it("produces the same metrics for equivalent text in NFC and NFD", () => {
    const nfc = "A política pública precisa ser clara e acessível para todos os cidadãos.";
    const nfd = nfc.normalize("NFD");

    const metricsNfc = runMetrics(buildDocument(nfc));
    const metricsNfd = runMetrics(buildDocument(nfd));

    expect(metricsNfd).toEqual(metricsNfc);
  });
});

describe("runMetrics — determinism (byte-identical on repeated runs)", () => {
  it("the same input always produces the same JSON", () => {
    const source =
      "O Sr. Dr. João A. Silva, nascido em 1.234, escreveu para contato@exemplo.com.br. " +
      "Veja https://exemplo.com/pagina. Isso é ótimo! A saída foi rápida e a saúde, ótima.";

    const doc = buildDocument(source);
    const m1 = JSON.stringify(runMetrics(doc));
    const m2 = JSON.stringify(runMetrics(doc));
    const m3 = JSON.stringify(runMetrics(buildDocument(source)));

    expect(m2).toBe(m1);
    expect(m3).toBe(m1);
  });
});
