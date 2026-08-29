import { describe, expect, it } from "vitest";
import { analyze, analyzeWithPasses } from "../src/lucid";
import { sentenceLengthPass } from "../src/locales/pt-BR/passes/sentence-length";
import { passiveVoicePass } from "../src/locales/pt-BR/passes/passive-voice";
import { nominalizationPass } from "../src/locales/pt-BR/passes/nominalization";
import { jargonPass, compileJargonEntries } from "../src/locales/pt-BR/passes/jargon";
import jargaoData from "../src/locales/pt-BR/datasets/jargao.pt.json";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";
import type { Config } from "../src/lucid/core/config";
import type { Pass } from "../src/lucid/core/types";

const RICH_TEXT =
  "O pedido foi analisado pela comissão, que decidiu fazer a verificação dos documentos " +
  "supracitados antes de conceder, em sede de procedimento administrativo, o benefício " +
  "pleiteado. Doravante, outrossim, o relatório supramencionado foi juntado aos autos.";

const TEXTS: readonly string[] = [
  "",
  "     ",
  "O gato dorme.",
  "O recurso foi negado em sede de apelação.",
  "É preciso fazer a análise de documentos.",
  RICH_TEXT,
];

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  const result: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const perm of permutations(rest)) result.push([items[i], ...perm]);
  }
  return result;
}

function canonicalProjection(text: string, passes: readonly Pass[]) {
  const d = analyzeWithPasses(text, passes);
  const sortedByCriterion = [...d.score.byCriterion].sort((a, b) => (a.criterion < b.criterion ? -1 : 1));
  return JSON.stringify({
    text: d.text,
    findings: d.findings,
    metrics: d.metrics,
    meta: d.meta,
    totalFindings: d.score.totalFindings,
    byCriterion: sortedByCriterion,
  });
}

describe("determinism — byte-identical repetition", () => {
  it.each(TEXTS)("the same input produces identical JSON: %s", (text) => {
    const r1 = JSON.stringify(analyze(text));
    const r2 = JSON.stringify(analyze(text));
    const r3 = JSON.stringify(analyze(text));
    expect(r2).toBe(r1);
    expect(r3).toBe(r1);
  });

  it("the result is deeply equal (not just its serialization)", () => {
    expect(analyze(RICH_TEXT)).toEqual(analyze(RICH_TEXT));
  });
});

describe("determinism — independence from pass execution order (24 permutations)", () => {
  const ALL: readonly Pass[] = [sentenceLengthPass, passiveVoicePass, nominalizationPass, jargonPass];
  const perms = permutations(ALL);

  it("there are exactly 24 permutations of the 4 passes", () => {
    expect(perms).toHaveLength(24);
  });

  it.each(TEXTS)("the canonical projection is identical across all 24 permutations: %s", (text) => {
    const reference = canonicalProjection(text, ALL);
    for (const perm of perms) {
      expect(canonicalProjection(text, perm)).toBe(reference);
    }
  });

  it("findings and metrics are order-independent; only the ORDER of byCriterion follows the registry", () => {
    const reversed = [...ALL].reverse();
    const d1 = analyzeWithPasses(RICH_TEXT, ALL);
    const d2 = analyzeWithPasses(RICH_TEXT, reversed);

    expect(d2.findings).toEqual(d1.findings);
    expect(d2.metrics).toEqual(d1.metrics);
    expect(d2.score.totalFindings).toBe(d1.score.totalFindings);
    expect([...d2.score.byCriterion].sort((a, b) => (a.criterion < b.criterion ? -1 : 1))).toEqual(
      [...d1.score.byCriterion].sort((a, b) => (a.criterion < b.criterion ? -1 : 1)),
    );
    expect(d2.score.byCriterion.map((c) => c.criterion)).toEqual(
      d1.score.byCriterion.map((c) => c.criterion).reverse(),
    );
  });
});

describe("determinism — independence from dataset entry order (jargon longest-match-first)", () => {
  const synthetic = [
    { term: "em", kind: "word", domain: "legal", plain: "no", safeForSuggestion: true, reason: null },
    {
      term: "em sede de",
      kind: "phrase",
      domain: "legal",
      plain: "no âmbito de",
      safeForSuggestion: true,
      reason: null,
    },
    { term: "em face de", kind: "phrase", domain: "legal", plain: "diante de", safeForSuggestion: true, reason: null },
  ] as const;

  function orderByFirstWord(entries: readonly (typeof synthetic)[number][]) {
    const compiled = compileJargonEntries(entries as never);
    const list = compiled.get("em")!;
    return list.map((c) => c.words.length);
  }

  it("same first word → always longest to shortest, whatever the input order", () => {
    const direct = orderByFirstWord(synthetic);
    const reversed = orderByFirstWord([...synthetic].reverse());
    expect(direct).toEqual([3, 3, 1]);
    expect(reversed).toEqual(direct);
  });

  it("the set of terms per first word is independent of the input order", () => {
    const terms = (entries: readonly (typeof synthetic)[number][]) =>
      new Set(
        compileJargonEntries(entries as never)
          .get("em")!
          .map((c) => c.words.join(" ")),
      );
    expect(terms([...synthetic].reverse())).toEqual(terms(synthetic));
  });

  it("the real dataset produces the same BY_FIRST_WORD with the entries reversed", () => {
    const entries = jargaoData.entries as never[];
    const directKeys = [...compileJargonEntries(entries).keys()].sort();
    const reversedKeys = [...compileJargonEntries([...entries].reverse()).keys()].sort();
    expect(reversedKeys).toEqual(directKeys);
  });
});

describe("determinism — no shared state (A, B, A)", () => {
  it("analyze(A); analyze(B); analyze(A) — the 1st and the 3rd A are identical", () => {
    const A = RICH_TEXT;
    const B = "É preciso realizar o pagamento da taxa. O prazo foi prorrogado pelo diretor.";
    const firstA = JSON.stringify(analyze(A));
    JSON.stringify(analyze(B));
    const thirdA = JSON.stringify(analyze(A));
    expect(thirdA).toBe(firstA);
  });

  it("repeated calls do not accumulate findings", () => {
    const before = analyze(RICH_TEXT).findings.length;
    for (let i = 0; i < 5; i++) analyze(RICH_TEXT);
    expect(analyze(RICH_TEXT).findings.length).toBe(before);
  });

  it("analyze does not mutate the Config object it receives", () => {
    const config: Config = { ...DEFAULT_CONFIG, nominalization: { ...DEFAULT_CONFIG.nominalization } };
    const copy = structuredClone(config);
    analyze(RICH_TEXT, config);
    expect(config).toEqual(copy);
  });

  it("the same Config object reused across several calls produces stable results", () => {
    const config: Config = { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 8, errorAbove: 20 } };
    const r1 = JSON.stringify(analyze(RICH_TEXT, config));
    JSON.stringify(analyze("outro texto qualquer aqui", config));
    const r2 = JSON.stringify(analyze(RICH_TEXT, config));
    expect(r2).toBe(r1);
  });
});

describe("determinism — Config variations", () => {
  const variants: Array<{ name: string; config: Partial<Config> }> = [
    { name: "default", config: {} },
    {
      name: "long_sentence off (very high threshold)",
      config: { sentenceLength: { warnAbove: 10_000, errorAbove: 20_000 } },
    },
    { name: "passive off", config: { passiveVoice: { enabled: false } } },
    { name: "nominalization off", config: { nominalization: { enabled: false } } },
    { name: "jargon off", config: { jargon: { enabled: false, suggestFromGlossary: true } } },
    {
      name: "jargon with no informative equivalent",
      config: { jargon: { enabled: true, suggestFromGlossary: false } },
    },
    { name: "partial threshold override", config: { sentenceLength: { warnAbove: 5, errorAbove: 12 } } },
  ];

  it.each(variants)("$name — deterministic and byte-identical across runs", ({ config }) => {
    const r1 = JSON.stringify(analyze(RICH_TEXT, config));
    const r2 = JSON.stringify(analyze(RICH_TEXT, config));
    expect(r2).toBe(r1);
  });

  it("each disabled pass zeroes exactly its own criterion, without affecting the others", () => {
    const base = analyze(RICH_TEXT);
    const withoutJargon = analyze(RICH_TEXT, { jargon: { enabled: false, suggestFromGlossary: true } });

    expect(withoutJargon.findings.some((f) => f.criterion === "jargon")).toBe(false);

    for (const criterion of ["long_sentence", "passive_voice", "nominalization"] as const) {
      expect(withoutJargon.findings.filter((f) => f.criterion === criterion)).toEqual(
        base.findings.filter((f) => f.criterion === criterion),
      );
    }
  });
});
