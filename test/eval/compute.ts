/**
 * Cálculo da eval — FONTE ÚNICA.
 *
 * Os testes de eval assertam sobre o que este módulo devolve, e o artefato publicado é
 * a serialização do MESMO retorno. Não existe segunda implementação para a página
 * divergir do CI: se o número da página estiver errado, o teste quebra junto.
 *
 * Puro por construção: sem vitest, sem fs, sem `Date`, sem rede. Duas chamadas com o
 * mesmo código e o mesmo dado devolvem o mesmo objeto — a promessa de determinismo da
 * Camada 1 estendida à própria medição dela.
 */
import { DEFAULT_CONFIG, hashConfig } from "../../src/lucid/core/config";
import { stableHash } from "../../src/lucid/core/hash";
import { analyze, CRITERION_IDS, localePtBR } from "../../src/lucid";
import { createDataView, REGISTRY } from "../../src/locales/pt-BR/datasets/registry";
import type { DatasetId } from "../../src/locales/pt-BR/datasets/registry";
import { jargonPass } from "../../src/locales/pt-BR/passes/jargon";
import { nominalizationPass } from "../../src/locales/pt-BR/passes/nominalization";
import { passiveVoicePass } from "../../src/locales/pt-BR/passes/passive-voice";
import { countSyllables } from "../../src/locales/pt-BR/services/syllables";
import { coverageOf } from "../../src/app/lib/criteria";
import { buildDocument } from "../support/pt";
import { GOLDEN_JARGAO } from "./jargon-golden";
import { GOLDEN_NOMINALIZACAO } from "./nominalization-golden";
import { GOLDEN_VOZ_PASSIVA } from "./passive-voice-golden";
import { GOLDEN_SILABAS } from "./silabas-golden";
import { GOLDEN_INTEGRADO } from "../golden/integrated-golden";

export type EvalState = "correto" | "limitacao_conhecida";

const ctx = () => ({ doc: buildDocument(""), config: DEFAULT_CONFIG, data: createDataView([]) });
const runPass = (pass: { run: (c: ReturnType<typeof ctx>) => unknown[] }, texto: string): unknown[] =>
  pass.run({ doc: buildDocument(texto), config: DEFAULT_CONFIG, data: createDataView([]) });

const round = (v: number, places = 4): number => {
  const f = 10 ** places;
  return Math.round(v * f) / f;
};

/* ─────────────────────────── contagem: TP/FP/FN ─────────────────────────── */

export interface CountScore {
  tp: number;
  fp: number;
  fn: number;
}

/**
 * Convenção de pontuação POR CONTAGEM (não por span): o golden declara quantos findings
 * o trecho deve produzir, e o excedente conta como FP, o faltante como FN. É mais frouxa
 * que casar posição — um FP que caia exatamente onde havia um FN se anularia — e está
 * declarada no artefato como limitação do método, não escondida.
 */
export function scoreCounts(expectedCount: number, actualCount: number): CountScore {
  return {
    tp: Math.min(actualCount, expectedCount),
    fp: Math.max(0, actualCount - expectedCount),
    fn: Math.max(0, expectedCount - actualCount),
  };
}

export interface EntryResult extends CountScore {
  texto: string;
  expectedCount: number;
  actualCount: number;
  estado: EvalState;
  motivo?: string;
}

export interface CountSummary {
  cases: number;
  /** Casos em que o critério NÃO deve disparar — a oportunidade de falso positivo. */
  negatives: number;
  limitations: number;
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
}

export function summarize(results: readonly EntryResult[]): CountSummary {
  const tp = results.reduce((s, r) => s + r.tp, 0);
  const fp = results.reduce((s, r) => s + r.fp, 0);
  const fn = results.reduce((s, r) => s + r.fn, 0);
  return {
    cases: results.length,
    negatives: results.filter((r) => r.expectedCount === 0).length,
    limitations: results.filter((r) => r.estado === "limitacao_conhecida").length,
    tp,
    fp,
    fn,
    precision: round(tp + fp === 0 ? 1 : tp / (tp + fp)),
    recall: round(tp + fn === 0 ? 1 : tp / (tp + fn)),
  };
}

/* ─────────────────────────────── avaliadores ─────────────────────────────── */

export interface JargonEntryResult extends EntryResult {
  categoria: string;
  expectSuggestion: boolean | undefined;
  expectedSuggestion: string | undefined;
  actualSuggestion: string | undefined;
  mustNotFire: boolean;
  sugestaoCorreta: boolean;
  sugestaoInsegura: boolean;
  disparouSemCadastro: boolean;
}

export function evaluateJargon(): {
  criterion: "jargon";
  results: JargonEntryResult[];
  summary: CountSummary;
  suggestions: { expected: number; correct: number; unsafe: number; firedWithoutEntry: number };
} {
  const results = GOLDEN_JARGAO.map((entrada): JargonEntryResult => {
    const findings = runPass(jargonPass, entrada.texto) as { suggestion?: string }[];
    const actualCount = findings.length;
    const actualSuggestion = actualCount === 1 ? findings[0].suggestion : undefined;

    const esperaSugestao = entrada.expectedCount === 1 && entrada.expectSuggestion === true;
    const naoEsperaSugestao = entrada.expectedCount === 1 && entrada.expectSuggestion === false;
    const sugestaoCorreta = esperaSugestao && actualCount === 1 && actualSuggestion === entrada.expectedSuggestion;
    const sugestaoInsegura =
      (naoEsperaSugestao && actualCount === 1 && actualSuggestion !== undefined) ||
      (esperaSugestao &&
        actualCount === 1 &&
        actualSuggestion !== undefined &&
        actualSuggestion !== entrada.expectedSuggestion);

    return {
      texto: entrada.texto,
      expectedCount: entrada.expectedCount,
      actualCount,
      estado: entrada.estado,
      motivo: entrada.motivo,
      ...scoreCounts(entrada.expectedCount, actualCount),
      categoria: entrada.categoria,
      expectSuggestion: entrada.expectSuggestion,
      expectedSuggestion: entrada.expectedSuggestion,
      actualSuggestion,
      mustNotFire: entrada.mustNotFire === true,
      sugestaoCorreta,
      sugestaoInsegura,
      disparouSemCadastro: entrada.mustNotFire === true && actualCount > 0,
    };
  });

  return {
    criterion: "jargon",
    results,
    summary: summarize(results),
    suggestions: {
      expected: results.filter((r) => r.expectSuggestion === true).length,
      correct: results.filter((r) => r.sugestaoCorreta).length,
      unsafe: results.filter((r) => r.sugestaoInsegura).length,
      firedWithoutEntry: results.filter((r) => r.disparouSemCadastro).length,
    },
  };
}

export interface NominalizationEntryResult extends EntryResult {
  expectRequiresHuman: boolean | undefined;
  actualRequiresHuman: boolean | undefined;
  sugestaoEmitida: boolean;
  classificacaoErrada: boolean;
}

export function evaluateNominalization(): {
  criterion: "nominalization";
  results: NominalizationEntryResult[];
  summary: CountSummary;
  classification: { wrong: number; suggestionsEmitted: number };
} {
  const results = GOLDEN_NOMINALIZACAO.map((entrada): NominalizationEntryResult => {
    const findings = runPass(nominalizationPass, entrada.texto) as {
      requiresHuman: boolean;
      suggestion?: string;
    }[];
    const actualCount = findings.length;
    const actualRequiresHuman = actualCount === 1 ? findings[0].requiresHuman : undefined;

    return {
      texto: entrada.texto,
      expectedCount: entrada.expectedCount,
      actualCount,
      estado: entrada.estado,
      motivo: entrada.motivo,
      ...scoreCounts(entrada.expectedCount, actualCount),
      expectRequiresHuman: entrada.expectRequiresHuman,
      actualRequiresHuman,
      sugestaoEmitida: findings.some((f) => f.suggestion !== undefined),
      classificacaoErrada:
        entrada.expectedCount === 1 &&
        entrada.expectRequiresHuman !== undefined &&
        actualCount === 1 &&
        actualRequiresHuman !== entrada.expectRequiresHuman,
    };
  });

  return {
    criterion: "nominalization",
    results,
    summary: summarize(results),
    classification: {
      wrong: results.filter((r) => r.classificacaoErrada).length,
      suggestionsEmitted: results.filter((r) => r.sugestaoEmitida).length,
    },
  };
}

export function evaluatePassiveVoice(): {
  criterion: "passive_voice";
  results: EntryResult[];
  summary: CountSummary;
} {
  const results = GOLDEN_VOZ_PASSIVA.map((entrada): EntryResult => {
    const actualCount = runPass(passiveVoicePass, entrada.texto).length;
    return {
      texto: entrada.texto,
      expectedCount: entrada.expectedCount,
      actualCount,
      estado: entrada.estado,
      motivo: entrada.motivo,
      ...scoreCounts(entrada.expectedCount, actualCount),
    };
  });

  return { criterion: "passive_voice", results, summary: summarize(results) };
}

export interface SyllableEntryResult {
  palavra: string;
  real: number;
  atual: number;
  estado: EvalState;
  acertou: boolean;
  erroAbsoluto: number;
}

export function evaluateSyllables(): {
  service: "countSyllables";
  results: SyllableEntryResult[];
  summary: { words: number; limitations: number; exactRate: number; meanAbsoluteError: number };
} {
  const results = GOLDEN_SILABAS.map((entrada): SyllableEntryResult => {
    const atual = countSyllables(entrada.palavra);
    return {
      palavra: entrada.palavra,
      real: entrada.real,
      atual,
      estado: entrada.estado,
      acertou: atual === entrada.real,
      erroAbsoluto: Math.abs(atual - entrada.real),
    };
  });

  return {
    service: "countSyllables",
    results,
    summary: {
      words: results.length,
      limitations: results.filter((r) => r.estado === "limitacao_conhecida").length,
      exactRate: round(results.filter((r) => r.acertou).length / results.length),
      meanAbsoluteError: round(results.reduce((s, r) => s + r.erroAbsoluto, 0) / results.length),
    },
  };
}

/* ──────────────────── cobertura: o que NÃO está medido ──────────────────── */

/** Critérios com eval de precisão/recall — derivado dos avaliadores que existem. */
const EVALUATED_CRITERIA: readonly string[] = ["jargon", "nominalization", "passive_voice"];

export interface CriteriaCoverage {
  /** Precisão/recall medidos contra golden com casos negativos. */
  measured: readonly string[];
  /** Findings exatos rotulados no golden integrado, mas sem métrica agregada. */
  goldenLabelledOnly: readonly string[];
  /** Só teste unitário: escrito a partir da implementação, não mede recall. */
  unitTestsOnly: readonly string[];
}

/**
 * Derivada dos DADOS, nunca escrita à mão: critério novo sem eval aparece
 * automaticamente em `unitTestsOnly`. É o oposto de um teto silencioso.
 */
export function criteriaCoverage(): CriteriaCoverage {
  const inIntegrated = new Set<string>();
  for (const caso of GOLDEN_INTEGRADO) {
    for (const f of caso.expected.findings) inIntegrated.add(f.criterion);
  }

  const measured = CRITERION_IDS.filter((c) => EVALUATED_CRITERIA.includes(c));
  const goldenLabelledOnly = CRITERION_IDS.filter((c) => inIntegrated.has(c) && !EVALUATED_CRITERIA.includes(c));
  const unitTestsOnly = CRITERION_IDS.filter((c) => !inIntegrated.has(c) && !EVALUATED_CRITERIA.includes(c));

  return { measured, goldenLabelledOnly, unitTestsOnly };
}

/* ────────────────────────────── o artefato ────────────────────────────── */

export interface EvalStamp {
  lucidVersion: string;
  localeId: string;
  standardVersion: string;
  configHash: string;
  /** Hash sobre TODOS os datasets do registro — o estado completo de dado da rodada. */
  dataHash: string;
  /**
   * Hash sobre os GOLDENS. Sem ele a estampa é incompleta: a medição depende do corpus
   * tanto quanto do motor, e declarar uma limitação nova muda o recall publicado sem
   * mexer em config nem em dado. Dois artefatos com números diferentes e a mesma estampa
   * seriam indistinguíveis — foi exatamente o que aconteceu ao declarar A12a/A12d.
   */
  goldenHash: string;
}

/** Hash do corpus de avaliação — muda quando qualquer entrada de golden muda. */
export function hashGoldens(
  goldens: {
    jargon: readonly unknown[];
    nominalization: readonly unknown[];
    passiveVoice: readonly unknown[];
    syllables: readonly unknown[];
    integrated: readonly unknown[];
  } = {
    jargon: GOLDEN_JARGAO,
    nominalization: GOLDEN_NOMINALIZACAO,
    passiveVoice: GOLDEN_VOZ_PASSIVA,
    syllables: GOLDEN_SILABAS,
    integrated: GOLDEN_INTEGRADO,
  },
): string {
  return stableHash([
    ["jargon", goldens.jargon],
    ["nominalization", goldens.nominalization],
    ["passive_voice", goldens.passiveVoice],
    ["syllables", goldens.syllables],
    ["integrated", goldens.integrated],
  ]);
}

export function evalStamp(): EvalStamp {
  const probe = analyze("Texto de sondagem para a estampa.");
  const allDatasets = Object.keys(REGISTRY).sort() as DatasetId[];
  return {
    lucidVersion: probe.meta.lucidVersion,
    localeId: localePtBR.id,
    standardVersion: localePtBR.standardVersion,
    configHash: hashConfig(DEFAULT_CONFIG),
    dataHash: localePtBR.data.dataHashFor(allDatasets),
    goldenHash: hashGoldens(),
  };
}

/**
 * Caveats do método, como DADO — para a página não poder publicar o número sem eles.
 */
const METHOD_CAVEATS: readonly string[] = [
  "Pontuação por contagem de findings por trecho, não por posição do span: um falso positivo que caia onde havia um falso negativo se anula. É um piso, não uma medida de alinhamento de span.",
  "Recall de critério de cobertura 'curada' é CIRCULAR: os positivos do golden foram construídos a partir do mesmo léxico curado que o detector consulta, então o número mede 'o código lê a própria lista', não 'o instrumento acha o fenômeno na língua'. Recall honesto exige rotular documento real, cego ao léxico.",
  "Entradas 'limitacao_conhecida' contam CONTRA a métrica em vez de serem excluídas: a precisão publicada é a honesta, não a bonita.",
  "Critérios fora de 'measured' não têm precisão/recall. Teste unitário é escrito a partir da implementação e não mede recall sobre texto que ninguém antecipou — ausência de número não é ausência de defeito.",
  "Nenhum dado deste artefato vem da Camada 2 (sonda/LLM): é tudo determinístico e offline.",
];

export interface DetectorReport {
  criterion: string;
  coverage: string;
  summary: CountSummary;
  failures: readonly { texto: string; expectedCount: number; actualCount: number; estado: EvalState }[];
  knownLimitations: readonly { texto: string; motivo: string }[];
}

export interface EvalArtifact {
  stamp: EvalStamp;
  method: { scoring: "count-per-passage"; caveats: readonly string[] };
  detectors: readonly DetectorReport[];
  services: { syllables: ReturnType<typeof evaluateSyllables>["summary"] };
  criteriaCoverage: CriteriaCoverage & { total: number };
}

function detectorReport(criterion: string, results: readonly EntryResult[], summary: CountSummary): DetectorReport {
  return {
    criterion,
    coverage: coverageOf(criterion),
    summary,
    failures: results
      .filter((r) => r.fp > 0 || r.fn > 0)
      .map((r) => ({
        texto: r.texto,
        expectedCount: r.expectedCount,
        actualCount: r.actualCount,
        estado: r.estado,
      })),
    knownLimitations: results
      .filter((r) => r.estado === "limitacao_conhecida")
      .map((r) => ({ texto: r.texto, motivo: r.motivo ?? "" })),
  };
}

export function buildEvalArtifact(): EvalArtifact {
  const jargon = evaluateJargon();
  const nominalization = evaluateNominalization();
  const passive = evaluatePassiveVoice();
  const syllables = evaluateSyllables();
  const coverage = criteriaCoverage();

  return {
    stamp: evalStamp(),
    method: { scoring: "count-per-passage", caveats: METHOD_CAVEATS },
    detectors: [
      detectorReport(jargon.criterion, jargon.results, jargon.summary),
      detectorReport(nominalization.criterion, nominalization.results, nominalization.summary),
      detectorReport(passive.criterion, passive.results, passive.summary),
    ],
    services: { syllables: syllables.summary },
    criteriaCoverage: { ...coverage, total: CRITERION_IDS.length },
  };
}

/** Serialização estável — sem timestamp, para o artefato ser byte-idêntico como a engine. */
export function serializeEvalArtifact(artifact: EvalArtifact): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}
