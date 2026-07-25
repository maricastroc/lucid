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
import type { CriterionId } from "../../src/lucid";
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
  /**
   * `null` quando não há denominador (`tp + fp === 0`): o detector não teve oportunidade de
   * acertar nem de errar. Devolver `1` ali seria fabricar 100% — o mesmo erro do
   * `fleschPt: 0` corrigido no ADR-066, e no melhor ponto da escala.
   */
  precision: number | null;
  /** `null` quando `tp + fn === 0` (nenhum positivo esperado no corpus). */
  recall: number | null;
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
    precision: tp + fp === 0 ? null : round(tp / (tp + fp)),
    recall: tp + fn === 0 ? null : round(tp / (tp + fn)),
  };
}

/** Formata taxa para leitura humana sem esconder a ausência de medida. */
export function formatRate(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
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

export interface SyllableSummary {
  words: number;
  limitations: number;
  /** `null` sem palavra no corpus — dividir por zero devolveria `NaN`, que o JSON vira `null` em silêncio. */
  exactRate: number | null;
  meanAbsoluteError: number | null;
}

export function evaluateSyllables(): {
  service: "countSyllables";
  results: SyllableEntryResult[];
  summary: SyllableSummary;
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
      exactRate: results.length === 0 ? null : round(results.filter((r) => r.acertou).length / results.length),
      meanAbsoluteError:
        results.length === 0 ? null : round(results.reduce((s, r) => s + r.erroAbsoluto, 0) / results.length),
    },
  };
}

/* ────────────── registro de avaliadores: a única lista da verdade ────────────── */

/**
 * REGISTRO ÚNICO dos detectores com eval de precisão/recall.
 *
 * Antes havia duas listas para o mesmo fato (uma para a cobertura, outra para montar o
 * artefato) e a segunda podia esquecer o que a primeira dizia. Aqui, registrar o avaliador
 * é o mesmo ato que declará-lo medido: `criteriaCoverage` e `buildEvalArtifact` derivam
 * desta constante. O `criterion` é `CriterionId`, então um id inexistente não compila.
 */
export interface DetectorEvaluator {
  readonly criterion: CriterionId;
  readonly evaluate: () => { results: readonly EntryResult[]; summary: CountSummary };
}

export const DETECTOR_EVALUATORS: readonly DetectorEvaluator[] = [
  { criterion: "jargon", evaluate: evaluateJargon },
  { criterion: "nominalization", evaluate: evaluateNominalization },
  { criterion: "passive_voice", evaluate: evaluatePassiveVoice },
];

/* ──────────────────── cobertura: o que NÃO está medido ──────────────────── */

export interface CriteriaCoverage {
  /** Precisão/recall medidos contra golden com casos negativos. */
  measured: readonly string[];
  /** Findings exatos rotulados no golden integrado, mas sem métrica agregada. */
  goldenLabelledOnly: readonly string[];
  /** Só teste unitário: escrito a partir da implementação, não mede recall. */
  unitTestsOnly: readonly string[];
}

export interface CoverageInputs {
  /** Universo de critérios da engine. */
  criterionIds: readonly string[];
  /** Critérios com avaliador registrado. */
  evaluated: readonly string[];
  /** Critérios com finding rotulado no golden integrado. */
  labelled: readonly string[];
}

function defaultCoverageInputs(): CoverageInputs {
  const labelled = new Set<string>();
  for (const caso of GOLDEN_INTEGRADO) {
    for (const f of caso.expected.findings) labelled.add(f.criterion);
  }
  return {
    criterionIds: CRITERION_IDS,
    evaluated: DETECTOR_EVALUATORS.map((e) => e.criterion),
    labelled: [...labelled],
  };
}

/**
 * Derivada das entradas, nunca escrita à mão: critério sem avaliador registrado e sem
 * rótulo no golden cai em `unitTestsOnly` por construção. É o oposto de um teto silencioso.
 *
 * As entradas são injetáveis para o teste poder provar a DERIVAÇÃO com um universo
 * sintético, em vez de comparar a saída com uma lista escrita à mão (que não provaria nada).
 */
export function criteriaCoverage(inputs: CoverageInputs = defaultCoverageInputs()): CriteriaCoverage {
  const evaluated = new Set(inputs.evaluated);
  const labelled = new Set(inputs.labelled);

  return {
    measured: inputs.criterionIds.filter((c) => evaluated.has(c)),
    goldenLabelledOnly: inputs.criterionIds.filter((c) => labelled.has(c) && !evaluated.has(c)),
    unitTestsOnly: inputs.criterionIds.filter((c) => !labelled.has(c) && !evaluated.has(c)),
  };
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
 * Caveats do método, como DADO IDENTIFICADO — para a página poder endereçar cada um
 * (destacar, linkar, ordenar) e para o teste pinar o `id` em vez da redação.
 *
 * `Record<CaveatId, string>` + ordem explícita: caveat novo não compila sem texto, na
 * disciplina do ADR-037 (fim do fallback silencioso). Antes eram strings livres e o teste
 * assertava substring da prosa — reescrever a frase quebrava o teste sem mudar semântica.
 */
export type CaveatId =
  | "count_scoring"
  | "circular_recall_curated"
  | "known_limitations_counted"
  | "unmeasured_criteria"
  | "no_layer_2";

const CAVEAT_ORDER: readonly CaveatId[] = [
  "count_scoring",
  "circular_recall_curated",
  "known_limitations_counted",
  "unmeasured_criteria",
  "no_layer_2",
];

const CAVEAT_TEXT: Record<CaveatId, string> = {
  count_scoring:
    "Pontuação por contagem de findings por trecho, não por posição do span: um falso positivo que caia onde havia um falso negativo se anula. É um piso, não uma medida de alinhamento de span.",
  circular_recall_curated:
    "Recall de critério de cobertura 'curada' é CIRCULAR: os positivos do golden foram construídos a partir do mesmo léxico curado que o detector consulta, então o número mede 'o código lê a própria lista', não 'o instrumento acha o fenômeno na língua'. Recall honesto exige rotular documento real, cego ao léxico.",
  known_limitations_counted:
    "Entradas 'limitacao_conhecida' contam CONTRA a métrica em vez de serem excluídas: a precisão publicada é a honesta, não a bonita.",
  unmeasured_criteria:
    "Critérios fora de 'measured' não têm precisão/recall. Teste unitário é escrito a partir da implementação e não mede recall sobre texto que ninguém antecipou — ausência de número não é ausência de defeito.",
  no_layer_2: "Nenhum dado deste artefato vem da Camada 2 (sonda/LLM): é tudo determinístico e offline.",
};

export interface MethodCaveat {
  id: CaveatId;
  text: string;
}

const METHOD_CAVEATS: readonly MethodCaveat[] = CAVEAT_ORDER.map((id) => ({ id, text: CAVEAT_TEXT[id] }));

export interface DetectorReport {
  criterion: string;
  coverage: string;
  summary: CountSummary;
  failures: readonly { texto: string; expectedCount: number; actualCount: number; estado: EvalState }[];
  knownLimitations: readonly { texto: string; motivo: string }[];
}

/**
 * Versão do ESQUEMA do artefato (não do motor — esse é `stamp.lucidVersion`).
 *
 * Existe porque o artefato é consumido de fora (a página de benchmark): mudar a forma sem
 * sinalizar quebraria o consumidor em silêncio. Incrementar em qualquer mudança
 * incompatível de forma.
 */
export const EVAL_SCHEMA_VERSION = 1;

export interface EvalArtifact {
  schemaVersion: number;
  stamp: EvalStamp;
  method: { scoring: "count-per-passage"; caveats: readonly MethodCaveat[] };
  detectors: readonly DetectorReport[];
  services: { syllables: SyllableSummary };
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
  return {
    schemaVersion: EVAL_SCHEMA_VERSION,
    stamp: evalStamp(),
    method: { scoring: "count-per-passage", caveats: METHOD_CAVEATS },
    // Deriva do registro: registrar o avaliador é o mesmo ato que publicá-lo.
    detectors: DETECTOR_EVALUATORS.map(({ criterion, evaluate }) => {
      const { results, summary } = evaluate();
      return detectorReport(criterion, results, summary);
    }),
    services: { syllables: evaluateSyllables().summary },
    criteriaCoverage: { ...criteriaCoverage(), total: CRITERION_IDS.length },
  };
}

/** Serialização estável — sem timestamp, para o artefato ser byte-idêntico como a engine. */
export function serializeEvalArtifact(artifact: EvalArtifact): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}
