/**
 * Conjunto de avaliação de `countSyllables()` — SEPARADO dos testes unitários
 * (`test/syllables.test.ts`). Cada entrada traz a contagem real (dicionário/regra
 * pedagógica de divisão silábica do português), não o que o algoritmo produz.
 *
 * `estado` distingue:
 *   - "correto": o algoritmo acerta esta palavra.
 *   - "limitacao_conhecida": o algoritmo erra, por um motivo documentado (`motivo`) —
 *     NÃO é o resultado esperado/correto, é o comportamento atual, rastreado de
 *     propósito para não regredir silenciosamente nem ser confundido com acerto.
 *
 * `silasda-eval.test.ts` consome este arquivo para calcular taxa de acerto e erro
 * absoluto médio, e para impedir que uma entrada "limitacao_conhecida" seja lida como
 * se fosse a contagem certa.
 */
export interface EntradaGolden {
  palavra: string;
  real: number;
  estado: "correto" | "limitacao_conhecida";
  motivo?: string;
}

export const GOLDEN_SILABAS: readonly EntradaGolden[] = [
  // --- palavras simples ---
  { palavra: "casa", real: 2, estado: "correto" },
  { palavra: "gato", real: 2, estado: "correto" },
  { palavra: "livro", real: 2, estado: "correto" },
  { palavra: "mesa", real: 2, estado: "correto" },
  { palavra: "computador", real: 4, estado: "correto" },

  // --- acentos ---
  { palavra: "café", real: 2, estado: "correto" },
  { palavra: "política", real: 4, estado: "correto" },
  { palavra: "número", real: 3, estado: "correto" },
  { palavra: "sofá", real: 2, estado: "correto" },
  { palavra: "avó", real: 2, estado: "correto" },

  // --- ditongos (crescentes e decrescentes) ---
  { palavra: "cadeira", real: 3, estado: "correto" },
  { palavra: "pai", real: 1, estado: "correto" },
  { palavra: "história", real: 3, estado: "correto" },
  { palavra: "água", real: 2, estado: "correto" },
  { palavra: "quando", real: 2, estado: "correto" },
  { palavra: "causa", real: 2, estado: "correto" },
  { palavra: "saguão", real: 2, estado: "correto" }, // tritongo nasal "uão"
  { palavra: "Uruguai", real: 3, estado: "correto" }, // tritongo "uai"

  // --- hiatos com acento gráfico ---
  { palavra: "saída", real: 3, estado: "correto" },
  { palavra: "saúde", real: 3, estado: "correto" },
  { palavra: "país", real: 2, estado: "correto" },
  { palavra: "egoísmo", real: 4, estado: "correto" },

  // --- hiatos sem acento gráfico (regras novas: forte+forte, vogal repetida, nh) ---
  { palavra: "voo", real: 2, estado: "correto" },
  { palavra: "poesia", real: 4, estado: "limitacao_conhecida", motivo: "hiato final átono i-a depende de tonicidade" },
  { palavra: "teatro", real: 3, estado: "correto" },
  { palavra: "oceano", real: 4, estado: "correto" },
  { palavra: "real", real: 2, estado: "correto" },
  { palavra: "cruel", real: 2, estado: "correto" }, // via léxico pequeno de exceções
  { palavra: "aéreo", real: 4, estado: "correto" },
  { palavra: "rainha", real: 3, estado: "correto" },
  { palavra: "bainha", real: 3, estado: "correto" },
  { palavra: "moinho", real: 3, estado: "correto" },
  { palavra: "caminho", real: 3, estado: "correto" }, // controle: nh comum, sem hiato
  { palavra: "ruim", real: 2, estado: "correto" }, // via léxico pequeno de exceções

  // --- limitações conhecidas: hiato de tonicidade/fronteira morfológica ---
  {
    palavra: "alegria",
    real: 4,
    estado: "limitacao_conhecida",
    motivo: "sufixo -ia oxítono (tônica na última sílaba) sem sinal ortográfico local",
  },
  {
    palavra: "reunião",
    real: 4,
    estado: "limitacao_conhecida",
    motivo: "hiato de fronteira de prefixo/morfema (re- + união), não recuperável localmente",
  },
  {
    palavra: "ideia",
    real: 3,
    estado: "limitacao_conhecida",
    motivo: "terceira vogal de uma cadeia de 3 (e-i-a) funde com o ditongo anterior",
  },

  // --- terminações frequentes ---
  { palavra: "nação", real: 2, estado: "correto" },
  { palavra: "profissão", real: 3, estado: "correto" },
  { palavra: "claramente", real: 4, estado: "correto" },
  { palavra: "cidade", real: 3, estado: "correto" },
  { palavra: "dinheiro", real: 3, estado: "correto" },
  { palavra: "família", real: 3, estado: "correto" }, // fa-mí-lia
  { palavra: "rádio", real: 2, estado: "correto" }, // rá-dio

  // --- ão / ãe / õe ---
  { palavra: "não", real: 1, estado: "correto" },
  { palavra: "mãe", real: 1, estado: "correto" },
  { palavra: "põe", real: 1, estado: "correto" },

  // --- hifenizadas e apóstrofo ---
  { palavra: "guarda-chuva", real: 4, estado: "correto" },
  { palavra: "arco-íris", real: 4, estado: "correto" },
  { palavra: "d'água", real: 2, estado: "correto" },

  // --- siglas pronunciáveis vs. soletradas ---
  { palavra: "ONU", real: 2, estado: "correto" },
  { palavra: "E.U.A", real: 3, estado: "correto" },
  { palavra: "CPF", real: 3, estado: "correto" },
  { palavra: "FGTS", real: 4, estado: "correto" },
  { palavra: "RG", real: 2, estado: "correto" },
  {
    palavra: "INSS",
    real: 4, // convenção soletrada: i-ene-esse-esse, 1 por letra
    estado: "limitacao_conhecida",
    motivo: "sigla com vogal, mas convencionalmente soletrada na fala — indistinguível de ONU/PIB pela grafia",
  },
];
