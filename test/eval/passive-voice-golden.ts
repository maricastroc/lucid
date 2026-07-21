/**
 * Conjunto de avaliação de `passiveVoicePass` — SEPARADO dos testes unitários
 * (`test/passive-voice.test.ts`). Cada entrada traz `expectedCount`: quantas
 * construções passivas analíticas um leitor humano reconheceria no texto — não o que
 * o pass produz.
 *
 * Regra de honestidade (mesma de `test/eval/silabas-golden.ts`): entradas com
 * `estado: "limitacao_conhecida"` documentam um erro aceito (falso positivo ou falso
 * negativo), não o comportamento esperado. `passive-voice-eval.test.ts` NUNCA usa
 * essas entradas para afirmar que o pass acertou.
 */
export interface EntradaGolden {
  texto: string;
  expectedCount: number;
  estado: "correto" | "limitacao_conhecida";
  motivo?: string;
}

export const GOLDEN_VOZ_PASSIVA: readonly EntradaGolden[] = [
  // --- positivos com agente explícito ---
  { texto: "O pedido foi aprovado pelo diretor.", expectedCount: 1, estado: "correto" },
  { texto: "A proposta foi rejeitada pela comissão.", expectedCount: 1, estado: "correto" },
  { texto: "Os relatórios foram entregues pelos servidores.", expectedCount: 1, estado: "correto" },
  { texto: "As contas foram analisadas pelas auditoras.", expectedCount: 1, estado: "correto" },
  { texto: "O contrato foi assinado pelo presidente da empresa.", expectedCount: 1, estado: "correto" },
  { texto: "A decisão foi tomada pela diretoria.", expectedCount: 1, estado: "correto" },
  { texto: "O texto foi revisado pela equipe editorial.", expectedCount: 1, estado: "correto" },
  { texto: "Os documentos serão avaliados pela comissão técnica.", expectedCount: 1, estado: "correto" },
  { texto: "A luz foi acesa pelo zelador.", expectedCount: 1, estado: "correto" },

  // --- positivos com agente omitido ---
  { texto: "O pedido foi aprovado.", expectedCount: 1, estado: "correto" },
  { texto: "A lei foi sancionada.", expectedCount: 1, estado: "correto" },
  { texto: "Os pedidos foram rapidamente aprovados.", expectedCount: 1, estado: "correto" },
  { texto: "O relatório não foi entregue.", expectedCount: 1, estado: "correto" },
  { texto: "As portas serão fechadas às dezoito horas.", expectedCount: 1, estado: "correto" },
  { texto: "O projeto vai ser analisado.", expectedCount: 1, estado: "correto" },
  { texto: "O réu foi condenado.", expectedCount: 1, estado: "correto" },
  { texto: "A candidatura foi indeferida.", expectedCount: 1, estado: "correto" },
  { texto: "O prazo foi dado ontem.", expectedCount: 1, estado: "correto" },
  { texto: "O documento tinha sido arquivado.", expectedCount: 1, estado: "correto" },
  { texto: "O edifício foi construído em dois anos.", expectedCount: 1, estado: "correto" },
  { texto: "O pedido foi aprovado por unanimidade.", expectedCount: 1, estado: "correto" }, // "por" isolado não conta como agente, mas ainda é passiva
  { texto: "O pedido foi aprovado pelo menos em parte.", expectedCount: 1, estado: "correto" }, // idioma "pelo menos" não é agente, mas ainda é passiva

  // --- múltiplas passivas no mesmo texto ---
  { texto: "O pedido foi aprovado. A proposta foi rejeitada pela comissão.", expectedCount: 2, estado: "correto" },
  { texto: "O texto foi aprovado, mas o outro foi rejeitado.", expectedCount: 2, estado: "correto" },
  { texto: "Foi anunciado que o projeto seria revisado.", expectedCount: 2, estado: "correto" },

  // --- negativos: voz ativa ---
  { texto: "O diretor aprovou o pedido.", expectedCount: 0, estado: "correto" },
  { texto: "A comissão rejeitou a proposta.", expectedCount: 0, estado: "correto" },
  { texto: "Os servidores entregaram os relatórios.", expectedCount: 0, estado: "correto" },
  { texto: "Ela escreveu o relatório rapidamente.", expectedCount: 0, estado: "correto" },
  { texto: "O comitê analisou os dados com cuidado.", expectedCount: 0, estado: "correto" },

  // --- negativos: estar/ficar (fora de escopo) ---
  { texto: "A porta está fechada.", expectedCount: 0, estado: "correto" },
  { texto: "O prédio ficou destruído.", expectedCount: 0, estado: "correto" },
  { texto: "As contas estão pagas.", expectedCount: 0, estado: "correto" },

  // --- negativos: substantivo lexicalizado ---
  { texto: "O problema foi resultado de vários fatores.", expectedCount: 0, estado: "correto" },
  { texto: "Isso foi pedido dela.", expectedCount: 0, estado: "correto" },
  { texto: "O documento foi estado da arte na época.", expectedCount: 0, estado: "correto" },
  { texto: "Isso foi achado interessante.", expectedCount: 0, estado: "correto" },

  // --- negativos: adjetivo predicativo ambíguo ---
  { texto: "Ela é dedicada ao trabalho.", expectedCount: 0, estado: "correto" },
  { texto: "Ele é interessado no assunto.", expectedCount: 0, estado: "correto" },
  { texto: "Ela é casada.", expectedCount: 0, estado: "correto" },
  { texto: "Ele é formado em Direito.", expectedCount: 0, estado: "correto" },

  // --- negativos: nenhum particípio de fato ---
  { texto: "Foi quando ele chegou atrasado.", expectedCount: 0, estado: "correto" },
  { texto: "Isso foi muito importante para todos.", expectedCount: 0, estado: "correto" },

  // --- limitações conhecidas: falso negativo por barreira de vírgula ---
  {
    texto: "O pedido foi, segundo consta, aprovado pela diretoria.",
    expectedCount: 1,
    estado: "limitacao_conhecida",
    motivo: "vírgula entre auxiliar e particípio aborta a busca por design (precisão > recall)",
  },
  {
    texto: "A lei foi, após muitos debates, finalmente aprovada.",
    expectedCount: 1,
    estado: "limitacao_conhecida",
    motivo: "mesma barreira de pontuação — falso negativo aceito",
  },

  // 'envolvido' foi para participios-ambiguos.pt.json (mesma classe de dedicado/
  // interessado/apaixonado — adjetivo de estado relacional) após ser encontrado por
  // esta avaliação; ver docs/DECISOES.md (ADR-006) sobre por que essa regra generaliza.
  { texto: "Ele foi envolvido no escândalo.", expectedCount: 0, estado: "correto" },
];
