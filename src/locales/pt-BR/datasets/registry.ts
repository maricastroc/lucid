import { createRegistry, type DatasetRecord, type RawSpec, type Registry } from "@/lucid/core/data/registry";
import type { DataView } from "@/lucid/core/data/types";
import type { DataTypes, DatasetId } from "./types";
import {
  preparePhrases,
  prepareJargon,
  prepareLightVerbs,
  prepareNominalizations,
  prepareRecord,
  prepareStringSet,
} from "./prepare";
import { compileConnectives, type ConnectiveEntry } from "../metrics/cohesion";
import abreviacoesData from "./abreviacoes.pt.json";
import verbosSerData from "./verbos-ser.pt.json";
import participiosIrregularesData from "./participios-irregulares.pt.json";
import participiosAmbiguosData from "./participios-ambiguos.pt.json";
import participiosFalsosNominaisData from "./participios-falsos-nominais.pt.json";
import adjuntosNaoAgenteData from "./adjuntos-nao-agente.pt.json";
import participiosInfinitivoData from "./participios-infinitivo.pt.json";
import verbosLevesData from "./verbos-leves.pt.json";
import nominalizacoesData from "./nominalizacoes.pt.json";
import substantivosAcaoData from "./substantivos-acao.pt.json";
import jargaoData from "./jargao.pt.json";
import maisQuePerfeitoData from "./mais-que-perfeito.pt.json";
import adverbiosMenteData from "./adverbios-mente.pt.json";
import adverbiosVagosData from "./adverbios-vagos.pt.json";
import redundanciasData from "./redundancias.pt.json";
import perifrasesData from "./perifrases.pt.json";
import duplasNegacoesData from "./duplas-negacoes.pt.json";
import subordinadoresData from "./subordinadores.pt.json";
import substantivosLeitorData from "./substantivos-leitor.pt.json";
import stopwordsData from "./stopwords.pt.json";
import siglasConhecidasData from "./siglas-conhecidas.pt.json";
import verbosPronominaisData from "./verbos-pronominais.pt.json";
import conectivosData from "./conectivos.pt.json";

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
  "adjuntos-nao-agente.pt": {
    raw: adjuntosNaoAgenteData,
    prepare: (r) => prepareStringSet(r, "forms"),
    provenance: "cabeças de adjunto (temporal/locativo/instrumental/idiomático) a não reconhecer como agente (curadoria própria)",
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
  "substantivos-acao.pt": {
    raw: substantivosAcaoData,
    prepare: (r) => prepareStringSet(r, "forms"),
    provenance: "substantivos deverbais de ação — cabeças da nominalização encadeada (curadoria própria, precisão>recall)",
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
    provenance: "advérbios em -mente — derivado de PortiLexicon-UD (CC-BY 4.0); dataset do critério DESCONTINUADO adverbio_mente_denso (ADR-058)",
  },
  "adverbios-vagos.pt": {
    raw: adverbiosVagosData,
    prepare: (r) => prepareStringSet(r, "forms"),
    provenance: "advérbios vagos (reforço/hedge) — curadoria própria, precisão>recall (ADR-058)",
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
  "stopwords.pt": {
    raw: stopwordsData,
    prepare: (r) => prepareStringSet(r, "forms"),
    provenance: "palavras funcionais do PT-BR (artigos, preposições, conjunções, pronomes, cópulas) — filtro de palavras de conteúdo para heading_body_mismatch (curadoria própria, ADR-044)",
  },
  "siglas-conhecidas.pt": {
    raw: siglasConhecidasData,
    prepare: (r) => prepareStringSet(r, "forms"),
    provenance: "siglas universalmente conhecidas (UFs, cotidiano, unidades) a NÃO sinalizar — allowlist enxuta (curadoria própria, ADR-059)",
  },
  "verbos-pronominais.pt": {
    raw: verbosPronominaisData,
    prepare: (r) => prepareStringSet(r, "forms"),
    provenance: "formas enclíticas de verbos inerentemente pronominais (trata-se, refere-se…) a NÃO tratar como passiva sintética (curadoria própria, ADR-060)",
  },
  "conectivos.pt": {
    raw: conectivosData,
    prepare: (r) => compileConnectives((r as { entries: ConnectiveEntry[] }).entries),
    provenance: "conectivos de discurso com classe, para a métrica de coesão — exclui 'e'/'ou' (curadoria própria, ADR-061)",
  },
};

export const REGISTRY_PT: Registry = createRegistry(SPECS);

export const DOCUMENT_DATASETS: readonly DatasetId[] = ["abreviacoes.pt"];

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

export const REGISTRY: Readonly<Record<DatasetId, DatasetRecord>> = REGISTRY_PT.records as Readonly<
  Record<DatasetId, DatasetRecord>
>;
