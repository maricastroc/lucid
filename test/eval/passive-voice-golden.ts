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

  { texto: "O documento foi assinado pela manhã.", expectedCount: 1, estado: "correto" },
  { texto: "O carro foi visto pela janela.", expectedCount: 1, estado: "correto" },
  { texto: "A obra foi concluída pela metade.", expectedCount: 1, estado: "correto" },

  { texto: "O prazo é válido.", expectedCount: 0, estado: "correto" },
  { texto: "O carro é rápido.", expectedCount: 0, estado: "correto" },
  { texto: "O material é sólido.", expectedCount: 0, estado: "correto" },
  { texto: "O ar é úmido.", expectedCount: 0, estado: "correto" },
  { texto: "O texto é lúcido.", expectedCount: 0, estado: "correto" },
  { texto: "A regra é rígida.", expectedCount: 0, estado: "correto" },
  { texto: "O resultado é válido, mas o prazo é rígido.", expectedCount: 0, estado: "correto" },

  { texto: "O documento foi distribuído pela secretaria.", expectedCount: 1, estado: "correto" },
  { texto: "O gráfico foi construído com dados de 2020.", expectedCount: 1, estado: "correto" },

  { texto: "O servidor é qualificado para a função.", expectedCount: 0, estado: "correto" },
  { texto: "A equipe é qualificada.", expectedCount: 0, estado: "correto" },
  { texto: "Os candidatos são qualificados.", expectedCount: 0, estado: "correto" },
  { texto: "O procedimento é complicado.", expectedCount: 0, estado: "correto" },
  { texto: "A regra é conhecida de todos.", expectedCount: 0, estado: "correto" },
  { texto: "O prazo é adequado ao caso.", expectedCount: 0, estado: "correto" },
  { texto: "A sala é reservada aos servidores.", expectedCount: 0, estado: "correto" },
  { texto: "A resposta é limitada ao pedido.", expectedCount: 0, estado: "correto" },
  { texto: "O caso é isolado.", expectedCount: 0, estado: "correto" },
  { texto: "O servidor é aposentado.", expectedCount: 0, estado: "correto" },
  { texto: "A empresa é privada.", expectedCount: 0, estado: "correto" },
  { texto: "O valor é elevado.", expectedCount: 0, estado: "correto" },
  { texto: "O risco é reduzido.", expectedCount: 0, estado: "correto" },
  { texto: "A informação é detalhada.", expectedCount: 0, estado: "correto" },
  { texto: "O sistema é integrado.", expectedCount: 0, estado: "correto" },
  { texto: "O processo é digitalizado.", expectedCount: 0, estado: "correto" },
  { texto: "O terreno é murado.", expectedCount: 0, estado: "correto" },
  { texto: "A decisão é motivada.", expectedCount: 0, estado: "correto" },
  { texto: "O relatório é fundamentado.", expectedCount: 0, estado: "correto" },
  { texto: "A conduta é reiterada.", expectedCount: 0, estado: "correto" },
  { texto: "O documento é datado de ontem.", expectedCount: 0, estado: "correto" },

  { texto: "O servidor é muito qualificado.", expectedCount: 0, estado: "correto" },
  { texto: "O servidor é bastante qualificado.", expectedCount: 0, estado: "correto" },
  { texto: "O servidor é pouco qualificado.", expectedCount: 0, estado: "correto" },
  { texto: "O servidor é altamente qualificado.", expectedCount: 0, estado: "correto" },
  { texto: "O servidor é mais qualificado que o outro.", expectedCount: 0, estado: "correto" },
  { texto: "O prazo é razoavelmente adequado.", expectedCount: 0, estado: "correto" },

  { texto: "Art. 4º São criadas, na Tabela de Gratificação, as funções de assessoramento.", expectedCount: 1, estado: "correto" },
  { texto: "Art. 1º É incluída, no Quadro de Pessoal, a categoria funcional de analista.", expectedCount: 1, estado: "correto" },
  { texto: "Art. 19. É vedada o início de qualquer projeto novo até 31 de março.", expectedCount: 1, estado: "correto" },
  { texto: "§ 2º É assegurada a manutenção do crédito do imposto.", expectedCount: 1, estado: "correto" },
  { texto: "Art. 1º É transferida para a Secretaria a competência de administração.", expectedCount: 1, estado: "correto" },
  { texto: "São criados, no Quadro Permanente, os cargos em comissão.", expectedCount: 1, estado: "correto" },

  {
    texto: "O benefício é concedido após a análise.",
    expectedCount: 1,
    estado: "limitacao_conhecida",
    motivo: "A-13 — presente sem agente com sujeito anteposto: indistinguível de predicativo adjetival",
  },
  {
    texto: "O prazo é contado em dias úteis.",
    expectedCount: 1,
    estado: "limitacao_conhecida",
    motivo: "A-13 — presente sem agente com sujeito anteposto: indistinguível de predicativo adjetival",
  },
  {
    texto: "A multa é aplicada ao infrator.",
    expectedCount: 1,
    estado: "limitacao_conhecida",
    motivo: "A-13 — presente sem agente com sujeito anteposto: indistinguível de predicativo adjetival",
  },
  {
    texto: "O edital é publicado no diário oficial.",
    expectedCount: 1,
    estado: "limitacao_conhecida",
    motivo: "A-13 — presente sem agente com sujeito anteposto: indistinguível de predicativo adjetival",
  },
  {
    texto: "Os autos são remetidos ao arquivo.",
    expectedCount: 1,
    estado: "limitacao_conhecida",
    motivo: "A-13 — presente sem agente com sujeito anteposto: indistinguível de predicativo adjetival",
  },
  {
    texto: "Para atendimento da nova composição do Tribunal são criados os cargos em comissão.",
    expectedCount: 1,
    estado: "limitacao_conhecida",
    motivo:
      "A-13 — sintagma preposicionado inicial não é sujeito, mas separá-lo de um sujeito real exige " +
      "análise sintática; o detector lê 'Para' como material pré-verbal e cala",
  },
];
