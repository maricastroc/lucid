/**
 * Data registry — dado como ENTRADA VERSIONADA de primeira classe (docs/DESIGN-data-registry.md).
 *
 * Fonte única de dados da Camada 1: importa cada dataset uma vez (import de compilação — zero I/O
 * de runtime, I1/I4), PREPARA a estrutura pronta (Set/Map) uma vez (memoização), e calcula um
 * `fingerprint` estável do conteúdo. O `analyze` estampa um `dataHash` no `Diagnostic`
 * (proveniência) — fechando a lacuna de governança (mudar léxico não mexia no `configHash`).
 *
 * Dois acessos ao preparado:
 *   · `getPrepared(id)` — direto (sem escopo), para consumidores FORA do pipeline de passes:
 *     montagem do documento (`segment-sentences`) e actions. Também usado por passes que mantêm
 *     constantes de módulo.
 *   · `createDataView(allowed)` → `PassContext.data` — visão ESCOPADA (só os `dataDeps`
 *     declarados), para passes NOVOS que consomem dado em run-time (ex.: anotação morfológica).
 *
 * Fronteira: vive em `core`; não importa `probe`/`report`/rede/passe. `fingerprint` via
 * `stableHash` — o MESMO algoritmo do `configHash`.
 */
import { stableHash } from "../hash";
import type { DataTypes, DatasetId, DataView } from "./types";
import {
  preparePhrases,
  prepareJargon,
  prepareLightVerbs,
  prepareNominalizations,
  prepareRecord,
  prepareStringSet,
} from "./prepare";
import abreviacoesData from "../../data/abreviacoes.pt.json";
import verbosSerData from "../../data/verbos-ser.pt.json";
import participiosIrregularesData from "../../data/participios-irregulares.pt.json";
import participiosAmbiguosData from "../../data/participios-ambiguos.pt.json";
import participiosFalsosNominaisData from "../../data/participios-falsos-nominais.pt.json";
import participiosInfinitivoData from "../../data/participios-infinitivo.pt.json";
import verbosLevesData from "../../data/verbos-leves.pt.json";
import nominalizacoesData from "../../data/nominalizacoes.pt.json";
import jargaoData from "../../data/jargao.pt.json";
import maisQuePerfeitoData from "../../data/mais-que-perfeito.pt.json";
import adverbiosMenteData from "../../data/adverbios-mente.pt.json";
import redundanciasData from "../../data/redundancias.pt.json";
import perifrasesData from "../../data/perifrases.pt.json";
import duplasNegacoesData from "../../data/duplas-negacoes.pt.json";

export type { DatasetId } from "./types";

export interface DatasetRecord {
  readonly id: DatasetId;
  /** conteúdo cru importado (fonte da verdade do fingerprint) */
  readonly raw: unknown;
  /** estrutura pronta (Set/Map), construída UMA vez */
  readonly prepared: unknown;
  /** hash estável do conteúdo — muda quando o JSON muda (governança automática) */
  readonly fingerprint: string;
  /** 1 linha de proveniência espelhando o README (auditabilidade inline) */
  readonly provenance: string;
}

interface RawSpec {
  raw: unknown;
  prepare: (raw: unknown) => unknown;
  provenance: string;
}

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
};

/**
 * Registro construído UMA vez no load, congelado. `fingerprint` do `raw` (estratégia "content"
 * para datasets curados); `prepared` memoizado. Sem I/O de runtime. O futuro léxico morfológico
 * grande usará versão pinada (ver DESIGN-data-registry.md §2.3).
 */
export const REGISTRY: Readonly<Record<DatasetId, DatasetRecord>> = Object.freeze(
  Object.fromEntries(
    (Object.keys(SPECS) as DatasetId[]).map((id) => {
      const { raw, prepare, provenance } = SPECS[id];
      return [id, Object.freeze({ id, raw, prepared: prepare(raw), fingerprint: stableHash(raw), provenance })];
    }),
  ) as Record<DatasetId, DatasetRecord>,
);

/**
 * Datasets consumidos no ESTÁGIO DE DOCUMENTO (`segment-sentences`, na montagem do `Document`),
 * fora do pipeline de passes. O documento é sempre construído → estes SEMPRE contam para o
 * `dataHash`. Ver DESIGN-data-registry.md §2.4.
 */
export const DOCUMENT_DATASETS: readonly DatasetId[] = ["abreviacoes.pt"];

/** Estrutura preparada (memoizada) de um dataset, tipada. Acesso direto, sem escopo. */
export function getPrepared<K extends DatasetId>(id: K): DataTypes[K] {
  return REGISTRY[id].prepared as DataTypes[K];
}

/** Fingerprint de um dataset. */
export function datasetFingerprint(id: DatasetId): string {
  return REGISTRY[id].fingerprint;
}

/**
 * Visão ESCOPADA para `PassContext.data`: só os ids declarados em `dataDeps`. `get` de um id não
 * declarado lança — impede dependência oculta e mantém o `dataHash` honesto por construção.
 */
export function createDataView(allowed: readonly DatasetId[]): DataView {
  const allowedSet = new Set(allowed);
  return {
    get<K extends DatasetId>(id: K): DataTypes[K] {
      if (!allowedSet.has(id)) {
        throw new Error(`data.get("${id}") não declarado em dataDeps deste pass`);
      }
      return getPrepared(id);
    },
  };
}

/**
 * `dataHash` de proveniência para um conjunto de datasets em jogo: hash estável sobre os pares
 * `(id, fingerprint)` ORDENADOS e deduplicados. Reprodutibilidade completa de um `Diagnostic`
 * passa a ser `(lucidVersion, configHash, dataHash)`.
 */
export function dataHashFor(ids: Iterable<DatasetId>): string {
  const unique = [...new Set(ids)].sort();
  return stableHash(unique.map((id) => [id, REGISTRY[id].fingerprint]));
}
