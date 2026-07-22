/**
 * Mecanismo de data registry — NEUTRO de idioma (ADR-031). Um locale constrói o SEU registry a
 * partir dos seus `specs`; `fingerprint`, `dataHash` e a `DataView` escopada saem daqui. Este
 * módulo não conhece nenhum dataset concreto: os ids são strings e os valores preparados são
 * opacos (`unknown`). A instância PT-BR e os seus ids vivem em `src/locales/pt-BR/datasets`.
 */
import { stableHash } from "../hash";
import type { DataView } from "./types";

export interface DatasetRecord {
  readonly id: string;
  readonly raw: unknown;
  readonly prepared: unknown;
  readonly fingerprint: string;
  readonly provenance: string;
}

export interface RawSpec {
  raw: unknown;
  prepare: (raw: unknown) => unknown;
  provenance: string;
}

export interface Registry {
  readonly records: Readonly<Record<string, DatasetRecord>>;
  getPrepared<T>(id: string): T;
  datasetFingerprint(id: string): string;
  createDataView(allowed: readonly string[]): DataView;
  /**
   * Hash de proveniência dos datasets. IMPORTANTE (neutralidade): a STRING do id entra no hash —
   * renomear um id muda o `dataHash` e quebra o golden. Mover o arquivo é seguro.
   */
  dataHashFor(ids: Iterable<string>): string;
}

export function createRegistry(specs: Record<string, RawSpec>): Registry {
  const records: Readonly<Record<string, DatasetRecord>> = Object.freeze(
    Object.fromEntries(
      Object.keys(specs).map((id) => {
        const { raw, prepare, provenance } = specs[id];
        return [id, Object.freeze({ id, raw, prepared: prepare(raw), fingerprint: stableHash(raw), provenance })];
      }),
    ) as Record<string, DatasetRecord>,
  );

  function getPrepared<T>(id: string): T {
    return records[id].prepared as T;
  }

  return {
    records,
    getPrepared,
    datasetFingerprint: (id) => records[id].fingerprint,
    createDataView(allowed) {
      const allowedSet = new Set<string>(allowed);
      return {
        get<T>(id: string): T {
          if (!allowedSet.has(id)) {
            throw new Error(`data.get("${id}") não declarado em dataDeps deste pass`);
          }
          return getPrepared<T>(id);
        },
      };
    },
    dataHashFor(ids) {
      const unique = [...new Set(ids)].sort();
      return stableHash(unique.map((id) => [id, records[id].fingerprint]));
    },
  };
}
