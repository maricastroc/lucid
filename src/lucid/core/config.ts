/**
 * Config da Camada 1. Contrato: docs/ARQUITETURA.md §4.
 *
 * Regra de ouro: só entram campos que afetam a saída determinística de `analyze`.
 * Cada campo participa do `configHash` em `DiagnosticMeta`. Trocar um default é um
 * evento de versão (quebra snapshots de propósito). Flags de apresentação não moram
 * aqui — essas ficam na CLI/`report`.
 */

export interface Config {
  frase: {
    alertaAcimaDe: number;
    erroAcimaDe: number;
  };
  vozPassiva: {
    habilitado: boolean;
    /** default false — `estar` + particípio é frequentemente resultativo/adjetival */
    estarComoPassiva: boolean;
  };
  nominalizacao: {
    habilitado: boolean;
    sugerir: boolean;
  };
  jargao: {
    habilitado: boolean;
    ranqueFrequenciaCorte: number;
    sugerirDoGlossario: boolean;
  };
  metrics: {
    decimais: number;
  };
}

export const DEFAULT_CONFIG: Config = {
  frase: {
    alertaAcimaDe: 20,
    erroAcimaDe: 30,
  },
  vozPassiva: {
    habilitado: true,
    estarComoPassiva: false,
  },
  nominalizacao: {
    habilitado: true,
    sugerir: true,
  },
  jargao: {
    habilitado: true,
    ranqueFrequenciaCorte: 5000,
    sugerirDoGlossario: true,
  },
  metrics: {
    decimais: 1,
  },
};

/**
 * Hash estável (determinístico) da Config efetiva, usado em `DiagnosticMeta.configHash`.
 * Serialização por chave ordenada recursivamente — não depende da ordem de inserção do
 * objeto de entrada. Implementação mínima de andaime (Fase 0); os passes da Fase 1 não
 * dependem do algoritmo exato, só de que a mesma Config produza sempre o mesmo hash.
 */
export function hashConfig(config: Config): string {
  const ordenado = stableStringify(config);
  let hash = 0;
  for (let i = 0; i < ordenado.length; i++) {
    hash = (hash * 31 + ordenado.charCodeAt(i)) | 0;
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
  const chaves = Object.keys(value as Record<string, unknown>).sort();
  const pares = chaves.map(
    (chave) => `${JSON.stringify(chave)}:${stableStringify((value as Record<string, unknown>)[chave])}`,
  );
  return `{${pares.join(",")}}`;
}
