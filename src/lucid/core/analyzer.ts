import { buildDocument } from "./document/model";
import { runMetrics } from "./metrics";
import { buildScore } from "./score";
import { hashConfig } from "./config";
import type { Config } from "./config";
import type { LocaleBundle } from "./contracts/locale";
import type { Diagnostic, Document, Finding, PassContext } from "./types";

const LUCID_VERSION = "0.1.0";

function mergeConfig(base: Config, overrides?: Partial<Config>): Config {
  return { ...base, ...overrides };
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

export function analyzeDocumentWithLocale(
  doc: Document,
  locale: LocaleBundle,
  configOverrides?: Partial<Config>,
): Diagnostic {
  const config = mergeConfig(locale.config, configOverrides);

  const metrics = runMetrics(doc, config, {
    countSyllables: locale.metrics.countSyllables,
    readability: (input) => locale.metrics.readability.calculate(input),
  });

  const rawFindings = locale.passes.flatMap((pass) => {
    const context: PassContext = Object.freeze({ doc, config, data: locale.data.createDataView(pass.dataDeps ?? []) });
    const findings = pass.run(context);
    for (const finding of findings) {
      if (finding.criterion !== pass.criterion) {
        throw new Error(
          `pass "${pass.criterion}" produziu um finding com criterion "${finding.criterion}" — ` +
            "finding.criterion deve ser sempre igual ao criterion do pass que o gerou.",
        );
      }
    }
    return findings;
  });
  const findings = sortFindings(rawFindings);

  const score = buildScore(findings, locale.passes, metrics.words, config);

  const dataIds: string[] = [...locale.data.documentDatasets, ...locale.passes.flatMap((pass) => pass.dataDeps ?? [])];

  return {
    text: doc.source,
    findings,
    score,
    metrics,
    meta: {
      lucidVersion: LUCID_VERSION,
      localeId: locale.id,
      configHash: hashConfig(config),
      dataHash: locale.data.dataHashFor(dataIds),
      standardVersion: locale.standardVersion,
    },
  };
}

export function analyzeWithLocale(text: string, locale: LocaleBundle, configOverrides?: Partial<Config>): Diagnostic {
  const doc = buildDocument(text, {
    segmentSentences: locale.services.segmentSentences,
    abbreviations: locale.data.abbreviations,
  });
  return analyzeDocumentWithLocale(doc, locale, configOverrides);
}

export function createAnalyzer(opts: { locale: LocaleBundle }): {
  readonly localeId: string;
  analyze(text: string, configOverrides?: Partial<Config>): Diagnostic;
} {
  return {
    localeId: opts.locale.id,
    analyze: (text, configOverrides) => analyzeWithLocale(text, opts.locale, configOverrides),
  };
}
