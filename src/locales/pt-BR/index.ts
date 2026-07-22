/**
 * Locale pt-BR — o PRIMEIRO locale oficial do Lucid (ADR-031).
 *
 * Reúne, atrás do contrato `LocaleBundle`, tudo que é específico do português: os 13 passes, os
 * léxicos (via o registry PT), a contagem de sílabas, o Flesch-PT, a segmentação por abreviações e
 * o conjunto de critérios. O core não conhece nada disto — recebe este bundle e compõe.
 *
 * Nota de migração: nesta etapa os módulos PT ainda vivem fisicamente em `src/lucid/core/**`; este
 * arquivo os REÚNE (direção locale→core, permitida). A mudança física para `src/locales/pt-BR/**`
 * é a etapa seguinte e não altera comportamento (ids/valores idênticos).
 */
import type { Config } from "@/lucid/core/config";
import type { Diagnostic, Pass } from "@/lucid/core/types";
import type { LocaleBundle, LocaleDataRegistry, ReadabilityMetric } from "@/lucid/core/contracts/locale";
import { asLocaleId } from "@/lucid/core/contracts/locale";
import type { Document, Span } from "@/lucid/core/types";
import { analyzeWithLocale } from "@/lucid/core/analyzer";
import { DEFAULT_CONFIG } from "@/lucid/core/config";
import { segmentSentences } from "@/lucid/core/document/segment-sentences";
import { buildDocument as buildDocumentCore } from "@/lucid/core/document/model";
import { sentenceSpanAt as sentenceSpanAtCore } from "@/lucid/core/document/locate";
import { CRITERION_IDS } from "./criteria";
import { PASSES } from "./passes/registry";
import { countSyllables } from "./services/syllables";
import { calculateFleschPt } from "./readability/flesch-pt";
import { DOCUMENT_DATASETS, REGISTRY_PT, getPrepared } from "./datasets/registry";
import type { DatasetId } from "./datasets/types";

const readability: ReadabilityMetric = {
  id: "flesch-pt-martins-1996",
  calculate: ({ wordsPerSentence, syllablesPerWord }) => calculateFleschPt(wordsPerSentence, syllablesPerWord),
};

/** Adaptador do registry PT (tipado a `DatasetId`) para o contrato neutro `LocaleDataRegistry`. */
const data: LocaleDataRegistry = {
  createDataView: (deps) => REGISTRY_PT.createDataView(deps as DatasetId[]),
  documentDatasets: DOCUMENT_DATASETS,
  dataHashFor: (ids) => REGISTRY_PT.dataHashFor([...ids] as DatasetId[]),
  abbreviations: getPrepared("abreviacoes.pt"),
};

export const localePtBR: LocaleBundle = {
  id: asLocaleId("pt-BR"),
  standardVersion: "ABNT NBR ISO 24495-1:2024",
  passes: PASSES,
  config: DEFAULT_CONFIG,
  services: { segmentSentences },
  metrics: { countSyllables, readability },
  data,
  criteria: { ids: CRITERION_IDS },
};

/**
 * `analyze(text)` — conveniência: o Lucid com o locale pt-BR ligado. É a API compatível de sempre;
 * o default pt-BR NÃO contamina o core (mora aqui, no locale). Para outro locale, use
 * `analyzeWithLocale`/`createAnalyzer` do core.
 */
export function analyze(text: string, configOverrides?: Partial<Config>): Diagnostic {
  return analyzeWithLocale(text, localePtBR, configOverrides);
}

/**
 * Helper de teste: roda um conjunto ARBITRÁRIO de passes com o resto do locale pt-BR (serviços,
 * métrica, registry). Usado por `determinism.test` para checar independência de ordem dos passes.
 */
export function analyzeWithPasses(
  text: string,
  passes: readonly Pass[],
  configOverrides?: Partial<Config>,
): Diagnostic {
  return analyzeWithLocale(text, { ...localePtBR, passes }, configOverrides);
}

/** Serviços de documento do pt-BR, prontos para `buildDocument` (conveniência). */
export const ptDocumentServices = {
  segmentSentences: localePtBR.services.segmentSentences,
  abbreviations: localePtBR.data.abbreviations,
};

/** `buildDocument` já ligado ao pt-BR — conveniência para a UI e testes. */
export function buildDocument(text: string): Document {
  return buildDocumentCore(text, ptDocumentServices);
}

/** `sentenceSpanAt` já ligado às abreviações do pt-BR — conveniência para a UI (Tier 2). */
export function sentenceSpanAt(text: string, offset: number): Span {
  return sentenceSpanAtCore(text, offset, localePtBR.data.abbreviations);
}
