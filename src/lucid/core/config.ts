/**
 * Config da Camada 1. Contrato: docs/ARQUITETURA.md §4.
 *
 * Regra de ouro: só entram campos que afetam a saída determinística de `analyze`.
 * Cada campo participa do `configHash` em `DiagnosticMeta`. Trocar um default é um
 * evento de versão (quebra snapshots de propósito). Flags de apresentação não moram
 * aqui — essas ficam na CLI/`report`.
 */

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
  metrics: {
    decimalPlaces: 1,
  },
};

/**
 * Hash estável (determinístico) da Config efetiva, usado em `DiagnosticMeta.configHash`.
 * Serialização por chave ordenada recursivamente — não depende da ordem de inserção do
 * objeto de entrada. Implementação mínima de andaime (Fase 0); os passes da Fase 1 não
 * dependem do algoritmo exato, só de que a mesma Config produza sempre o mesmo hash.
 */
export function hashConfig(config: Config): string {
  const serialized = stableStringify(config);
  let hash = 0;
  for (let i = 0; i < serialized.length; i++) {
    hash = (hash * 31 + serialized.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const pairs = keys.map(
    (key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`,
  );
  return `{${pairs.join(",")}}`;
}
