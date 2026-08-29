import { stableHash } from "./hash";

export interface Config {
  sentenceLength: {
    warnAbove: number;
    errorAbove: number;
  };
  passiveVoice: {
    enabled: boolean;
  };
  passivaSintetica: {
    enabled: boolean;
  };
  nominalization: {
    enabled: boolean;
  };
  nominalizacaoEncadeada: {
    enabled: boolean;
    minPorFrase: number;
  };
  jargon: {
    enabled: boolean;
    suggestFromGlossary: boolean;
  };
  siglaSemExpansao: {
    enabled: boolean;
  };
  maisQuePerfeito: {
    enabled: boolean;
  };
  gerundismo: {
    enabled: boolean;
  };
  adverbioMente: {
    enabled: boolean;
    minPorFrase: number;
  };
  adverbiosVagos: {
    enabled: boolean;
  };
  redundancia: {
    enabled: boolean;
  };
  perifraseInflada: {
    enabled: boolean;
  };
  paragraphLength: {
    enabled: boolean;
    maxSentences: number;
  };
  proseEnumeration: {
    enabled: boolean;
    minMarkers: number;
  };
  mesoclise: {
    enabled: boolean;
  };
  duplaNegacao: {
    enabled: boolean;
  };
  subordinacao: {
    enabled: boolean;
    minPorFrase: number;
  };
  leitorTerceiraPessoa: {
    enabled: boolean;
  };
  hierarquiaTitulos: {
    enabled: boolean;
  };
  longHeading: {
    enabled: boolean;
    maxWords: number;
  };
  singleItemList: {
    enabled: boolean;
  };
  headingBodyMismatch: {
    enabled: boolean;
    minBodyContentWords: number;
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
  },
  passivaSintetica: {
    enabled: true,
  },
  nominalization: {
    enabled: true,
  },
  nominalizacaoEncadeada: {
    enabled: true,
    minPorFrase: 3,
  },
  jargon: {
    enabled: true,
    suggestFromGlossary: true,
  },
  siglaSemExpansao: {
    enabled: true,
  },
  maisQuePerfeito: {
    enabled: true,
  },
  gerundismo: {
    enabled: true,
  },
  adverbioMente: {
    enabled: false,
    minPorFrase: 3,
  },
  adverbiosVagos: {
    enabled: true,
  },
  redundancia: {
    enabled: true,
  },
  perifraseInflada: {
    enabled: true,
  },
  paragraphLength: {
    enabled: true,
    maxSentences: 5,
  },
  proseEnumeration: {
    enabled: true,
    minMarkers: 3,
  },
  mesoclise: {
    enabled: true,
  },
  duplaNegacao: {
    enabled: true,
  },
  subordinacao: {
    enabled: true,
    minPorFrase: 3,
  },
  leitorTerceiraPessoa: {
    enabled: true,
  },
  hierarquiaTitulos: {
    enabled: true,
  },
  longHeading: {
    enabled: true,
    maxWords: 12,
  },
  singleItemList: {
    enabled: true,
  },
  headingBodyMismatch: {
    enabled: true,
    minBodyContentWords: 6,
  },
  metrics: {
    decimalPlaces: 1,
  },
};

export function hashConfig(config: Config): string {
  return stableHash(config);
}

export type ConfigValue = number | boolean;

export interface ConfigDeviation {
  readonly section: string;
  readonly field: string;
  readonly value: ConfigValue;
  readonly fallback: ConfigValue;
}

export function configDeviations(config: Config): ConfigDeviation[] {
  const deviations: ConfigDeviation[] = [];
  const base = DEFAULT_CONFIG as unknown as Record<string, Record<string, ConfigValue>>;
  const current = config as unknown as Record<string, Record<string, ConfigValue>>;

  for (const section of Object.keys(base)) {
    const defaults = base[section];
    const values = current[section];
    if (values === undefined) continue;
    for (const field of Object.keys(defaults)) {
      const value = values[field];
      if (value === undefined || value === defaults[field]) continue;
      deviations.push({ section, field, value, fallback: defaults[field] });
    }
  }

  return deviations;
}

export function isDefaultConfig(config: Config): boolean {
  return configDeviations(config).length === 0;
}
