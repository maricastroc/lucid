/**
 * Conjunto de avaliação de `jargonPass` — SEPARADO dos testes unitários
 * (`test/jargon.test.ts`, exemplos não idênticos). Mesmo padrão de
 * `nominalization-golden.ts`/`passive-voice-golden.ts`.
 *
 * `expectSuggestion`/`expectedSuggestion` medem a métrica prioritária do pedido: uma
 * sugestão emitida quando não deveria (ou com texto errado) é "sugestão insegura" —
 * categoria separada de FP/FN de detecção, e a única que deve ser zero. `mustNotFire`
 * marca entradas cuja métrica prioritária é diferente: nenhum finding pode aparecer
 * (texto comum, palavra rara não cadastrada, termo polissêmico, nome próprio) — usado
 * pelo relatório para separar "findings sobre termos não cadastrados" (deve ser zero)
 * de FN genuíno.
 */
export interface EntradaGolden {
  texto: string;
  expectedCount: number;
  /** só relevante quando expectedCount === 1 */
  expectSuggestion?: boolean;
  expectedSuggestion?: string;
  /** true = este exemplo existe para provar que NADA deveria disparar aqui */
  mustNotFire?: boolean;
  categoria:
    | "administrativo"
    | "juridico"
    | "comum_sem_jargao"
    | "palavra_rara_nao_cadastrada"
    | "termo_polissemico"
    | "nome_proprio"
    | "multipalavra"
    | "variacao_de_caixa"
    | "sugestao_segura"
    | "sem_sugestao";
  estado: "correto" | "limitacao_conhecida";
  motivo?: string;
}

export const GOLDEN_JARGAO: readonly EntradaGolden[] = [
  // --- texto administrativo, com jargão ---
  { texto: "O servidor faz jus a auxílio-alimentação a partir da posse.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "tem direito a", categoria: "administrativo", estado: "correto" },
  { texto: "Os aposentados fazem jus a reajuste anual.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "têm direito a", categoria: "administrativo", estado: "correto" },
  { texto: "O requerente fará jus a restituição em até 30 dias.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "terá direito a", categoria: "administrativo", estado: "correto" },

  // --- texto jurídico, com jargão ---
  { texto: "O documento supracitado foi juntado aos autos do processo.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "citado acima", categoria: "juridico", estado: "correto" },
  { texto: "A decisão supramencionada transitou em julgado.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "mencionada acima", categoria: "juridico", estado: "correto" },
  { texto: "O recurso foi interposto em sede de apelação.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "no âmbito de", categoria: "juridico", estado: "correto" },
  { texto: "A cláusula vale sem prejuízo de eventual multa contratual.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "além de", categoria: "juridico", estado: "correto" },
  { texto: "Doravante, os prazos processuais serão contados em dias úteis.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "a partir de agora", categoria: "juridico", estado: "correto" },
  { texto: "O réu foi absolvido. Outrossim, as custas foram revertidas.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "além disso", categoria: "juridico", estado: "correto" },
  { texto: "Na hipótese de inadimplemento, aplica-se a cláusula penal.", expectedCount: 1, expectSuggestion: false, categoria: "juridico", estado: "correto" },
  { texto: "De acordo com o disposto no contrato, o prazo é de 30 dias.", expectedCount: 1, expectSuggestion: false, categoria: "juridico", estado: "correto" },

  // --- texto comum, sem jargão ---
  { texto: "O gato subiu no telhado e depois desceu correndo.", expectedCount: 0, mustNotFire: true, categoria: "comum_sem_jargao", estado: "correto" },
  { texto: "Choveu bastante ontem à tarde, então ficamos em casa.", expectedCount: 0, mustNotFire: true, categoria: "comum_sem_jargao", estado: "correto" },
  { texto: "Ela comprou pão, leite e frutas no mercado.", expectedCount: 0, mustNotFire: true, categoria: "comum_sem_jargao", estado: "correto" },

  // --- palavra rara, mas não cadastrada (sem heurística de raridade) ---
  { texto: "O paquiderme observava o ornitorrinco com curiosidade.", expectedCount: 0, mustNotFire: true, categoria: "palavra_rara_nao_cadastrada", estado: "correto" },
  { texto: "A antropomorfização de animais é comum em fábulas.", expectedCount: 0, mustNotFire: true, categoria: "palavra_rara_nao_cadastrada", estado: "correto" },

  // --- termo polissêmico, deliberadamente não cadastrado como unigrama ---
  { texto: "A palavra começa com uma consoante.", expectedCount: 0, mustNotFire: true, categoria: "termo_polissemico", estado: "correto" },
  { texto: "Consoante o disposto no edital, o prazo é de 10 dias.", expectedCount: 0, mustNotFire: true, categoria: "termo_polissemico", estado: "correto" },
  { texto: "A empresa tem sede em São Paulo.", expectedCount: 0, mustNotFire: true, categoria: "termo_polissemico", estado: "correto" },

  // --- nome próprio (heurística conservadora de maiúscula em meio de frase) ---
  { texto: "Ele contou que, Outrossim, era o apelido do avô.", expectedCount: 0, mustNotFire: true, categoria: "nome_proprio", estado: "correto" },

  // --- expressões multipalavra ---
  { texto: "O benefício será concedido a quem fizer jus a ele.", expectedCount: 1, expectSuggestion: false, categoria: "multipalavra", estado: "limitacao_conhecida", motivo: "'fizer jus a' (futuro do subjuntivo) não está entre as 11 formas cadastradas de 'fazer jus a' — recorte deliberado de formas mais frequentes em texto administrativo, não cobertura completa da conjugação" },
  { texto: "Isso ocorreu em sede, de recurso interposto.", expectedCount: 0, mustNotFire: true, categoria: "multipalavra", estado: "correto", motivo: "vírgula quebra a contiguidade exigida entre 'sede' e 'de'" },

  // --- variação de caixa ---
  { texto: "EM SEDE DE recurso, o pedido foi negado.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "no âmbito de", categoria: "variacao_de_caixa", estado: "correto" },
  { texto: "SUPRACITADO é o termo usado no parágrafo anterior.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "citado acima", categoria: "variacao_de_caixa", estado: "correto" },

  // --- sugestão segura ---
  { texto: "É preciso analisar o cancelamento da inscrição do supracitado candidato.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "citado acima", categoria: "sugestao_segura", estado: "correto" },

  // --- sem sugestão (detectado, troca insegura) ---
  { texto: "Na hipótese de que o prazo seja prorrogado, o edital será republicado.", expectedCount: 1, expectSuggestion: false, categoria: "sem_sugestao", estado: "correto", motivo: "'na hipótese de' seguido de oração com 'que' quebraria a gramática se trocado por 'em caso de que' — por isso nunca recebe sugestão, independente do que segue" },
];
