import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  AssistedCaveat,
  AssistedCorpus,
  AssistedLabeler,
  AssistedMeasurement,
  AssistedStratum,
} from "../../src/report/eval/contract";

const REPO_ROOT = resolve(__dirname, "../..");

export interface AssistedSources {
  manifestPath: string;
  measurementPath: string;
}

export function defaultAssistedSources(version = process.env.LUCID_CORPUS_VERSION ?? "v1"): AssistedSources {
  return {
    manifestPath: resolve(REPO_ROOT, "corpus", version, "manifest.json"),
    measurementPath: resolve(REPO_ROOT, "corpus", version, "measurement.json"),
  };
}

interface RawMeasurement {
  corpusVersion: string;
  split: string;
  sealed: boolean;
  hashes: { documents: string; passages: string; labels: Record<string, string> };
  labelers: AssistedLabeler[];
  policy: { agreementFloor: number };
  criteria: {
    criterion: string;
    promoted: boolean;
    withheldReason: string | null;
    agreementFloor: number;
    agreement: AssistedMeasurement["agreement"];
    composition: AssistedMeasurement["composition"];
    consensusAudit: AssistedMeasurement["consensusAudit"];
    strata: { random: AssistedStratum; cued: AssistedStratum };
  }[];
  caveats: AssistedCaveat[];
}

interface RawManifest {
  counts: { documents: number; passages: number };
}

function publishableStratum(stratum: AssistedStratum, promoted: boolean, enriched: boolean): AssistedStratum {
  const rateSurvives = promoted;
  return {
    cases: stratum.cases,
    negatives: stratum.negatives,
    tp: stratum.tp,
    fp: stratum.fp,
    fn: stratum.fn,
    precision: rateSurvives ? stratum.precision : null,
    recall: rateSurvives && !enriched ? stratum.recall : null,
    precisionInterval: rateSurvives ? stratum.precisionInterval : null,
    recallInterval: rateSurvives && !enriched ? stratum.recallInterval : null,
  };
}

function publishableMeasurement(raw: RawMeasurement["criteria"][number]): AssistedMeasurement {
  return {
    criterion: raw.criterion,
    promoted: raw.promoted,
    withheldReason: raw.withheldReason,
    agreementFloor: raw.agreementFloor,
    agreement: raw.agreement,
    composition: raw.composition,
    consensusAudit: raw.consensusAudit,
    strata: {
      random: publishableStratum(raw.strata.random, raw.promoted, false),
      cued: publishableStratum(raw.strata.cued, raw.promoted, true),
    },
  };
}

export function buildAssistedCorpus(sources: AssistedSources = defaultAssistedSources()): AssistedCorpus | null {
  if (!existsSync(sources.measurementPath) || !existsSync(sources.manifestPath)) return null;

  const raw = JSON.parse(readFileSync(sources.measurementPath, "utf8")) as RawMeasurement;
  const manifest = JSON.parse(readFileSync(sources.manifestPath, "utf8")) as RawManifest;

  const criteria = raw.criteria.map(publishableMeasurement);

  return {
    corpusVersion: raw.corpusVersion,
    split: raw.split,
    sealed: raw.sealed,
    documents: manifest.counts.documents,
    passages: manifest.counts.passages,
    labelers: raw.labelers,
    hashes: raw.hashes,
    measuredAssisted: criteria.filter((c) => c.promoted).map((c) => c.criterion),
    withheld: criteria.filter((c) => !c.promoted).map((c) => c.criterion),
    criteria,
    caveats: raw.caveats,
  };
}
