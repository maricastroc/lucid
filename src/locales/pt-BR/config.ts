import type { Config, ConfigSchema, OrgTerm, ThresholdBasis } from "@/lucid/core/config";

export interface PtConfig extends Config {
  sentenceLength: {
    warnAbove: number;
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
  vocabulario: {
    enabled: boolean;
    terms: readonly OrgTerm[];
  };
  metrics: {
    decimalPlaces: number;
  };
}

export const DEFAULT_CONFIG: PtConfig = {
  sentenceLength: {
    warnAbove: 20,
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
  vocabulario: {
    enabled: true,
    terms: [],
  },
  metrics: {
    decimalPlaces: 1,
  },
};

const PRODUCT_PARAMETER: ThresholdBasis = {
  status: "product-parameter",
  basis: "Parâmetro de produto do Lucid; a ABNT NBR ISO 24495-1 não fixa número para este limite.",
};

export const PT_CONFIG_SCHEMA: ConfigSchema = {
  sentenceLength: {
    criterion: "long_sentence",
    thresholds: {
      warnAbove: {
        status: "product-parameter",
        basis:
          "Gatilho de inspeção, não regra (ADR-094). A norma pede frases concisas e variação de tamanho sem " +
          "fixar número.",
      },
    },
  },
  passiveVoice: { criterion: "passive_voice" },
  passivaSintetica: { criterion: "passiva_sintetica" },
  nominalization: { criterion: "nominalization" },
  nominalizacaoEncadeada: { criterion: "nominalizacao_encadeada", thresholds: { minPorFrase: PRODUCT_PARAMETER } },
  jargon: { criterion: "jargon" },
  siglaSemExpansao: { criterion: "sigla_sem_expansao" },
  maisQuePerfeito: { criterion: "mais_que_perfeito_sintetico" },
  gerundismo: { criterion: "gerundismo" },
  adverbioMente: { criterion: "adverbio_mente_denso", thresholds: { minPorFrase: PRODUCT_PARAMETER } },
  adverbiosVagos: { criterion: "adverbios_vagos" },
  redundancia: { criterion: "redundancia" },
  perifraseInflada: { criterion: "perifrase_inflada" },
  paragraphLength: { criterion: "paragraph_length", thresholds: { maxSentences: PRODUCT_PARAMETER } },
  proseEnumeration: { criterion: "prose_enumeration", thresholds: { minMarkers: PRODUCT_PARAMETER } },
  mesoclise: { criterion: "mesoclise" },
  duplaNegacao: { criterion: "dupla_negacao" },
  subordinacao: { criterion: "subordinacao_densa", thresholds: { minPorFrase: PRODUCT_PARAMETER } },
  leitorTerceiraPessoa: { criterion: "leitor_terceira_pessoa" },
  hierarquiaTitulos: { criterion: "salto_de_nivel_titulo" },
  longHeading: { criterion: "long_heading", thresholds: { maxWords: PRODUCT_PARAMETER } },
  singleItemList: { criterion: "single_item_list" },
  headingBodyMismatch: {
    criterion: "heading_body_mismatch",
    thresholds: { minBodyContentWords: PRODUCT_PARAMETER },
  },
  vocabulario: { criterion: "vocabulario_da_organizacao", role: "organization-vocabulary" },
  metrics: { criterion: null },
};
