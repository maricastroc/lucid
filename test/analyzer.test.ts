import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyze, sortFindings } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";
import { buildDocument } from "./support/pt";
import { runMetrics } from "./support/pt";
import type { Config } from "../src/lucid/core/config";
import type { Finding } from "../src/lucid/core/types";

describe("analyze — empty document", () => {
  it("empty text produces a Diagnostic with no findings, a zeroed scorecard and zeroed metrics", () => {
    const diagnostic = analyze("");

    expect(diagnostic.text).toBe("");
    expect(diagnostic.findings).toEqual([]);
    expect(diagnostic.score).toEqual({
      byCriterion: [
        { criterion: "long_sentence", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "passive_voice", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "passiva_sintetica", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "nominalization", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "nominalizacao_encadeada", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "jargon", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "sigla_sem_expansao", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "mais_que_perfeito_sintetico", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "gerundismo", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "adverbio_mente_denso", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "adverbios_vagos", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "redundancia", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "perifrase_inflada", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "paragraph_length", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "prose_enumeration", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "mesoclise", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "dupla_negacao", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "subordinacao_densa", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "leitor_terceira_pessoa", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "salto_de_nivel_titulo", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "long_heading", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "single_item_list", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "heading_body_mismatch", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
      ],
      totalFindings: 0,
    });
    expect(diagnostic.metrics).toEqual({
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
});

describe("analyze — document with no findings", () => {
  it("text with short sentences yields no findings, but metrics and scorecard still reflect the text", () => {
    const diagnostic = analyze("O gato subiu. O cão correu.");

    expect(diagnostic.findings).toEqual([]);
    expect(diagnostic.score.totalFindings).toBe(0);
    expect(diagnostic.score.byCriterion).toHaveLength(23);
    for (const entry of diagnostic.score.byCriterion) {
      expect(entry.count).toEqual({ info: 0, warning: 0, error: 0 });
      expect(entry.densityPer100Words).toBe(0);
    }
    expect(diagnostic.metrics.words).toBeGreaterThan(0);
    expect(diagnostic.metrics.sentences).toBe(2);
  });
});

describe("analyze — document with one finding", () => {
  it("a long sentence yields exactly one finding with the correct fields", () => {
    const config: Config = { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 5, errorAbove: 100 } };
    const text = "Esta é uma frase propositalmente longa para ultrapassar o limite de alerta configurado no teste.";

    const diagnostic = analyze(text, config);

    expect(diagnostic.findings).toHaveLength(1);
    const [finding] = diagnostic.findings;
    expect(finding.criterion).toBe("long_sentence");
    expect(finding.category).toBe("syntactic");
    expect(finding.normativeReference?.section).toBe("5.3.4");
    expect(finding.severity).toBe("warning");
    expect(finding.requiresHuman).toBe(true);
    expect(finding.suggestion).toBeUndefined();

    expect(diagnostic.score.totalFindings).toBe(1);
    expect(diagnostic.score.byCriterion[0].count.warning).toBe(1);
  });
});

describe("analyze — multiple findings", () => {
  it("several long sentences yield one finding per sentence, all counted in the scorecard", () => {
    const config: Config = { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 3, errorAbove: 1000 } };
    const text = "Uma frase bem longa para o teste. Outra frase também bem longa aqui. Mais uma frase igualmente longa.";
    const diagnostic = analyze(text, config);

    expect(diagnostic.findings).toHaveLength(3);
    expect(diagnostic.score.totalFindings).toBe(3);
    expect(diagnostic.score.byCriterion[0].count.warning).toBe(3);
  });
});

describe("sortFindings — canonical ordering independent of input order", () => {
  function finding(overrides: Partial<Finding>): Finding {
    return {
      criterion: "long_sentence",
      category: "syntactic",
      source: "iso-24495-1",
      principleGroup: "understandable",
      normativeReference: { standard: "ABNT NBR ISO 24495-1", section: "5.3.4" },
      span: { start: 0, end: 1, text: "x" },
      severity: "warning",
      requiresHuman: true,
      justification: "j",
      ...overrides,
    };
  }

  it("sorts by span.start, span.end and criterion, in that order", () => {
    const a = finding({ span: { start: 10, end: 20, text: "a" } });
    const b = finding({ span: { start: 0, end: 5, text: "b" } });
    const c = finding({ span: { start: 0, end: 10, text: "c" } });
    const d = finding({ span: { start: 0, end: 5, text: "d" }, criterion: "aaa_criterion" });

    const expected = [d.span.text, b.span.text, c.span.text, a.span.text];

    for (const input of permutations([a, b, c, d])) {
      const result = sortFindings(input).map((f) => f.span.text);
      expect(result).toEqual(expected);
    }
  });

  it("does not mutate the input array", () => {
    const a = finding({ span: { start: 10, end: 20, text: "a" } });
    const b = finding({ span: { start: 0, end: 5, text: "b" } });
    const input = [a, b];
    const originalCopy = [...input];

    sortFindings(input);

    expect(input).toEqual(originalCopy);
  });
});

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const result: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([items[i], ...perm]);
    }
  }
  return result;
}

describe("analyze — custom configuration", () => {
  it("custom thresholds change which sentences become findings", () => {
    const text = "Frase curta de teste aqui agora.";

    const withoutFindings = analyze(text, DEFAULT_CONFIG);
    const withFindings = analyze(text, { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 2, errorAbove: 1000 } });

    expect(withoutFindings.findings).toHaveLength(0);
    expect(withFindings.findings).toHaveLength(1);
  });

  it("different configs produce different configHashes", () => {
    const text = "Texto qualquer para o teste de hash.";

    const standard = analyze(text);
    const custom = analyze(text, { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 2, errorAbove: 4 } });

    expect(custom.meta.configHash).not.toBe(standard.meta.configHash);
  });
});

describe("analyze — integrated metrics", () => {
  it("Diagnostic.metrics is identical to what runMetrics(buildDocument(text)) would produce on its own", () => {
    const text = "O gato subiu no telhado rapidamente. O cachorro correu atrás dele por muito tempo.";

    const diagnostic = analyze(text);
    const standaloneMetrics = runMetrics(buildDocument(text), DEFAULT_CONFIG);

    expect(diagnostic.metrics).toEqual(standaloneMetrics);
  });
});

describe("analyze — offsets preserved", () => {
  it("each finding's span reconstructs the excerpt exactly by slicing Diagnostic.text", () => {
    const config: Config = { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 3, errorAbove: 1000 } };
    const text = "Primeira frase bem longa para o teste. Segunda frase também bem longa aqui.";

    const diagnostic = analyze(text, config);

    expect(diagnostic.findings.length).toBeGreaterThan(0);
    for (const finding of diagnostic.findings) {
      expect(diagnostic.text.slice(finding.span.start, finding.span.end)).toBe(finding.span.text);
    }
  });
});

describe("analyze — byte-identical on repeated runs", () => {
  it("the same input always produces the same JSON (default config)", () => {
    const text =
      "O Sr. Dr. João A. Silva, nascido em 1.234, escreveu para contato@exemplo.com.br sobre um assunto qualquer. " +
      "Veja https://exemplo.com/pagina. Isso é ótimo! A saída foi rápida e a saúde, ótima.";

    const r1 = JSON.stringify(analyze(text));
    const r2 = JSON.stringify(analyze(text));

    expect(r2).toBe(r1);
  });

  it("the same input always produces the same JSON (custom config)", () => {
    const text = "Primeira frase bem longa para o teste. Segunda frase também bem longa aqui.";
    const config: Config = { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 3, errorAbove: 6 } };

    const r1 = JSON.stringify(analyze(text, config));
    const r2 = JSON.stringify(analyze(text, config));

    expect(r2).toBe(r1);
  });
});

describe("analyze — the absence of findings never becomes 'approved'", () => {
  it("Diagnostic and Score carry no approval field, even with no findings", () => {
    const diagnostic = analyze("Frase curta.");

    expect(Object.keys(diagnostic).sort()).toEqual(["findings", "meta", "metrics", "score", "text"]);
    expect(Object.keys(diagnostic.score).sort()).toEqual(["byCriterion", "totalFindings"]);

    const json = JSON.stringify(diagnostic).toLowerCase();
    expect(json).not.toContain("aprovad");
    expect(json).not.toContain("approved");
    expect(json).not.toContain('"ok"');
  });
});

describe("analyzer — absence of forbidden imports", () => {
  const files = ["core/analyzer.ts", "core/score/index.ts", "core/document/model.ts", "core/metrics/index.ts"];

  it.each(files)("%s does not import probe/report/react/next/network", (relativeFile) => {
    const filePath = path.join(__dirname, "..", "src", "lucid", relativeFile);
    const source = readFileSync(filePath, "utf-8");

    expect(source).not.toMatch(/from\s+["'].*\/probe/);
    expect(source).not.toMatch(/from\s+["'].*\/report/);
    expect(source).not.toMatch(/from\s+["']react/);
    expect(source).not.toMatch(/from\s+["']next/);
    expect(source).not.toMatch(/https?:\/\//);
    expect(source).not.toMatch(/\bfetch\(/);
  });
});
