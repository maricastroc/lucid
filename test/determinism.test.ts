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

const TEXTO_RICO =
  "O pedido foi analisado pela comissão, que decidiu fazer a verificação dos documentos " +
  "supracitados antes de conceder, em sede de procedimento administrativo, o benefício " +
  "pleiteado. Doravante, outrossim, o relatório supramencionado foi juntado aos autos.";

const TEXTOS: readonly string[] = [
  "",
  "     ",
  "O gato dorme.",
  "O recurso foi negado em sede de apelação.",
  "É preciso fazer a análise de documentos.",
  TEXTO_RICO,
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

function projecaoCanonica(text: string, passes: readonly Pass[]) {
  const d = analyzeWithPasses(text, passes);
  const byCriterionOrdenado = [...d.score.byCriterion].sort((a, b) => (a.criterion < b.criterion ? -1 : 1));
  return JSON.stringify({
    text: d.text,
    findings: d.findings,
    metrics: d.metrics,
    meta: d.meta,
    totalFindings: d.score.totalFindings,
    byCriterion: byCriterionOrdenado,
  });
}

describe("determinismo — repetição byte-idêntica", () => {
  it.each(TEXTOS)("mesma entrada produz JSON idêntico: %s", (text) => {
    const r1 = JSON.stringify(analyze(text));
    const r2 = JSON.stringify(analyze(text));
    const r3 = JSON.stringify(analyze(text));
    expect(r2).toBe(r1);
    expect(r3).toBe(r1);
  });

  it("resultado é profundamente igual (não só serialização)", () => {
    expect(analyze(TEXTO_RICO)).toEqual(analyze(TEXTO_RICO));
  });
});

describe("determinismo — independência da ordem de execução dos passes (24 permutações)", () => {
  const TODOS: readonly Pass[] = [sentenceLengthPass, passiveVoicePass, nominalizationPass, jargonPass];
  const perms = permutations(TODOS);

  it("são exatamente 24 permutações dos 4 passes", () => {
    expect(perms).toHaveLength(24);
  });

  it.each(TEXTOS)("a projeção canônica é idêntica em todas as 24 permutações: %s", (text) => {
    const referencia = projecaoCanonica(text, TODOS);
    for (const perm of perms) {
      expect(projecaoCanonica(text, perm)).toBe(referencia);
    }
  });

  it("findings e métricas independem da ordem; só a ORDEM de byCriterion acompanha o registry", () => {
    const invertido = [...TODOS].reverse();
    const d1 = analyzeWithPasses(TEXTO_RICO, TODOS);
    const d2 = analyzeWithPasses(TEXTO_RICO, invertido);

    expect(d2.findings).toEqual(d1.findings);
    expect(d2.metrics).toEqual(d1.metrics);
    expect(d2.score.totalFindings).toBe(d1.score.totalFindings);
    expect([...d2.score.byCriterion].sort((a, b) => (a.criterion < b.criterion ? -1 : 1))).toEqual(
      [...d1.score.byCriterion].sort((a, b) => (a.criterion < b.criterion ? -1 : 1)),
    );
    expect(d2.score.byCriterion.map((c) => c.criterion)).toEqual(d1.score.byCriterion.map((c) => c.criterion).reverse());
  });
});

describe("determinismo — independência da ordem das entradas de dataset (longest-match-first do jargão)", () => {
  const sintetico = [
    { term: "em", kind: "word", domain: "legal", plain: "no", safeForSuggestion: true, reason: null },
    { term: "em sede de", kind: "phrase", domain: "legal", plain: "no âmbito de", safeForSuggestion: true, reason: null },
    { term: "em face de", kind: "phrase", domain: "legal", plain: "diante de", safeForSuggestion: true, reason: null },
  ] as const;

  function ordemPorPrimeiraPalavra(entries: readonly (typeof sintetico)[number][]) {
    const compiled = compileJargonEntries(entries as never);
    const lista = compiled.get("em")!;
    return lista.map((c) => c.words.length);
  }

  it("mesma primeira palavra → sempre da mais longa para a mais curta, qualquer que seja a ordem de entrada", () => {
    const direto = ordemPorPrimeiraPalavra(sintetico);
    const invertido = ordemPorPrimeiraPalavra([...sintetico].reverse());
    expect(direto).toEqual([3, 3, 1]);
    expect(invertido).toEqual(direto);
  });

  it("o conjunto de termos por primeira palavra independe da ordem de entrada", () => {
    const termos = (entries: readonly (typeof sintetico)[number][]) =>
      new Set(compileJargonEntries(entries as never).get("em")!.map((c) => c.words.join(" ")));
    expect(termos([...sintetico].reverse())).toEqual(termos(sintetico));
  });

  it("o dataset real produz o mesmo BY_FIRST_WORD com as entradas invertidas", () => {
    const entries = jargaoData.entries as never[];
    const chavesDireto = [...compileJargonEntries(entries).keys()].sort();
    const chavesInvertido = [...compileJargonEntries([...entries].reverse()).keys()].sort();
    expect(chavesInvertido).toEqual(chavesDireto);
  });
});

describe("determinismo — ausência de estado compartilhado (A, B, A)", () => {
  it("analyze(A); analyze(B); analyze(A) — o 1º e o 3º A são idênticos", () => {
    const A = TEXTO_RICO;
    const B = "É preciso realizar o pagamento da taxa. O prazo foi prorrogado pelo diretor.";
    const primeiroA = JSON.stringify(analyze(A));
    JSON.stringify(analyze(B));
    const terceiroA = JSON.stringify(analyze(A));
    expect(terceiroA).toBe(primeiroA);
  });

  it("chamadas repetidas não acumulam findings", () => {
    const antes = analyze(TEXTO_RICO).findings.length;
    for (let i = 0; i < 5; i++) analyze(TEXTO_RICO);
    expect(analyze(TEXTO_RICO).findings.length).toBe(antes);
  });

  it("analyze não muta o objeto de Config recebido", () => {
    const config: Config = { ...DEFAULT_CONFIG, nominalization: { ...DEFAULT_CONFIG.nominalization } };
    const copia = structuredClone(config);
    analyze(TEXTO_RICO, config);
    expect(config).toEqual(copia);
  });

  it("um mesmo objeto de Config reutilizado em várias chamadas produz resultados estáveis", () => {
    const config: Config = { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 8, errorAbove: 20 } };
    const r1 = JSON.stringify(analyze(TEXTO_RICO, config));
    JSON.stringify(analyze("outro texto qualquer aqui", config));
    const r2 = JSON.stringify(analyze(TEXTO_RICO, config));
    expect(r2).toBe(r1);
  });
});

describe("determinismo — variações de Config", () => {
  const variantes: Array<{ nome: string; config: Partial<Config> }> = [
    { nome: "padrão", config: {} },
    { nome: "long_sentence desligado (limiar altíssimo)", config: { sentenceLength: { warnAbove: 10_000, errorAbove: 20_000 } } },
    { nome: "passiva desligada", config: { passiveVoice: { enabled: false, treatEstarAsPassive: false } } },
    { nome: "nominalização desligada", config: { nominalization: { enabled: false, suggest: true } } },
    { nome: "jargão desligado", config: { jargon: { enabled: false, frequencyRankCutoff: 5000, suggestFromGlossary: true } } },
    { nome: "nominalização sem sugestão", config: { nominalization: { enabled: true, suggest: false } } },
    { nome: "jargão sem sugestão", config: { jargon: { enabled: true, frequencyRankCutoff: 5000, suggestFromGlossary: false } } },
    { nome: "override parcial de limiar", config: { sentenceLength: { warnAbove: 5, errorAbove: 12 } } },
  ];

  it.each(variantes)("$nome — determinístico e byte-idêntico entre execuções", ({ config }) => {
    const r1 = JSON.stringify(analyze(TEXTO_RICO, config));
    const r2 = JSON.stringify(analyze(TEXTO_RICO, config));
    expect(r2).toBe(r1);
  });

  it("cada pass desabilitado zera exatamente o seu critério, sem afetar os outros", () => {
    const base = analyze(TEXTO_RICO);
    const semJargao = analyze(TEXTO_RICO, { jargon: { enabled: false, frequencyRankCutoff: 5000, suggestFromGlossary: true } });

    expect(semJargao.findings.some((f) => f.criterion === "jargon")).toBe(false);
    
    for (const criterion of ["long_sentence", "passive_voice", "nominalization"] as const) {
      expect(semJargao.findings.filter((f) => f.criterion === criterion)).toEqual(
        base.findings.filter((f) => f.criterion === criterion),
      );
    }
  });
});
