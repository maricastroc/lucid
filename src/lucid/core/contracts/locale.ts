/**
 * Contrato de LOCALE (ADR-031) — a fronteira que torna o Lucid extensível por idioma.
 *
 * O core conhece só ESTES contratos abstratos; toda dependência linguística (passes, léxicos,
 * sílabas, fórmula de legibilidade, segmentação por abreviações, conjunto de critérios) entra por
 * um `LocaleBundle`. Não há `if (locale === ...)` em lugar nenhum: o comportamento vem por
 * composição. O bundle carrega SÓ o que varia por idioma — nada neutro (ordenação, score,
 * esqueleto de métrica, `createDataView`, provas de número/data do Tier 3) entra aqui.
 *
 * Este arquivo não importa nada específico de PT — só os tipos-shape do core.
 */
import type { Config } from "../config";
import type { Pass, Sentence } from "../types";
import type { DataView } from "../data/types";

/** Identidade de um locale, ex.: `"pt-BR"`. Branded para não se confundir com string qualquer. */
export type LocaleId = string & { readonly __localeBrand: unique symbol };
export function asLocaleId(id: string): LocaleId {
  return id as LocaleId;
}

/**
 * Serviços de documento que variam por idioma. `normalize` (NFC) e `tokenize` NÃO entram — são
 * neutros e ficam no core como default; um locale só os sobrescreveria para um script não-latino
 * (YAGNI). Só a segmentação de frases carrega dependência de idioma (o set de abreviações).
 */
export interface DocumentServices {
  segmentSentences: (source: string, abbreviations: ReadonlySet<string>) => Sentence[];
}

/** Métrica de legibilidade como ESTRATÉGIA — o core não menciona Flesch-PT diretamente. */
export interface ReadabilityMetric {
  readonly id: string;
  calculate(input: { wordsPerSentence: number; syllablesPerWord: number }): number;
}

/** Serviços de métrica que variam por idioma: contagem de sílabas + a fórmula de legibilidade. */
export interface MetricServices {
  countSyllables: (word: string) => number;
  readability: ReadabilityMetric;
}

/**
 * Registry de dados ESCOPADO ao locale (não global). O mecanismo (fingerprint/hash/escopo) é
 * neutro e vem do core (`createRegistry`); o locale só expõe a visão + os ids que usa. IMPORTANTE:
 * a string do id entra no `dataHash` — os ids são estáveis por design.
 */
export interface LocaleDataRegistry {
  createDataView(deps: readonly string[]): DataView;
  readonly documentDatasets: readonly string[];
  dataHashFor(ids: Iterable<string>): string;
  /** set de abreviações que a segmentação de frases consome */
  readonly abbreviations: ReadonlySet<string>;
}

/** Conjunto de critérios do locale (o `CRITERION_IDS` do ADR-029, agora por-locale). */
export interface LocaleCriteria {
  readonly ids: readonly string[];
}

export interface LocaleBundle {
  readonly id: LocaleId;
  /** citação da norma na adoção do locale (pt-BR: "ABNT NBR ISO 24495-1:2024") */
  readonly standardVersion: string;
  readonly passes: readonly Pass[];
  /** config default do locale — para pt-BR é o objeto de hoje (configHash inalterado) */
  readonly config: Config;
  readonly services: DocumentServices;
  readonly metrics: MetricServices;
  readonly data: LocaleDataRegistry;
  readonly criteria: LocaleCriteria;
}
