/**
 * Conjunto de avaliação de `nominalizationPass` — SEPARADO dos testes unitários
 * (`test/nominalization.test.ts`, exemplos não idênticos). Mesmo padrão de
 * `passive-voice-golden.ts`/`silabas-golden.ts`.
 *
 * `expectSuggestion`/`expectedSuggestion` medem especificamente a métrica prioritária
 * do pedido: uma sugestão emitida quando não deveria (ou com texto errado) é uma
 * falha grave, contabilizada separadamente de FP/FN de detecção.
 */
export interface EntradaGolden {
  texto: string;
  expectedCount: number;
  /** só relevante quando expectedCount === 1 */
  expectSuggestion?: boolean;
  expectedSuggestion?: string;
  estado: "correto" | "limitacao_conhecida";
  motivo?: string;
}

export const GOLDEN_NOMINALIZACAO: readonly EntradaGolden[] = [
  // --- positivos com sugestão segura ---
  { texto: "É preciso fazer a análise de documentos.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "analisar documentos", estado: "correto" },
  { texto: "É preciso realizar o pagamento da taxa.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "pagar a taxa", estado: "correto" },
  { texto: "É preciso efetuar a solicitação de acesso.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "solicitar acesso", estado: "correto" },
  { texto: "É preciso proceder à verificação dos dados.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "verificar os dados", estado: "correto" },
  { texto: "É preciso fazer a avaliação de riscos.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "avaliar riscos", estado: "correto" },
  { texto: "É preciso promover a aprovação do projeto.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "aprovar o projeto", estado: "correto" },
  { texto: "É preciso fazer a correção dos erros.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "corrigir os erros", estado: "correto" },
  { texto: "É preciso realizar a atualização do sistema.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "atualizar o sistema", estado: "correto" },
  { texto: "É preciso efetuar a publicação do edital.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "publicar o edital", estado: "correto" },
  { texto: "É preciso fazer o cancelamento da inscrição.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "cancelar a inscrição", estado: "correto" },
  { texto: "É preciso realizar o agendamento da consulta.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "agendar a consulta", estado: "correto" },
  { texto: "É preciso fazer a análise.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "analisar", estado: "correto" },
  { texto: "É preciso proceder ao pagamento.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "pagar", estado: "correto" },
  { texto: "É preciso fazer as análises de dados.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "analisar dados", estado: "correto" },
  { texto: "É preciso realizar os pagamentos das taxas.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "pagar as taxas", estado: "correto" },

  // --- forma finita COM conjugação segura (ADR-011): traço indicativo cadastrado ---
  { texto: "O comitê fez a análise de documentos.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "analisou documentos", estado: "correto" },
  { texto: "A equipe realizou o pagamento da taxa.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "pagou a taxa", estado: "correto" },
  { texto: "Eles procederam à verificação dos dados.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "verificaram os dados", estado: "correto" },
  { texto: "A diretoria fará a avaliação dos riscos.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "avaliará os riscos", estado: "correto" },
  { texto: "O órgão realizava a publicação do edital.", expectedCount: 1, expectSuggestion: true, expectedSuggestion: "publicava o edital", estado: "correto" },

  // --- forma finita SEM sugestão (complemento inseguro, ou traço não cadastrado) ---
  { texto: "A equipe realizará o pagamento da taxa amanhã.", expectedCount: 1, expectSuggestion: false, estado: "correto" },
  { texto: "Eles promovem a avaliação de riscos todo mês.", expectedCount: 1, expectSuggestion: false, estado: "correto" },
  { texto: "O comitê faria a análise dos dados.", expectedCount: 1, expectSuggestion: false, estado: "correto", motivo: "'faria' é futuro do pretérito — fora dos 8 traços indicativos cadastrados na tabela fechada (ADR-011)" },
  { texto: "É bom que façam a análise de riscos.", expectedCount: 1, expectSuggestion: false, estado: "correto", motivo: "'façam' é presente do subjuntivo — não coberto" },

  // --- positivos detectados, sem sugestão (mapeamento não-único) ---
  { texto: "É preciso fazer a revisão do texto.", expectedCount: 1, expectSuggestion: false, estado: "correto" },
  { texto: "É preciso fazer a revisão.", expectedCount: 1, expectSuggestion: false, estado: "correto" },

  // --- positivos detectados, sem sugestão (complemento inseguro) ---
  { texto: "É preciso fazer a análise e o relatório.", expectedCount: 1, expectSuggestion: false, estado: "correto" },
  { texto: "É preciso realizar a análise que pedimos.", expectedCount: 1, expectSuggestion: false, estado: "correto" },
  { texto: "É preciso fazer a análise de dados e sistemas.", expectedCount: 1, expectSuggestion: false, estado: "correto" },
  { texto: "É preciso realizar uma análise detalhada dos processos.", expectedCount: 1, expectSuggestion: false, estado: "correto" },
  { texto: "É preciso fazer a análise, se possível.", expectedCount: 1, expectSuggestion: false, estado: "correto" },

  // --- negativos: verbo leve usado lexicalmente / nominalização fora do dataset ---
  { texto: "Fazer o jantar é relaxante.", expectedCount: 0, estado: "correto" },
  { texto: "Dar um conselho é fácil.", expectedCount: 0, estado: "correto" },
  { texto: "É preciso ter paciência.", expectedCount: 0, estado: "correto" },
  { texto: "A análise ficou pronta ontem.", expectedCount: 0, estado: "correto" },
  { texto: "O pagamento atrasou este mês.", expectedCount: 0, estado: "correto" },
  { texto: "É preciso fazer análise sem determinante antes.", expectedCount: 0, estado: "correto" },
  { texto: "É preciso fazer a formação dos novos servidores.", expectedCount: 0, estado: "correto" },
  { texto: "É preciso fazer a administração do prédio.", expectedCount: 0, estado: "correto" },
  { texto: "É preciso fazer a operação com cuidado.", expectedCount: 0, estado: "correto" },
  { texto: "É preciso fazer a nossa análise.", expectedCount: 0, estado: "correto" },
  { texto: "É preciso fazer a boa análise.", expectedCount: 0, estado: "correto" },

  // --- múltiplas construções no mesmo texto ---
  { texto: "É preciso fazer a análise de documentos. Depois, realizar o pagamento da taxa.", expectedCount: 2, estado: "correto" },

  // --- limitações conhecidas: verbo leve ou regência fora do dataset curado ---
  {
    texto: "É necessário proceder com a análise dos dados.",
    expectedCount: 1,
    estado: "limitacao_conhecida",
    motivo: "'proceder com' é regência alternativa de 'proceder' não cadastrada — só o padrão 'a' (à/ao/às/aos) foi implementado, por ser o único demonstrado nos exemplos do pedido",
  },
  {
    texto: "É preciso dar continuidade ao processo.",
    expectedCount: 1,
    estado: "limitacao_conhecida",
    motivo: "'dar' não está no léxico de verbos leves cadastrados nesta etapa (escopo restrito aos 5 verbos dos exemplos do pedido: fazer/realizar/efetuar/promover/proceder)",
  },
];
