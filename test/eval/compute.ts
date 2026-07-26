/**
 * Eval computation — SINGLE SOURCE.
 *
 * The eval tests assert over what this module returns, and the published artifact is the
 * serialization of that SAME return value. There is no second implementation for the page
 * to diverge from CI: if the number on the page is wrong, the test breaks along with it.
 *
 * Pure by construction: no vitest, no fs, no `Date`, no network. Two calls with the same
 * code and the same data return the same object — Layer 1's determinism promise extended
 * to its own measurement.
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
import { EVAL_SCHEMA_VERSION } from "../../src/report/eval/contract";
import type {
  CountSummary,
  CriteriaCoverage,
  DetectorReport,
  EvalArtifact,
  EvalStamp,
  EvalState,
  MethodCaveat,
  CaveatId,
  Regression,
  SyllableSummary,
} from "../../src/report/eval/contract";
import { buildDocument } from "../support/pt";
import { GOLDEN_JARGAO } from "./jargon-golden";
import { GOLDEN_NOMINALIZACAO } from "./nominalization-golden";
import { GOLDEN_VOZ_PASSIVA } from "./passive-voice-golden";
import { GOLDEN_SILABAS } from "./silabas-golden";
import { GOLDEN_INTEGRADO } from "../golden/integrated-golden";

const ctx = () => ({ doc: buildDocument(""), config: DEFAULT_CONFIG, data: createDataView([]) });
const runPass = (pass: { run: (c: ReturnType<typeof ctx>) => unknown[] }, text: string): unknown[] =>
  pass.run({ doc: buildDocument(text), config: DEFAULT_CONFIG, data: createDataView([]) });

const round = (v: number, places = 4): number => {
  const f = 10 ** places;
  return Math.round(v * f) / f;
};

/* ─────────────────────────── counting: TP/FP/FN ─────────────────────────── */

export interface CountScore {
  tp: number;
  fp: number;
  fn: number;
}

/**
 * Scoring convention BY COUNT (not by span): the golden set declares how many findings the
 * excerpt must produce; the surplus counts as FP and the shortfall as FN. It is looser than
 * matching positions — an FP landing exactly where an FN was would cancel out — and it is
 * declared in the artifact as a limitation of the method, not hidden.
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

/** Formats a rate for human reading without hiding the absence of a measurement. */
export function formatRate(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

/* ─────────────────────────────── evaluators ─────────────────────────────── */

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
  const results = GOLDEN_JARGAO.map((entry): JargonEntryResult => {
    const findings = runPass(jargonPass, entry.texto) as { suggestion?: string }[];
    const actualCount = findings.length;
    const actualSuggestion = actualCount === 1 ? findings[0].suggestion : undefined;

    const expectsSuggestion = entry.expectedCount === 1 && entry.expectSuggestion === true;
    const expectsNoSuggestion = entry.expectedCount === 1 && entry.expectSuggestion === false;
    const sugestaoCorreta = expectsSuggestion && actualCount === 1 && actualSuggestion === entry.expectedSuggestion;
    const sugestaoInsegura =
      (expectsNoSuggestion && actualCount === 1 && actualSuggestion !== undefined) ||
      (expectsSuggestion &&
        actualCount === 1 &&
        actualSuggestion !== undefined &&
        actualSuggestion !== entry.expectedSuggestion);

    return {
      texto: entry.texto,
      expectedCount: entry.expectedCount,
      actualCount,
      estado: entry.estado,
      motivo: entry.motivo,
      ...scoreCounts(entry.expectedCount, actualCount),
      categoria: entry.categoria,
      expectSuggestion: entry.expectSuggestion,
      expectedSuggestion: entry.expectedSuggestion,
      actualSuggestion,
      mustNotFire: entry.mustNotFire === true,
      sugestaoCorreta,
      sugestaoInsegura,
      disparouSemCadastro: entry.mustNotFire === true && actualCount > 0,
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
  const results = GOLDEN_NOMINALIZACAO.map((entry): NominalizationEntryResult => {
    const findings = runPass(nominalizationPass, entry.texto) as {
      requiresHuman: boolean;
      suggestion?: string;
    }[];
    const actualCount = findings.length;
    const actualRequiresHuman = actualCount === 1 ? findings[0].requiresHuman : undefined;

    return {
      texto: entry.texto,
      expectedCount: entry.expectedCount,
      actualCount,
      estado: entry.estado,
      motivo: entry.motivo,
      ...scoreCounts(entry.expectedCount, actualCount),
      expectRequiresHuman: entry.expectRequiresHuman,
      actualRequiresHuman,
      sugestaoEmitida: findings.some((f) => f.suggestion !== undefined),
      classificacaoErrada:
        entry.expectedCount === 1 &&
        entry.expectRequiresHuman !== undefined &&
        actualCount === 1 &&
        actualRequiresHuman !== entry.expectRequiresHuman,
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
  const results = GOLDEN_VOZ_PASSIVA.map((entry): EntryResult => {
    const actualCount = runPass(passiveVoicePass, entry.texto).length;
    return {
      texto: entry.texto,
      expectedCount: entry.expectedCount,
      actualCount,
      estado: entry.estado,
      motivo: entry.motivo,
      ...scoreCounts(entry.expectedCount, actualCount),
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
  summary: SyllableSummary;
} {
  const results = GOLDEN_SILABAS.map((entry): SyllableEntryResult => {
    const atual = countSyllables(entry.palavra);
    return {
      palavra: entry.palavra,
      real: entry.real,
      atual,
      estado: entry.estado,
      acertou: atual === entry.real,
      erroAbsoluto: Math.abs(atual - entry.real),
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

/* ────────────── evaluator registry: the single list of record ────────────── */

/**
 * SINGLE REGISTRY of the detectors that have a precision/recall eval.
 *
 * There used to be two lists for the same fact (one for coverage, another to assemble the
 * artifact) and the second could forget what the first said. Here, registering the evaluator
 * is the same act as declaring it measured: `criteriaCoverage` and `buildEvalArtifact` both
 * derive from this constant. `criterion` is a `CriterionId`, so a nonexistent id fails to compile.
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

/* ──────────────────── coverage: what is NOT measured ──────────────────── */

export interface CoverageInputs {
  /** The engine's universe of criteria. */
  criterionIds: readonly string[];
  /** Criteria with a registered evaluator. */
  evaluated: readonly string[];
  /** Criteria with a labelled finding in the integrated golden set. */
  labelled: readonly string[];
}

function defaultCoverageInputs(): CoverageInputs {
  const labelled = new Set<string>();
  for (const testCase of GOLDEN_INTEGRADO) {
    for (const f of testCase.expected.findings) labelled.add(f.criterion);
  }
  return {
    criterionIds: CRITERION_IDS,
    evaluated: DETECTOR_EVALUATORS.map((e) => e.criterion),
    labelled: [...labelled],
  };
}

/**
 * Derived from the inputs, never hand-written: a criterion with no registered evaluator and
 * no golden label lands in `unitTestsOnly` by construction. The opposite of a silent ceiling.
 *
 * The inputs are injectable so the test can prove the DERIVATION with a synthetic universe
 * instead of comparing the output against a hand-written list (which would prove nothing).
 */
export function criteriaCoverage(inputs: CoverageInputs = defaultCoverageInputs()): Omit<CriteriaCoverage, "total"> {
  const evaluated = new Set(inputs.evaluated);
  const labelled = new Set(inputs.labelled);

  return {
    measured: inputs.criterionIds.filter((c) => evaluated.has(c)),
    goldenLabelledOnly: inputs.criterionIds.filter((c) => labelled.has(c) && !evaluated.has(c)),
    unitTestsOnly: inputs.criterionIds.filter((c) => !labelled.has(c) && !evaluated.has(c)),
  };
}

/* ────────────────────────────── the artifact ────────────────────────────── */

/** Hash of the evaluation corpus — changes whenever any golden entry changes. */
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
 * Method caveats as IDENTIFIED DATA — so the page can address each one (highlight, link,
 * order) and so the test can pin the `id` instead of the wording.
 *
 * `Record<CaveatId, string>` + an explicit order: a new caveat does not compile without its
 * text, following the discipline of ADR-037 (the end of the silent fallback). They used to be
 * free strings and the test asserted a substring of the prose — rewording the sentence broke
 * the test without changing any semantics.
 */
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

const METHOD_CAVEATS: readonly MethodCaveat[] = CAVEAT_ORDER.map((id) => ({ id, text: CAVEAT_TEXT[id] }));

/**
 * A failure is either a DECLARED LIMITATION (it has a reason written by the curator) or a
 * REGRESSION (a `correto` entry that failed, with no reason because nobody wrote one). The
 * two used to live in a single list, distinguished by `estado` — and any consumer would have
 * had to infer the difference. Now the distinction belongs to the contract: `regressions` is
 * empty on a green build.
 */
function detectorReport(criterion: string, results: readonly EntryResult[], summary: CountSummary): DetectorReport {
  const failed = (r: EntryResult): boolean => r.fp > 0 || r.fn > 0;
  return {
    criterion,
    coverage: coverageOf(criterion),
    summary,
    knownLimitations: results
      .filter((r) => r.estado === "limitacao_conhecida")
      .map((r) => ({ texto: r.texto, motivo: r.motivo ?? "" })),
    regressions: results.filter((r) => failed(r) && r.estado === "correto").map(toRegression),
  };
}

const toRegression = (r: EntryResult): Regression => ({
  texto: r.texto,
  expectedCount: r.expectedCount,
  actualCount: r.actualCount,
});

/**
 * CANONICAL ORDER of the criteria: the one in `CRITERION_IDS` (the engine's declaration).
 *
 * It holds for `detectors` and for the three lists in `criteriaCoverage`, so the page's table
 * and its coverage cards never disagree about the order of the same criteria. `detectors` used
 * to come out in the evaluator-registry order while `measured` followed the engine's.
 */
function canonicalRank(criterion: string): number {
  const i = (CRITERION_IDS as readonly string[]).indexOf(criterion);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

export function buildEvalArtifact(): EvalArtifact {
  const detectors = [...DETECTOR_EVALUATORS]
    .sort((a, b) => canonicalRank(a.criterion) - canonicalRank(b.criterion))
    .map(({ criterion, evaluate }) => {
      const { results, summary } = evaluate();
      return detectorReport(criterion, results, summary);
    });

  return {
    schemaVersion: EVAL_SCHEMA_VERSION,
    stamp: evalStamp(),
    method: { scoring: "count-per-passage", caveats: METHOD_CAVEATS },
    detectors,
    services: { syllables: evaluateSyllables().summary },
    criteriaCoverage: { ...criteriaCoverage(), total: CRITERION_IDS.length },
  };
}

/** Stable serialization — no timestamp, so the artifact is byte-identical like the engine. */
export function serializeEvalArtifact(artifact: EvalArtifact): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}
