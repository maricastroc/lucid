/**
 * Config da Camada 1. Contrato: docs/ARQUITETURA.md §4.
 *
 * Regra de ouro: só entram campos que afetam a saída determinística de `analyze`.
 * Cada campo participa do `configHash` em `DiagnosticMeta`. Trocar um default é um
 * evento de versão (quebra snapshots de propósito). Flags de apresentação não moram
 * aqui — essas ficam na CLI/`report`.
 */
import { stableHash } from "./hash";

export interface Config {
  sentenceLength: {
    warnAbove: number;
    errorAbove: number;
  };
  passiveVoice: {
    enabled: boolean;
    /** default false — `estar` + particípio é frequentemente resultativo/adjetival */
    treatEstarAsPassive: boolean;
  };
  nominalization: {
    enabled: boolean;
    suggest: boolean;
  };
  jargon: {
    enabled: boolean;
    frequencyRankCutoff: number;
    suggestFromGlossary: boolean;
  };
  maisQuePerfeito: {
    enabled: boolean;
  };
  gerundismo: {
    enabled: boolean;
  };
  adverbioMente: {
    enabled: boolean;
    /** mínimo de advérbios em -mente na mesma frase para marcar (densidade) */
    minPorFrase: number;
  };
  metrics: {
    decimalPlaces: number;
  };
}

export const DEFAULT_CONFIG: Config = {
  sentenceLength: {
    warnAbove: 20,
    errorAbove: 30,
  },
  passiveVoice: {
    enabled: true,
    treatEstarAsPassive: false,
  },
  nominalization: {
    enabled: true,
    suggest: true,
  },
  jargon: {
    enabled: true,
    frequencyRankCutoff: 5000,
    suggestFromGlossary: true,
  },
  maisQuePerfeito: {
    enabled: true,
  },
  gerundismo: {
    enabled: true,
  },
  adverbioMente: {
    enabled: true,
    minPorFrase: 3,
  },
  metrics: {
    decimalPlaces: 1,
  },
};

/**
 * Hash estável (determinístico) da Config efetiva, usado em `DiagnosticMeta.configHash`.
 * Reusa o `stableHash` compartilhado (`./hash`) — mesmo algoritmo do `dataHash` do registry.
 * Os passes não dependem do algoritmo exato, só de que a mesma Config produza sempre o mesmo hash.
 */
export function hashConfig(config: Config): string {
  return stableHash(config);
}
