/**
 * CONTRATO do artefato de avaliação (`eval/report.json`) — tipos e nada mais.
 *
 * Mora em `src/` porque é consumido de dois lados: o tooling que PRODUZ o artefato
 * (`test/eval/compute.ts`) e a página que o APRESENTA (`src/app/avaliacao`). Antes o
 * contrato vivia junto do cálculo, o que obrigava a página a importar tipo de `test/` —
 * dependência invertida (produção ← teste). Aqui a direção é a natural: os dois lados
 * dependem do contrato, e o contrato não depende de nenhum deles.
 *
 * Zero runtime além da constante de versão: nenhum dado de golden, nenhum pass, nada
 * que possa entrar no bundle da página.
 */

/**
 * Versão da FORMA deste arquivo (≠ `EvalStamp.lucidVersion`, que é o motor).
 *
 * Incrementar em qualquer mudança incompatível de forma. A página compara com o que
 * está em disco e mostra estado de incompatibilidade em vez de renderizar parcialmente.
 *
 * - `1` — forma inicial (ADR-067/069).
 * - `2` — `DetectorReport.failures` (lista única, com `estado`) foi substituída por
 *   `regressions` (falhas NÃO declaradas); limitações declaradas seguem em
 *   `knownLimitations`, com motivo. Ver ADR-070.
 */
export const EVAL_SCHEMA_VERSION = 2;

/** Como o critério alcança o fenômeno. União FECHADA: rótulo ausente não compila. */
export type CriterionCoverage = "curated" | "productive";

/** Classificação de uma entrada de golden. */
export type EvalState = "correto" | "limitacao_conhecida";

export interface EvalStamp {
  lucidVersion: string;
  localeId: string;
  standardVersion: string;
  configHash: string;
  /** Hash sobre TODOS os datasets do registro. */
  dataHash: string;
  /** Hash sobre os goldens — a medição depende do corpus tanto quanto do motor. */
  goldenHash: string;
}

export interface CountSummary {
  cases: number;
  /** Casos em que o critério NÃO deve disparar — a oportunidade de falso positivo. */
  negatives: number;
  limitations: number;
  tp: number;
  fp: number;
  fn: number;
  /** `null` quando não há denominador. NUNCA `1` — ver ADR-066/069. */
  precision: number | null;
  recall: number | null;
}

export interface SyllableSummary {
  words: number;
  limitations: number;
  exactRate: number | null;
  meanAbsoluteError: number | null;
}

/** Limitação DECLARADA: falha conhecida, com o motivo escrito à mão na curadoria. */
export interface KnownLimitation {
  texto: string;
  motivo: string;
}

/**
 * Falha NÃO declarada: entrada marcada `correto` que falhou.
 *
 * Em build verde este array é vazio — o eval assere que nenhuma entrada `correto` falha.
 * Existe no contrato justamente para o caso impossível ficar VISÍVEL em vez de se
 * disfarçar de limitação: não há motivo aqui, porque ninguém escreveu um, e a página
 * não deve inventar nenhum.
 */
export interface Regression {
  texto: string;
  expectedCount: number;
  actualCount: number;
}

export interface DetectorReport {
  criterion: string;
  coverage: CriterionCoverage;
  summary: CountSummary;
  knownLimitations: readonly KnownLimitation[];
  regressions: readonly Regression[];
}

export type CaveatId =
  | "count_scoring"
  | "circular_recall_curated"
  | "known_limitations_counted"
  | "unmeasured_criteria"
  | "no_layer_2";

export interface MethodCaveat {
  id: CaveatId;
  text: string;
}

export interface CriteriaCoverage {
  /** Precisão/recall medidos contra golden com casos negativos. */
  measured: readonly string[];
  /** Findings exatos rotulados no golden integrado, sem métrica agregada. */
  goldenLabelledOnly: readonly string[];
  /** Só teste unitário: escrito a partir da implementação, não mede recall. */
  unitTestsOnly: readonly string[];
  total: number;
}

export interface EvalArtifact {
  schemaVersion: number;
  stamp: EvalStamp;
  method: { scoring: "count-per-passage"; caveats: readonly MethodCaveat[] };
  detectors: readonly DetectorReport[];
  services: { syllables: SyllableSummary };
  criteriaCoverage: CriteriaCoverage;
}
