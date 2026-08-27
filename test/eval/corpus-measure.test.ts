import { existsSync, appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "@/lucid/core/config";
import { createDataView } from "@/locales/pt-BR/datasets/registry";
import type { DatasetId } from "@/locales/pt-BR/datasets/registry";
import { siglaSemExpansaoPass } from "@/locales/pt-BR/passes/sigla-sem-expansao";
import { proseEnumerationPass } from "@/locales/pt-BR/passes/prose-enumeration";
import { perifraseInfladaPass } from "@/locales/pt-BR/passes/perifrase-inflada";
import type { Pass, PassFinding } from "@/lucid/core/types";

import { buildDocument } from "../support/pt";
import { scoreCounts } from "./compute";
import { agreementStats, wilsonInterval } from "../../scripts/corpus/lib/agreement";
import type { AgreementStats } from "../../scripts/corpus/lib/agreement";
import { paths } from "../../scripts/corpus/lib/paths";
import type {
  ConsolidatedLabel,
  CorpusManifest,
  CorpusPassage,
  CriterionId,
  LabelerRun,
} from "../../scripts/corpus/lib/types";

const PASSES: Record<CriterionId, Pass> = {
  sigla_sem_expansao: siglaSemExpansaoPass,
  prose_enumeration: proseEnumerationPass,
  perifrase_inflada: perifraseInfladaPass,
};

function readJsonlFile<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
}

function dataDepsOf(pass: Pass): DatasetId[] {
  return [...(pass.dataDeps ?? [])] as DatasetId[];
}

function runPass(pass: Pass, text: string): PassFinding[] {
  return pass.run({
    doc: buildDocument(text),
    config: DEFAULT_CONFIG,
    data: createDataView(dataDepsOf(pass)),
  });
}

interface StratumScore {
  cases: number;
  negatives: number;
  tp: number;
  fp: number;
  fn: number;
  precision: number | null;
  recall: number | null;
  precisionInterval: { low: number; high: number } | null;
  recallInterval: { low: number; high: number } | null;
}

function scoreStratum(
  rows: readonly { text: string; expected: number }[],
  pass: Pass,
  allowRecall: boolean,
): StratumScore {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (const row of rows) {
    const actual = runPass(pass, row.text).length;
    const score = scoreCounts(row.expected, actual);
    tp += score.tp;
    fp += score.fp;
    fn += score.fn;
  }
  return {
    cases: rows.length,
    negatives: rows.filter((row) => row.expected === 0).length,
    tp,
    fp,
    fn,
    precision: tp + fp === 0 ? null : round(tp / (tp + fp)),
    recall: !allowRecall || tp + fn === 0 ? null : round(tp / (tp + fn)),
    precisionInterval: tp + fp === 0 ? null : wilsonInterval(tp, tp + fp),
    recallInterval: !allowRecall || tp + fn === 0 ? null : wilsonInterval(tp, tp + fn),
  };
}

function round(value: number, places = 4): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

interface ConsensusAudit {
  n: number;
  disagreements: number;
  errorRate: number | null;
  interval: { low: number; high: number } | null;
}

function auditConsensus(
  labels: readonly ConsolidatedLabel[],
  runsById: Map<string, LabelerRun[]>,
): ConsensusAudit {
  const audited = labels.filter((label) => label.route === "human_audit_sample" && label.tier === "human");
  let disagreements = 0;
  for (const label of audited) {
    const runs = runsById.get(label.passageId) ?? [];
    if (runs.length === 0) continue;
    if (runs[0].count !== label.count) disagreements += 1;
  }
  const n = audited.length;
  return {
    n,
    disagreements,
    errorRate: n === 0 ? null : round(disagreements / n),
    interval: wilsonInterval(disagreements, n),
  };
}

interface CriterionMeasurement {
  criterion: CriterionId;
  split: string;
  composition: { human: number; consensus: number; modelOnly: number };
  agreement: AgreementStats;
  agreementFloor: number;
  promoted: boolean;
  withheldReason: string | null;
  strata: { random: StratumScore; cued: StratumScore };
  consensusAudit: ConsensusAudit;
}

const manifestPath = paths.manifest();
const hasCorpus = existsSync(manifestPath) && existsSync(paths.passages());

describe("corpus assistido — medição", () => {
  if (!hasCorpus) {
    it("sem corpus construído ainda", () => {
      expect(hasCorpus).toBe(false);
    });
    return;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as CorpusManifest;
  const passages = new Map(readJsonlFile<CorpusPassage>(paths.passages()).map((p) => [p.passageId, p]));
  const split = process.env.LUCID_SEALED_EVAL === "1" ? "test" : "dev";

  const stubbed = manifest.labelers.some((labeler) => labeler.id.startsWith("stub"));
  const measurements: CriterionMeasurement[] = [];

  for (const criterion of manifest.criteria) {
    const criterionId = criterion as CriterionId;
    const pass = PASSES[criterionId];
    if (pass === undefined) continue;

    const labels = readJsonlFile<ConsolidatedLabel>(paths.labels(criterionId)).filter(
      (label) => passages.get(label.passageId)?.split === split,
    );

    const runsById = new Map<string, LabelerRun[]>();
    for (const labeler of new Set(manifest.labelers.map((entry) => entry.id))) {
      for (const run of readJsonlFile<LabelerRun>(paths.runs(criterionId, labeler))) {
        runsById.set(run.passageId, [...(runsById.get(run.passageId) ?? []), run]);
      }
    }

    const rows = labels
      .map((label) => ({ label, passage: passages.get(label.passageId) }))
      .filter((entry): entry is { label: ConsolidatedLabel; passage: CorpusPassage } => entry.passage !== undefined);

    const randomRows = rows
      .filter((entry) => entry.passage.strata.random)
      .map((entry) => ({ text: entry.passage.text, expected: entry.label.count }));
    const cuedRows = rows
      .filter((entry) => !entry.passage.strata.random && entry.passage.strata.cued.includes(criterionId))
      .map((entry) => ({ text: entry.passage.text, expected: entry.label.count }));

    const pairs = [...runsById.entries()]
      .filter(([passageId]) => passages.get(passageId)?.split === split)
      .map(([, runs]) => runs)
      .filter((runs) => runs.length >= 2 && runs.every((run) => run.ok))
      .map((runs) => ({ a: runs[0].count > 0, b: runs[1].count > 0 }));

    const stats = agreementStats(pairs);
    const floor = manifest.policy.agreementFloor;
    const belowFloor = stats.gwetAc1 === null || stats.gwetAc1 < floor;
    const audit = auditConsensus(labels, runsById);
    const consensusCount = labels.filter((label) => label.tier === "consensus").length;

    const auditMissing = consensusCount > 0 && audit.n === 0;

    measurements.push({
      criterion: criterionId,
      split,
      composition: {
        human: labels.filter((label) => label.tier === "human").length,
        consensus: labels.filter((label) => label.tier === "consensus").length,
        modelOnly: labels.filter((label) => label.tier === "model_only").length,
      },
      agreement: stats,
      agreementFloor: floor,
      promoted: !belowFloor && !stubbed && !auditMissing && randomRows.length > 0,
      withheldReason: stubbed
        ? "corpus rotulado pelo provedor de demonstração"
        : belowFloor
          ? `AC1 abaixo do piso de ${floor}`
          : auditMissing
            ? "amostra de auditoria do consenso ainda não revisada por pessoa"
            : randomRows.length === 0
              ? "estrato aleatório vazio"
              : null,
      strata: {
        random: scoreStratum(randomRows, pass, true),
        cued: scoreStratum(cuedRows, pass, false),
      },
      consensusAudit: audit,
    });
  }

  it("recusa publicar métrica de corpus rotulado pelo provedor de demonstração", () => {
    if (stubbed) expect(measurements.every((measurement) => !measurement.promoted)).toBe(true);
    else expect(stubbed).toBe(false);
  });

  it("nunca publica recall no estrato enriquecido", () => {
    for (const measurement of measurements) {
      expect(measurement.strata.cued.recall).toBeNull();
    }
  });

  it("nenhum rótulo humano é contado como consenso", () => {
    for (const criterion of manifest.criteria) {
      const labels = readJsonlFile<ConsolidatedLabel>(paths.labels(criterion as CriterionId));
      for (const label of labels) {
        if (label.reviewedBy !== null) expect(label.tier).toBe("human");
        if (label.tier === "consensus") expect(label.reviewedBy).toBeNull();
      }
    }
  });

  it("não promove critério cujo consenso ninguém auditou", () => {
    for (const measurement of measurements) {
      if (measurement.composition.consensus > 0 && measurement.consensusAudit.n === 0) {
        expect(measurement.promoted).toBe(false);
      }
    }
  });

  it("toda métrica publicada vem com intervalo", () => {
    for (const measurement of measurements) {
      if (measurement.strata.random.precision !== null) {
        expect(measurement.strata.random.precisionInterval).not.toBeNull();
      }
      if (measurement.strata.random.recall !== null) {
        expect(measurement.strata.random.recallInterval).not.toBeNull();
      }
    }
  });

  it("critério abaixo do piso de concordância não é promovido", () => {
    for (const measurement of measurements) {
      if (measurement.agreement.gwetAc1 !== null && measurement.agreement.gwetAc1 < measurement.agreementFloor) {
        expect(measurement.promoted).toBe(false);
        expect(measurement.withheldReason).not.toBeNull();
      }
    }
  });

  it("emite measurement.json", () => {
    const artifact = {
      corpusVersion: manifest.corpusVersion,
      schemaVersion: manifest.schemaVersion,
      split,
      sealed: split === "test",
      hashes: manifest.hashes,
      labelers: manifest.labelers,
      policy: manifest.policy,
      criteria: measurements,
      caveats: [
        {
          id: "assisted_labelling",
          text:
            "Os rótulos deste corpus não são verdade fundamental. Foram propostos por dois modelos " +
            "independentes; divergência, baixa confiança e uma amostra aleatória dos consensuais foram " +
            "decididas por pessoa. O restante é consenso de modelo, não conferido, e está marcado como tal " +
            "em `tier`. Um consenso pode errar de forma correlacionada — dois modelos podem partilhar o " +
            "mesmo ponto cego, e a amostra de auditoria estima esse erro, não o elimina.",
        },
        {
          id: "cued_stratum_no_recall",
          text:
            "O estrato enriquecido entrou por cue de superfície. Precisão ali é legítima; recall não é, " +
            "porque mediria a cue e não a língua. Recall é publicado apenas no estrato aleatório.",
        },
        {
          id: "count_scoring",
          text:
            "Pontuação por contagem de findings por trecho, não por posição do span — o mesmo corte do " +
            "golden autoral. Um falso positivo que caia onde havia um falso negativo se anula.",
        },
      ],
    };

    const path = paths.measurement();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

    if (split === "test") {
      appendFileSync(
        paths.testRuns(),
        `${JSON.stringify({ at: new Date().toISOString(), corpusVersion: manifest.corpusVersion, criteria: manifest.criteria })}\n`,
      );
    }

    expect(existsSync(path)).toBe(true);
  });
});
