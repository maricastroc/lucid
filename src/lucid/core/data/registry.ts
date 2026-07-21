/**
 * Data registry — dado como ENTRADA VERSIONADA de primeira classe (docs/DESIGN-data-registry.md).
 *
 * Hoje cada consumidor da Camada 1 importa seu JSON direto e mudar um léxico NÃO mexe no
 * `configHash` (só o golden pega). Este registry é a fonte única de PROVENIÊNCIA dos dados:
 * carrega cada dataset uma vez (import de compilação — zero I/O de runtime, I1/I4), calcula um
 * `fingerprint` estável do conteúdo, e permite ao `analyze` estampar um `dataHash` no
 * `Diagnostic` — fechando a lacuna de governança.
 *
 * INCREMENTO 1 (este arquivo): registry + fingerprints + `dataHash`. Os passes ainda importam
 * seus dados direto (saída idêntica exceto o novo `meta.dataHash`); a preparação (Set/Map) e o
 * roteamento por `ctx.data` migram no incremento 2 (output-neutral). Ver ADR na DECISOES.md.
 *
 * Fronteira: vive em `core`; não importa `probe`/`report`/rede. `fingerprint` via `stableHash`
 * — o MESMO algoritmo do `configHash`.
 */
import { stableHash } from "../hash";
import abreviacoesData from "../../data/abreviacoes.pt.json";
import verbosSerData from "../../data/verbos-ser.pt.json";
import participiosIrregularesData from "../../data/participios-irregulares.pt.json";
import participiosAmbiguosData from "../../data/participios-ambiguos.pt.json";
import participiosFalsosNominaisData from "../../data/participios-falsos-nominais.pt.json";
import participiosInfinitivoData from "../../data/participios-infinitivo.pt.json";
import verbosLevesData from "../../data/verbos-leves.pt.json";
import nominalizacoesData from "../../data/nominalizacoes.pt.json";
import jargaoData from "../../data/jargao.pt.json";

/** União fechada dos ids de dataset conhecidos. Trocar id é evento de código, auditável. */
export type DatasetId =
  | "abreviacoes.pt"
  | "verbos-ser.pt"
  | "participios-irregulares.pt"
  | "participios-ambiguos.pt"
  | "participios-falsos-nominais.pt"
  | "participios-infinitivo.pt"
  | "verbos-leves.pt"
  | "nominalizacoes.pt"
  | "jargao.pt";

export interface DatasetRecord {
  readonly id: DatasetId;
  /** conteúdo cru importado (fonte da verdade do fingerprint) */
  readonly raw: unknown;
  /** hash estável do conteúdo — muda quando o JSON muda (governança automática) */
  readonly fingerprint: string;
  /** 1 linha de proveniência espelhando o README (auditabilidade inline) */
  readonly provenance: string;
}

const RAW: Record<DatasetId, { raw: unknown; provenance: string }> = {
  "abreviacoes.pt": { raw: abreviacoesData, provenance: "abreviações PT-BR que não encerram frase (curadoria própria)" },
  "verbos-ser.pt": { raw: verbosSerData, provenance: "paradigma completo de 'ser' — âncora da voz passiva (curadoria própria)" },
  "participios-irregulares.pt": { raw: participiosIrregularesData, provenance: "particípios irregulares (curadoria própria)" },
  "participios-ambiguos.pt": { raw: participiosAmbiguosData, provenance: "particípios de leitura adjetival/predicativa a excluir (curadoria própria)" },
  "participios-falsos-nominais.pt": { raw: participiosFalsosNominaisData, provenance: "particípios lexicalizados como substantivo a excluir (curadoria própria)" },
  "participios-infinitivo.pt": { raw: participiosInfinitivoData, provenance: "particípio→infinitivo do andaime de passiva (Tier 2; curadoria própria)" },
  "verbos-leves.pt": { raw: verbosLevesData, provenance: "verbos-suporte da nominalização (curadoria própria)" },
  "nominalizacoes.pt": { raw: nominalizacoesData, provenance: "nominalização→verbo + conjugação fechada (curadoria própria)" },
  "jargao.pt": { raw: jargaoData, provenance: "glossário curado de jargão administrativo-jurídico (ADR-008)" },
};

/**
 * Registro construído UMA vez no load, congelado. `fingerprint` calculado em memória a partir do
 * `raw` — sem I/O de runtime. Datasets curados usam hash de conteúdo (estratégia "content"); o
 * futuro léxico morfológico grande usará versão pinada (ver DESIGN-data-registry.md §2.3).
 */
export const REGISTRY: Readonly<Record<DatasetId, DatasetRecord>> = Object.freeze(
  Object.fromEntries(
    (Object.keys(RAW) as DatasetId[]).map((id) => {
      const { raw, provenance } = RAW[id];
      return [id, Object.freeze({ id, raw, fingerprint: stableHash(raw), provenance })];
    }),
  ) as Record<DatasetId, DatasetRecord>,
);

/**
 * Datasets consumidos no ESTÁGIO DE DOCUMENTO (`segment-sentences`, na montagem do `Document`),
 * fora do pipeline de passes. O documento é sempre construído → estes SEMPRE contam para o
 * `dataHash`. Ver DESIGN-data-registry.md §2.4.
 */
export const DOCUMENT_DATASETS: readonly DatasetId[] = ["abreviacoes.pt"];

/** Fingerprint de um dataset. */
export function datasetFingerprint(id: DatasetId): string {
  return REGISTRY[id].fingerprint;
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
