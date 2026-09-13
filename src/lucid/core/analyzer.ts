import { buildDocument } from "./document/model";
import { runMetrics } from "./metrics";
import { buildScore } from "./score";
import { hashConfig } from "./config";
import type { Config } from "./config";
import type { LocaleBundle } from "./contracts/locale";
import type { CriterionTaxonomy, Diagnostic, Document, Finding, PassContext, PassFinding } from "./types";

const LUCID_VERSION = "0.1.0";

function mergeConfig<C extends Config>(base: C, overrides?: Partial<C>): C {
  return { ...base, ...overrides };
}

function stampTaxonomy(finding: PassFinding, taxonomy: CriterionTaxonomy): Finding {
  const entry = taxonomy[finding.criterion];
  if (!entry) {
    throw new Error(
      `critério "${finding.criterion}" não tem entrada em locale.taxonomy — ` +
        "todo critério precisa declarar source/principleGroup (ADR-056).",
    );
  }
  return {
    ...finding,
    source: entry.source,
    principleGroup: entry.principleGroup,
    ...(entry.source === "iso-24495-1" ? { normativeReference: entry.normativeReference } : {}),
  };
}

export function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    if (a.span.start !== b.span.start) return a.span.start - b.span.start;
    if (a.span.end !== b.span.end) return a.span.end - b.span.end;
    if (a.criterion !== b.criterion) return a.criterion < b.criterion ? -1 : 1;
    return 0;
  });
}

export function analyzeDocumentWithLocale<C extends Config>(
  doc: Document,
  locale: LocaleBundle<C>,
  configOverrides?: Partial<C>,
): Diagnostic {
  const config = mergeConfig(locale.config, configOverrides);

  const readability = locale.metrics.readability;
  const cohesion = locale.metrics.cohesion;
  const metrics = runMetrics(doc, config, {
    countSyllables: locale.metrics.countSyllables,
    readability: readability === undefined ? undefined : (input) => readability.calculate(input),
    cohesion: cohesion === undefined ? undefined : (d) => cohesion(d),
  });

  const rawFindings = locale.passes.flatMap((pass) => {
    const context: PassContext<C> = Object.freeze({
      doc,
      config,
      data: locale.data.createDataView(pass.dataDeps ?? []),
    });
    const passFindings = pass.run(context);
    for (const finding of passFindings) {
      if (finding.criterion !== pass.criterion) {
        throw new Error(
          `pass "${pass.criterion}" produziu um finding com criterion "${finding.criterion}" — ` +
            "finding.criterion deve ser sempre igual ao criterion do pass que o gerou.",
        );
      }
    }
    return passFindings.map((finding) => stampTaxonomy(finding, locale.taxonomy));
  });
  const findings = sortFindings(rawFindings);

  const scoredWords = doc.tokens.reduce((n, token) => (token.isWord ? n + 1 : n), 0);
  const score = buildScore(findings, locale.passes, scoredWords, config);

  const dataIds: string[] = [
    ...locale.data.documentDatasets,
    ...locale.passes.flatMap((pass) => pass.dataDeps ?? []),
    ...(locale.metrics.dataDeps ?? []),
  ];

  return {
    text: doc.source,
    findings,
    score,
    metrics,
    meta: {
      lucidVersion: LUCID_VERSION,
      localeId: locale.id,
      configHash: hashConfig(config, Object.keys(locale.configSchema)),
      dataHash: locale.data.dataHashFor(dataIds),
      standardVersion: locale.standardVersion,
    },
  };
}

export function analyzeWithLocale<C extends Config>(
  text: string,
  locale: LocaleBundle<C>,
  configOverrides?: Partial<C>,
): Diagnostic {
  const doc = buildDocument(text, {
    segmentSentences: locale.services.segmentSentences,
    abbreviations: locale.data.abbreviations,
  });
  return analyzeDocumentWithLocale(doc, locale, configOverrides);
}

export function createAnalyzer<C extends Config>(opts: {
  locale: LocaleBundle<C>;
}): {
  readonly localeId: string;
  analyze(text: string, configOverrides?: Partial<C>): Diagnostic;
} {
  return {
    localeId: opts.locale.id,
    analyze: (text, configOverrides) => analyzeWithLocale(text, opts.locale, configOverrides),
  };
}
