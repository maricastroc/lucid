import { buildDocument } from "./document/model";
import { runMetrics } from "./metrics";
import { PASSES } from "./passes/registry";
import { buildScore } from "./score";
import { DEFAULT_CONFIG, hashConfig } from "./config";
import { DOCUMENT_DATASETS, dataHashFor, createDataView, type DatasetId } from "./data/registry";
import type { Config } from "./config";
import type { Diagnostic, Finding, Pass, PassContext } from "./types";

const LUCID_VERSION = "0.1.0";

const STANDARD_VERSION = "ABNT NBR ISO 24495-1:2024" as const;

function mergeConfig(overrides?: Partial<Config>): Config {
  return { ...DEFAULT_CONFIG, ...overrides };
}

export function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    if (a.span.start !== b.span.start) return a.span.start - b.span.start;
    if (a.span.end !== b.span.end) return a.span.end - b.span.end;
    if (a.criterion !== b.criterion) return a.criterion < b.criterion ? -1 : 1;
    if (a.principle !== b.principle) return a.principle < b.principle ? -1 : 1;
    return 0;
  });
}
export function analyzeWithPasses(
  text: string,
  passes: readonly Pass[],
  configOverrides?: Partial<Config>,
): Diagnostic {
  const config = mergeConfig(configOverrides);
  const doc = buildDocument(text);
  const metrics = runMetrics(doc, config);

  const rawFindings = passes.flatMap((pass) => {
    const context: PassContext = Object.freeze({ doc, config, data: createDataView(pass.dataDeps ?? []) });
    return pass.run(context);
  });
  const findings = sortFindings(rawFindings);

  const score = buildScore(findings, passes, metrics.words, config);

  const dataIds: DatasetId[] = [...DOCUMENT_DATASETS, ...passes.flatMap((pass) => pass.dataDeps ?? [])];

  return {
    text: doc.source,
    findings,
    score,
    metrics,
    meta: {
      lucidVersion: LUCID_VERSION,
      configHash: hashConfig(config),
      dataHash: dataHashFor(dataIds),
      standardVersion: STANDARD_VERSION,
    },
  };
}

export function analyze(text: string, configOverrides?: Partial<Config>): Diagnostic {
  return analyzeWithPasses(text, PASSES, configOverrides);
}
