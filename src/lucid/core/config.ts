import { stableHash } from "./hash";

export interface Config {
  sentenceLength: {
    warnAbove: number;
    errorAbove: number;
  };
  passiveVoice: {
    enabled: boolean;
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
    minPorFrase: number;
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
    /** contagem mínima de palavras de conteúdo no corpo da seção para tentar a comparação */
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
