import { existsSync } from "node:fs";
import { hashRows, readJson, readJsonl, writeJson } from "./jsonl";
import { paths, DEFAULT_VERSION } from "./paths";
import { CRITERIA } from "./criteria";
import { CORPUS_SCHEMA_VERSION } from "./types";
import type { ConsolidatedLabel, CorpusManifest, CriterionId } from "./types";

export const DEFAULT_POLICY = {
  consensusAuditRate: 0.05,
  lowConfidenceRoutes: true,
  agreementFloor: 0.7,
};

export function emptyManifest(version = DEFAULT_VERSION): CorpusManifest {
  return {
    corpusVersion: version,
    schemaVersion: CORPUS_SCHEMA_VERSION,
    createdAt: new Date().toISOString().slice(0, 10),
    supersedes: null,
    sealed: false,
    splitSeed: `lucid-corpus-${version}`,
    testFraction: 0.3,
    criteria: CRITERIA.map((criterion) => criterion.id),
    counts: { documents: 0, passages: 0, labelled: 0, humanReviewed: 0 },
    hashes: { documents: "", passages: "", labels: {} },
    labelers: [],
    policy: { ...DEFAULT_POLICY },
  };
}

export function loadManifest(version = DEFAULT_VERSION): CorpusManifest {
  const path = paths.manifest(version);
  return existsSync(path) ? readJson<CorpusManifest>(path) : emptyManifest(version);
}

export function saveManifest(manifest: CorpusManifest, version = DEFAULT_VERSION): void {
  writeJson(paths.manifest(version), manifest);
}

export function assertNotSealed(manifest: CorpusManifest, stage: string): void {
  if (!manifest.sealed) return;
  throw new Error(
    `corpus ${manifest.corpusVersion} está SELADO: '${stage}' alteraria dados já publicados. ` +
      "Correção não edita a versão selada — crie uma versão nova com supersedes (ADR-087 §2).",
  );
}

export function refreshManifest(manifest: CorpusManifest, version = DEFAULT_VERSION): CorpusManifest {
  const documents = readJsonl<unknown>(paths.documents(version));
  const passages = readJsonl<unknown>(paths.passages(version));

  const labels: Record<string, string> = {};
  let labelled = 0;
  let humanReviewed = 0;

  for (const criterion of manifest.criteria) {
    const rows = readJsonl<ConsolidatedLabel>(paths.labels(criterion as CriterionId, version));
    if (rows.length === 0) continue;
    labels[criterion] = hashRows(rows);
    labelled += rows.length;
    humanReviewed += rows.filter((row) => row.tier === "human").length;
  }

  return {
    ...manifest,
    counts: { documents: documents.length, passages: passages.length, labelled, humanReviewed },
    hashes: { documents: hashRows(documents), passages: hashRows(passages), labels },
  };
}
