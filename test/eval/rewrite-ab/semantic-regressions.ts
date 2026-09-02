export type RegressionKind = "reservation_scope" | "invented_obligation" | "category_narrowed" | "invented_addressee";

export interface SemanticRegression {
  readonly id: string;
  readonly target: string;
  readonly arm: string;
  readonly kind: RegressionKind;
  readonly original: string;
  readonly offending: string;
  readonly why: string;
  readonly detectable: boolean;
}

export const SEMANTIC_REGRESSIONS: readonly SemanticRegression[] = [
  {
    id: "l8016-ressalva-invertida",
    target: "planalto-leis__1989-1994-l8016.txt#2059-2437",
    arm: "lucid@v2",
    kind: "reservation_scope",
    original:
      "§ 2° Na programação orçamentária dos excessos de arrecadação de 1990, priorizar-se-á dotação para o " +
      "pagamento da correção monetária dos recursos a que se refere este artigo, a ser calculada com base na " +
      "variação mensal do valor do Bônus do Tesouro Nacional, a partir da data da classificação da receita, " +
      "ressalvada a prioridade dos pagamentos de pessoal e dos serviços da dívida.",
    offending: "Esta prioridade não vale para os pagamentos de pessoal e dos serviços da dívida.",
    why:
      "«ressalvada a prioridade dos pagamentos de pessoal» diz que esses pagamentos CONTINUAM tendo " +
      "prioridade. A reescrita diz que a prioridade não vale para eles, o que troca quem vem primeiro.",
    detectable: false,
  },
  {
    id: "l8013-descricao-virou-dever",
    target: "planalto-leis__1989-1994-l8013.txt#844-1221",
    arm: "lucid@v2",
    kind: "invented_obligation",
    original:
      "Art. 7º Os saldos credores das concessionárias de serviços públicos de energia elétrica, decorrentes de " +
      "insuficiências de remuneração registradas em Conta de Resultados a Compensar, existentes em 31 de " +
      "dezembro de 1989, serão aqueles aprovados pelo DNAEE, de acordo com os critérios previstos na " +
      "legislação em vigor, para fins de compensação definida neste instrumento legal.",
    offending: "O Departamento Nacional de Águas e Energia Elétrica (DNAEE) deve aprovar os saldos.",
    why:
      "O original descreve quais saldos valem — os aprovados pelo DNAEE. A reescrita impõe ao DNAEE um dever " +
      "de aprovar que a norma não cria.",
    detectable: true,
  },
  {
    id: "l8013-categoria-encolhida",
    target: "planalto-leis__1989-1994-l8013.txt#844-1221",
    arm: "lucid@v2",
    kind: "category_narrowed",
    original: "Os saldos credores das concessionárias de serviços públicos de energia elétrica",
    offending: "Os saldos credores das empresas de energia elétrica",
    why:
      "«concessionária de serviço público» é categoria jurídica com regime próprio. «Empresa de energia " +
      "elétrica» abrange quem não é concessionária e muda quem está dentro da regra.",
    detectable: true,
  },
  {
    id: "l8026-descricao-virou-dever",
    target: "planalto-leis__1989-1994-l8026.txt#821-1182",
    arm: "lucid@v2",
    kind: "invented_obligation",
    original:
      "Art. 2º O processo administrativo para apuração da responsabilidade pela ação ou omissão a que se " +
      "refere o art. 1º será instaurado mediante ato do Ministro de Estado a que estiver subordinado o " +
      "funcionário",
    offending: "O Ministro de Estado a quem o funcionário estiver subordinado deve abrir o processo administrativo.",
    why:
      "O original descreve por qual ato o processo começa. A reescrita cria um dever do Ministro de abrir o " +
      "processo.",
    detectable: true,
  },
  {
    id: "l7999-interlocutor-inventado",
    target: "planalto-leis__1989-1994-l7999.txt#2825-3097",
    arm: "lucid@v1",
    kind: "invented_addressee",
    original:
      "§ 2º Na atualização a que se refere o parágrafo anterior, as receitas decorrentes de Operações de " +
      "Crédito serão reajustadas, observando-se o estabelecido no artigo 23 da Lei nº 7.800, de 10 de julho " +
      "de 1989",
    offending: "Ao atualizar as receitas de Operações de Crédito, siga o que está no artigo 23 da Lei nº 7.800",
    why:
      "O texto é impessoal e não se dirige a ninguém. O imperativo «siga» inventa um destinatário e transforma " +
      "a descrição de um procedimento numa instrução.",
    detectable: false,
  },
  {
    id: "l8000-modalidade-endurecida",
    target: "planalto-leis__1989-1994-l8000.txt#6934-7435",
    arm: "lucid@v1",
    kind: "reservation_scope",
    original: "o que, sem prejuízo das sanções penais cabíveis e da exigência do tributo dispensado",
    offending: "Isso causará sanções penais e a cobrança do imposto que foi dispensado",
    why:
      "«sem prejuízo de» diz que as sanções continuam de pé ALÉM do efeito descrito. A reescrita as apresenta " +
      "como consequência causada por ele, o que afirma mais do que a norma.",
    detectable: false,
  },
];

export const detectableRegressions = (): readonly SemanticRegression[] =>
  SEMANTIC_REGRESSIONS.filter((r) => r.detectable);

export const declaredUndetectable = (): readonly SemanticRegression[] =>
  SEMANTIC_REGRESSIONS.filter((r) => !r.detectable);
