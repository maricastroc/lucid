export interface EntradaGolden {
  texto: string;
  expectedCount: number;
  estado: "correto" | "limitacao_conhecida";
  motivo?: string;
}

export const GOLDEN_SIGLA: readonly EntradaGolden[] = [
  { texto: "O INSS negou o pedido.", expectedCount: 1, estado: "correto" },
  { texto: "A ANVISA aprovou o registro.", expectedCount: 1, estado: "correto" },
  { texto: "O IBGE publicou os dados.", expectedCount: 1, estado: "correto" },
  { texto: "Conforme a LGPD, o dado é sensível.", expectedCount: 1, estado: "correto" },
  { texto: "Segundo o STF, a norma é válida.", expectedCount: 1, estado: "correto" },
  { texto: "O TCU julgou as contas.", expectedCount: 1, estado: "correto" },
  { texto: "O DOU trouxe a publicação.", expectedCount: 1, estado: "correto" },
  { texto: "O CNJ e o CNMP assinaram o pacto.", expectedCount: 2, estado: "correto" },

  { texto: "O TCE-PE publicou o manual de redação.", expectedCount: 1, estado: "correto" },
  { texto: "O TJ-SP julgou o recurso.", expectedCount: 1, estado: "correto" },
  { texto: "O código TJDF-AJ consta do anexo.", expectedCount: 1, estado: "correto" },

  {
    texto: "O Instituto Nacional do Seguro Social (INSS) negou o pedido. O INSS informou o prazo.",
    expectedCount: 0,
    estado: "correto",
  },
  {
    texto: "O Tribunal de Contas do Estado (TCE) publicou o manual. O TCE-PE também o adotou.",
    expectedCount: 0,
    estado: "correto",
  },

  { texto: "LEI Nº 7.992, DE 3 DE JANEIRO DE 1990. Esta lei cria cargos de 3 categorias.", expectedCount: 0, estado: "correto" },
  { texto: "TÍTULO I Das disposições gerais. O título trata do prazo de 5 dias.", expectedCount: 0, estado: "correto" },
  { texto: "PRAZO para recurso. O prazo é de dez dias corridos.", expectedCount: 0, estado: "correto" },
  { texto: "MULTA aplicada. A multa vale para o caso de 3 faltas.", expectedCount: 0, estado: "correto" },
  {
    texto: "LEI N o 7.992, DE 3 DE JANEIRO DE 1990. Cria cargos no Quadro.",
    expectedCount: 0,
    estado: "limitacao_conhecida",
    motivo:
      "A-17 — resíduo medido: 3 dos 16 documentos do corpus real. Com o 'Nº' inteiro a guarda de " +
      "vizinhança já resolve ('Nº' conta como palavra em caixa alta e suprime 'LEI'); é a extração " +
      "de HTML que parte 'Nº' em 'N' + 'o' e quebra o sinal. Sem nenhuma ocorrência de 'lei' em " +
      "caixa baixa no mesmo texto, não sobra evidência interna. Fechar exigiria léxico geral do " +
      "português, que o motor não tem por decisão",
  },

  { texto: "O artigo II da Lei e o inciso IV do art. 5º.", expectedCount: 0, estado: "correto" },
  { texto: "O CPF e o CNPJ devem constar do formulário.", expectedCount: 0, estado: "correto" },
  { texto: "A NBR 5410 trata de instalações elétricas de 3 tipos.", expectedCount: 1, estado: "correto" },
  { texto: "A COVID-19 mudou o atendimento de 4 setores.", expectedCount: 0, estado: "correto" },
  { texto: "O código TJDF-AJ-020 consta do anexo desta lei.", expectedCount: 0, estado: "correto" },
  { texto: "MINISTÉRIO DA FAZENDA SECRETARIA DA RECEITA", expectedCount: 0, estado: "correto" },
];
