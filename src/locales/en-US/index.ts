import type { LocaleBundle, LocaleDataRegistry } from "@/lucid/core/contracts/locale";
import { asLocaleId } from "@/lucid/core/contracts/locale";
import { segmentSentences } from "@/lucid/core/document/segment-sentences";
import { EN_CLAUSE_TREE } from "./clauses";
import { EN_CONFIG_SCHEMA, EN_DEFAULT_CONFIG, type EnConfig } from "./config";
import { EN_CRITERION_IDS } from "./criteria";
import { DOCUMENT_DATASETS_EN, EN_ABBREVIATIONS, REGISTRY_EN } from "./datasets/registry";
import { EN_PASSES } from "./passes/registry";
import { EN_CRITERION_TAXONOMY } from "./taxonomy";

const data: LocaleDataRegistry = {
  createDataView: (deps) => REGISTRY_EN.createDataView(deps),
  documentDatasets: DOCUMENT_DATASETS_EN,
  dataHashFor: (ids) => REGISTRY_EN.dataHashFor(ids),
  abbreviations: EN_ABBREVIATIONS,
};

export const localeEnUS: LocaleBundle<EnConfig> = {
  id: asLocaleId("en-US"),
  standardVersion: "ISO 24495-1:2023",
  passes: EN_PASSES,
  config: EN_DEFAULT_CONFIG,
  configSchema: EN_CONFIG_SCHEMA,
  services: { segmentSentences },
  metrics: {},
  data,
  criteria: { ids: EN_CRITERION_IDS },
  taxonomy: EN_CRITERION_TAXONOMY,
  clauses: EN_CLAUSE_TREE,
};

export {
  EN_CRITERION_IDS,
  EN_LINGUISTIC_IDS,
  EN_NOT_PORTED,
  EN_ORGANIZATIONAL_IDS,
  EN_REUSED_ENGINE_IDS,
  isEnCriterionId,
} from "./criteria";
export type { EnCriterionId, NotPorted } from "./criteria";
export { EN_CONFIG_SCHEMA, EN_DEFAULT_CONFIG } from "./config";
export type { EnConfig } from "./config";
