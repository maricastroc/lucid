/**
 * Registry de dados do locale pt-BR (ADR-031). Constrói a instância a partir do mecanismo neutro
 * `createRegistry` do core e dos `specs` do português. Expõe helpers TIPADOS (`getPrepared<K>` →
 * `DataTypes[K]`) que os passes consomem — a tipagem forte de datasets vive no locale, não no core.
 *
 * Os ids (`"jargao.pt"`…) são estáveis por design: entram no `dataHash`.
 */
import { createRegistry, type DatasetRecord, type RawSpec, type Registry } from "@/lucid/core/data/registry";
import type { DataView } from "@/lucid/core/data/types";
import type { DataTypes, DatasetId } from "./types";
import {
  prepareActiveConjugations,
  preparePhrases,
  prepareJargon,
  prepareLightVerbs,
  prepareNominalizations,
  prepareRecord,
  prepareSerTenses,
  prepareStringSet,
} from "./prepare";
import abreviacoesData from "./abreviacoes.pt.json";
import verbosSerData from "./verbos-ser.pt.json";
import participiosIrregularesData from "./participios-irregulares.pt.json";
import participiosAmbiguosData from "./participios-ambiguos.pt.json";
import participiosFalsosNominaisData from "./participios-falsos-nominais.pt.json";
import participiosInfinitivoData from "./participios-infinitivo.pt.json";
import verbosLevesData from "./verbos-leves.pt.json";
import nominalizacoesData from "./nominalizacoes.pt.json";
import jargaoData from "./jargao.pt.json";
import maisQuePerfeitoData from "./mais-que-perfeito.pt.json";
import adverbiosMenteData from "./adverbios-mente.pt.json";
import redundanciasData from "./redundancias.pt.json";
import perifrasesData from "./perifrases.pt.json";
import duplasNegacoesData from "./duplas-negacoes.pt.json";
import subordinadoresData from "./subordinadores.pt.json";
import substantivosLeitorData from "./substantivos-leitor.pt.json";
import serTemposData from "./ser-tempos.pt.json";
import conjugacoesAtivasData from "./conjugacoes-ativas.pt.json";

export type { DatasetId } from "./types";
export type { DatasetRecord };

const SPECS: Record<DatasetId, RawSpec> = {
  "abreviacoes.pt": {
    raw: abreviacoesData,
    prepare: (r) => prepareStringSet(r, "abbreviations"),
    provenance: "abreviações PT-BR que não encerram frase (curadoria própria)",
  },
  "verbos-ser.pt": {
    raw: verbosSerData,
    prepare: (r) => prepareStringSet(r, "forms"),
    provenance: "paradigma completo de 'ser' — âncora da voz passiva (curadoria própria)",
  },
  "participios-irregulares.pt": {
    raw: participiosIrregularesData,
    prepare: (r) => prepareStringSet(r, "forms"),
    provenance: "particípios irregulares (curadoria própria)",
  },
  "participios-ambiguos.pt": {
    raw: participiosAmbiguosData,
    prepare: (r) => prepareStringSet(r, "forms"),
    provenance: "particípios de leitura adjetival/predicativa a excluir (curadoria própria)",
  },
  "participios-falsos-nominais.pt": {
    raw: participiosFalsosNominaisData,
    prepare: (r) => prepareStringSet(r, "forms"),
    provenance: "particípios lexicalizados como substantivo a excluir (curadoria própria)",
  },
  "participios-infinitivo.pt": {
    raw: participiosInfinitivoData,
    prepare: prepareRecord,
    provenance: "particípio→infinitivo do andaime de passiva (Tier 2; curadoria própria)",
  },
  "verbos-leves.pt": {
    raw: verbosLevesData,
    prepare: prepareLightVerbs,
    provenance: "verbos-suporte da nominalização (curadoria própria)",
  },
  "nominalizacoes.pt": {
    raw: nominalizacoesData,
    prepare: prepareNominalizations,
    provenance: "nominalização→verbo + conjugação fechada (curadoria própria)",
  },
  "jargao.pt": {
    raw: jargaoData,
    prepare: prepareJargon,
    provenance: "glossário curado de jargão administrativo-jurídico (ADR-008)",
  },
  "mais-que-perfeito.pt": {
    raw: maisQuePerfeitoData,
    prepare: (r) => prepareStringSet(r, "forms"),
    provenance: "mais-que-perfeito sintético inequívoco — derivado de PortiLexicon-UD (CC-BY 4.0)",
  },
  "adverbios-mente.pt": {
    raw: adverbiosMenteData,
    prepare: (r) => prepareStringSet(r, "forms"),
    provenance: "advérbios em -mente — derivado de PortiLexicon-UD (CC-BY 4.0)",
  },
  "redundancias.pt": {
    raw: redundanciasData,
    prepare: preparePhrases,
    provenance: "pleonasmos e duplas redundantes (curadoria própria)",
  },
  "perifrases.pt": {
    raw: perifrasesData,
    prepare: preparePhrases,
    provenance: "perífrases infladas → forma enxuta (curadoria própria)",
  },
  "duplas-negacoes.pt": {
    raw: duplasNegacoesData,
    prepare: preparePhrases,
    provenance: "dupla negação / litotes → forma direta (curadoria própria)",
  },
  "subordinadores.pt": {
    raw: subordinadoresData,
    prepare: preparePhrases,
    provenance: "conectivos subordinativos (conj./locuções + relativos seguros) para densidade (curadoria própria)",
  },
  "substantivos-leitor.pt": {
    raw: substantivosLeitorData,
    prepare: (r) => prepareStringSet(r, "forms"),
    provenance: "substantivos que nomeiam o leitor (interessado, requerente…) para fala indireta (curadoria própria)",
  },
  "ser-tempos.pt": {
    raw: serTemposData,
    prepare: prepareSerTenses,
    provenance: "forma de 'ser' → tempo/número da passiva; conversão voz ativa Tier 2 (ADR-032)",
  },
  "conjugacoes-ativas.pt": {
    raw: conjugacoesAtivasData,
    prepare: prepareActiveConjugations,
    provenance: "tabela fechada de conjugação ativa (gerada build-time); conversão voz ativa Tier 2 (ADR-032)",
  },
};

/** Instância do registry PT-BR. */
export const REGISTRY_PT: Registry = createRegistry(SPECS);

/** Datasets consumidos na CONSTRUÇÃO do documento (não por um pass) — entram no `dataHash`. */
export const DOCUMENT_DATASETS: readonly DatasetId[] = ["abreviacoes.pt"];

/** Helper TIPADO: `getPrepared("jargao.pt")` devolve `JargonPrepared`, etc. */
export function getPrepared<K extends DatasetId>(id: K): DataTypes[K] {
  return REGISTRY_PT.getPrepared<DataTypes[K]>(id);
}

export function datasetFingerprint(id: DatasetId): string {
  return REGISTRY_PT.datasetFingerprint(id);
}

export function createDataView(allowed: readonly DatasetId[]): DataView {
  return REGISTRY_PT.createDataView(allowed);
}

export function dataHashFor(ids: Iterable<DatasetId>): string {
  return REGISTRY_PT.dataHashFor(ids);
}

/** Registro cru (para testes de proveniência). */
export const REGISTRY: Readonly<Record<DatasetId, DatasetRecord>> = REGISTRY_PT.records as Readonly<
  Record<DatasetId, DatasetRecord>
>;
