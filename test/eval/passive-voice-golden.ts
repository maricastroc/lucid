export interface EntradaGolden {
  texto: string;
  expectedCount: number;
  estado: "correto" | "limitacao_conhecida";
  motivo?: string;
}

export const GOLDEN_VOZ_PASSIVA: readonly EntradaGolden[] = [
  { texto: "O pedido foi aprovado pelo diretor.", expectedCount: 1, estado: "correto" },
  { texto: "A proposta foi rejeitada pela comissão.", expectedCount: 1, estado: "correto" },
  { texto: "Os relatórios foram entregues pelos servidores.", expectedCount: 1, estado: "correto" },
  { texto: "As contas foram analisadas pelas auditoras.", expectedCount: 1, estado: "correto" },
  { texto: "O contrato foi assinado pelo presidente da empresa.", expectedCount: 1, estado: "correto" },
  { texto: "A decisão foi tomada pela diretoria.", expectedCount: 1, estado: "correto" },
  { texto: "O texto foi revisado pela equipe editorial.", expectedCount: 1, estado: "correto" },
  { texto: "Os documentos serão avaliados pela comissão técnica.", expectedCount: 1, estado: "correto" },
  { texto: "A luz foi acesa pelo zelador.", expectedCount: 1, estado: "correto" },

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
  { texto: "O pedido foi aprovado por unanimidade.", expectedCount: 1, estado: "correto" },
  { texto: "O pedido foi aprovado pelo menos em parte.", expectedCount: 1, estado: "correto" },

  { texto: "O pedido foi aprovado. A proposta foi rejeitada pela comissão.", expectedCount: 2, estado: "correto" },
  { texto: "O texto foi aprovado, mas o outro foi rejeitado.", expectedCount: 2, estado: "correto" },
  { texto: "Foi anunciado que o projeto seria revisado.", expectedCount: 2, estado: "correto" },

  { texto: "O diretor aprovou o pedido.", expectedCount: 0, estado: "correto" },
  { texto: "A comissão rejeitou a proposta.", expectedCount: 0, estado: "correto" },
  { texto: "Os servidores entregaram os relatórios.", expectedCount: 0, estado: "correto" },
  { texto: "Ela escreveu o relatório rapidamente.", expectedCount: 0, estado: "correto" },
  { texto: "O comitê analisou os dados com cuidado.", expectedCount: 0, estado: "correto" },

  { texto: "A porta está fechada.", expectedCount: 0, estado: "correto" },
  { texto: "O prédio ficou destruído.", expectedCount: 0, estado: "correto" },
  { texto: "As contas estão pagas.", expectedCount: 0, estado: "correto" },

  { texto: "O problema foi resultado de vários fatores.", expectedCount: 0, estado: "correto" },
  { texto: "Isso foi pedido dela.", expectedCount: 0, estado: "correto" },
  { texto: "O documento foi estado da arte na época.", expectedCount: 0, estado: "correto" },
  { texto: "Isso foi achado interessante.", expectedCount: 0, estado: "correto" },

  { texto: "Ela é dedicada ao trabalho.", expectedCount: 0, estado: "correto" },
  { texto: "Ele é interessado no assunto.", expectedCount: 0, estado: "correto" },
  { texto: "Ela é casada.", expectedCount: 0, estado: "correto" },
  { texto: "Ele é formado em Direito.", expectedCount: 0, estado: "correto" },

  { texto: "Foi quando ele chegou atrasado.", expectedCount: 0, estado: "correto" },
  { texto: "Isso foi muito importante para todos.", expectedCount: 0, estado: "correto" },

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

  { texto: "Ele foi envolvido no escândalo.", expectedCount: 0, estado: "correto" },

  { texto: "O réu é advogado.", expectedCount: 0, estado: "correto" },
  { texto: "Ele é empregado da empresa.", expectedCount: 0, estado: "correto" },
  { texto: "João é deputado federal.", expectedCount: 0, estado: "correto" },
  { texto: "Ele é soldado do exército.", expectedCount: 0, estado: "correto" },
  { texto: "Ela é delegada de polícia.", expectedCount: 0, estado: "correto" },
  { texto: "Ele é magistrado há dez anos.", expectedCount: 0, estado: "correto" },
];
