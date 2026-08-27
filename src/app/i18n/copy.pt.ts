import type { UiCopy } from "./copy";

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

export const COPY_PT: UiCopy = {
  common: {
    close: "Fechar",
    cancel: "Cancelar",
    restore: "Restaurar",
    add: "Adicionar",
    remove: "remover",
    copy: "Copiar",
    copied: "Copiado",
    words: "palavras",
    engineOutputSuffix: "",
  },

  language: {
    ariaLabel: "Idioma da interface",
    short: { "pt-BR": "PT", en: "EN" },
    switchTo: { "pt-BR": "Mudar a interface para português", en: "Switch the interface to English" },
  },

  masthead: {
    home: "Voltar ao início",
    tagline: "Auditor de linguagem simples",
    openDocx: "Abrir .docx",
    opening: "Abrindo…",
    evaluation: "Avaliação",
    workMode: "Modo de trabalho",
    review: "Revisar",
    write: "Escrever",
    darkTheme: "Ativar tema escuro",
    lightTheme: "Ativar tema claro",
  },

  welcome: {
    regionLabel: "Apresentação do Lucid",
    kicker: "Auditor de Linguagem Simples",
    titleLead: "Lucid audita a clareza do seu texto.",
    titleTrail: "Não reescreve por você.",
    lead:
      "Ele confronta cada trecho com os princípios de Linguagem Simples da norma ABNT: mostra o que trava o leitor, " +
      "cita o critério que disparou e explica o porquê.",
    leadStrong: "A palavra final é sempre sua.",
    doesLabel: "O que ele faz",
    verbs: ["Analisa", "Detecta", "Explica", "Pergunta", "Verifica"],
    doesNotBefore: "O que ele ",
    doesNotStrong: "não",
    doesNotAfter: " faz: escrever o texto no seu lugar.",
    write: "Escrever ou colar texto",
    loadExample: "Carregar exemplo",
    anatomyLabel: "Cada trecho vira uma anotação assim",
    cardCriterion: {
      title: "O critério que disparou",
      body: "Voz passiva, jargão, frase longa, nominalização — cada um ligado a um princípio da norma.",
    },
    cardWhy: {
      title: "Por que trava o leitor",
      body: "A justificativa em português claro, e o trecho exato marcado no documento.",
    },
    cardWhat: {
      title: "O que fazer com isso",
      body: "Uma decisão honesta sobre quem resolve.",
    },
    outcomeSafe: "Troca direta indicada",
    outcomeHuman: "Decisão sua",
    footerDeterministic: "Análise 100% determinística",
    footerSameInput: "Mesmo texto, mesmo resultado",
    footerNoCloud: "Sem nuvem, sem reescrita automática",
  },

  studio: {
    goHome: {
      title: "Voltar ao início?",
      body: "O texto em revisão e a trilha de alterações serão descartados. Esta ação não pode ser desfeita — exporte o relatório antes se quiser guardar a auditoria.",
      confirm: "Descartar e voltar",
    },
    structureLost:
      "A edição mudou o documento além do que a estrutura importada acompanha. Títulos e listas deixaram de ser " +
      "reconhecidos, então os critérios do Princípio 2 não estão sendo aplicados a partir daqui.",
    saveFailed:
      "Não foi possível salvar este trabalho no navegador — ele será perdido se você fechar a aba. Exporte o " +
      "relatório para não depender disto.",
    importRefusal: {
      unreadable: "Não foi possível ler o arquivo. Confirme que é um .docx válido.",
      tracked_changes:
        "Este arquivo tem alterações rastreadas ainda não resolvidas. Enquanto elas existirem, o próprio " +
        "arquivo não diz qual é o seu texto — auditar aqui seria auditar uma versão que ninguém aprovou. " +
        "Aceite ou rejeite as alterações no editor e importe de novo.",
      no_readable_content:
        "Este arquivo não tem conteúdo legível para auditar. Não é um documento limpo: é um documento vazio.",
    },
    revisions: (n) => `${n} ${plural(n, "revisão", "revisões")}`,
    changeApplied: "Alteração aplicada ao texto.",
    undo: "Desfazer",
  },

  overview: {
    annotations: (n) => plural(n, "ponto para revisar", "pontos para revisar"),
    adjustedProfileBefore: "Placar produzido com ",
    adjustedProfileStrong: "perfil ajustado",
    adjustedProfile: (deviations, disabled) =>
      `${deviations} ${plural(deviations, "desvio", "desvios")} do padrão` +
      (disabled > 0 ? `, ${disabled} ${plural(disabled, "critério desligado", "critérios desligados")}` : ""),
    adjustedProfileAfter: "Não é comparável a um placar padrão.",
    splitAriaLabel: (safe, human) => `${safe} de troca direta, ${human} exigem decisão humana`,
    legendSafe: "troca direta indicada",
    legendHuman: "decisão do autor",
    exportAudit: "Baixar auditoria (.md)",
    exportDocx: "Baixar texto revisado (.docx)",
    exportTxt: "Baixar texto (.txt)",
    docxError: "Não foi possível gerar o .docx. Use a exportação em .txt.",
    docxNote:
      "O arquivo .docx contém o texto revisado, mas não preserva a formatação original, como negrito, " +
      "tabelas, imagens e cabeçalhos.",
    importTables: (n: number) => `${n} ${n === 1 ? "tabela achatada" : "tabelas achatadas"}`,
    importTextBoxes: (n: number) => `${n} ${n === 1 ? "caixa de texto embutida" : "caixas de texto embutidas"}`,
    importAnd: " e ",
    importRecovered: (styles: string) =>
      `Reconhecemos os títulos do arquivo (${styles}). Sem isso, eles entrariam como parágrafo comum.`,
    importFlattened: (what: string) =>
      `${what} viraram parágrafos. O conteúdo entra na auditoria, mas a disposição original não.`,
    structureMissing: { heading: "títulos", list: "listas" } as Record<string, string>,
    structureMissingJoin: " nem ",
    structureCaveat: (missing: string, count: number) =>
      `Não encontramos ${missing} neste documento. Por isso, ${count} ` +
      `${plural(count, "critério não pôde", "critérios não puderam")} ser ` +
      `${plural(count, "avaliado", "avaliados")}. ` +
      "Para incluí-los na auditoria, envie um arquivo .docx com essa estrutura ou use # para títulos e " +
      "- para itens de lista.",
    scoreCaveat:
      "O placar resume os critérios avaliados. Ele não aprova o documento nem garante que o texto esteja claro.",
    lexiconCaveat:
      "Alguns critérios verificam padrões específicos, como jargões, nominalizações e redundâncias. Eles ajudam " +
      "na revisão, mas não substituem a análise de quem escreveu.",
    readingLabel: "Leitura",
    readingCaveat:
      "Os indicadores de legibilidade e coesão ajudam na revisão, mas não determinam sozinhos se o texto está claro.",
    trailLabel: "Trilha de revisão",
    trailWeight: (before, after, changes) =>
      `Peso da auditoria ${before} → ${after} · ${changes} ${plural(changes, "alteração", "alterações")}`,
    trailCaveat:
      "Registro do que foi feito nesta sessão — não é atestado de qualidade. Vai no relatório exportado.",
    descriptor: "descritor",
    metricWords: "Palavras",
    metricSentences: "Frases",
    metricWordsPerSentence: "Palavras por frase",
    metricReadability: "Legibilidade",
    metricReferentialCohesion: "Coesão referencial",
    metricAdjacentGap: "Pares sem continuidade",
    metricConnectives: "Conectivos /100 palavras",
  },

  revisionList: {
    regionLabel: "Índice da auditoria",
    title: "Índice da auditoria",
    bySeverity: "por gravidade",
    filterLabel: "Filtrar anotações",
    bucketAll: "Todas",
    bucketSafe: "Troca direta",
    bucketHuman: "Decisão sua",
    empty: "Nenhuma anotação disparada.",
    emptyInFilter: "Nenhuma anotação neste filtro.",
    hideInDocument: "Ocultar no documento",
    hideNamed: (label) => `Ocultar “${label}” no documento`,
    showInDocument: "Mostrar no documento",
    showNamed: (label) => `Mostrar “${label}” no documento`,
    coverage: "Cobertura",
    cleanCriteria: (n) =>
      `${n} ${plural(n, "critério verificado, sem ocorrência", "critérios verificados, sem ocorrência")}`,
    hiddenCriteria: (n) => `${n} ${plural(n, "oculto", "ocultos")}`,
    absenceCaveat: "A ausência de anotações não é atestado de clareza — é a cobertura da auditoria.",
  },

  badges: {
    safeShort: "Troca direta",
    safeLong: "Troca direta indicada",
    humanShort: "Decisão sua",
    humanLong: "Exige decisão humana",
  },

  note: {
    excerpt: "Trecho",
    whatWeFound: "O que encontramos",
    whyItMatters: "Por que afeta a clareza",
    engineOutput: "Saída da engine · pt-BR",
    engineOutputHint:
      "A justificativa vem do motor de análise, que audita português — ela não é traduzida junto com a interface.",
    navPrev: "Anterior (k)",
    navNext: "Próximo (j)",
    navOf: "de",
    panelLabel: "Auditoria",
    footerDeterministic: "Análise determinística",

    safeHeader: "Troca direta · equivalente curado",
    safeTerm: "Termo",
    safePlain: "Comum",
    safeEquivalent: "equivalente 1:1 do glossário",
    safeNote:
      "A ferramenta indica o equivalente; ela não altera o texto. Faça a troca em “Editar ou colar minha versão” " +
      "abaixo — a engine re-audita o resultado.",

    humanHeader: "Exige decisão humana",
    humanLead:
      "A ferramenta identificou a construção, mas não existe reescrita segura sem conhecer a intenção do autor — " +
      "então ela prefere ",
    humanLeadStrong: "apontar a inventar",
    howToProceed: "Como seguir",

    manualOpen: "Editar ou colar minha versão",
    manualTitle: "Sua versão",
    manualUnitSentence: "esta frase",
    manualUnitParagraph: "este parágrafo",
    manualEditAria: (unit) => `Editar ${unit}`,
    manualVerify: "Verificar minha versão",
    manualVerifying: "Verificando…",
    manualNote:
      "Você escreve ou cola; a engine julga a sua versão com as mesmas provas da IA — nenhuma fonte é privilegiada. " +
      "Aplicar vira um rascunho e a engine re-audita.",

    aiTitle: "Reescrita por IA",
    aiLead: "Uma das formas de propor uma nova versão — a IA reescreve; você também pode ",
    aiLeadStrongYours: "editar ou colar a sua",
    aiLeadMiddle: ". A engine julga qualquer uma delas do mesmo jeito. Opcional: o ",
    aiLeadStrongDiagnostic: "diagnóstico acima não depende disto",
    aiTarget: (unit) => `A IA vai reescrever ${unit} (destacada no documento).`,
    aiModelLabel: "Modelo gerador",
    modelNoteStrongGenerator: "gerador forte",
    modelNotePaid: "pago, ~$0,14/1M",
    proposerManual: "sua edição",
    aiRun: "Gerar e verificar",
    aiRunning: "Gerando e verificando…",
    aiFailed: (message) => `Não deu para gerar: ${message}`,
    aiFailedGeneric: "falha ao gerar a reescrita",
    aiNoProposal:
      "O modelo não devolveu uma reescrita diferente do trecho — nada a propor. O verificador não fabrica uma; a " +
      "decisão continua sua.",

    verdictLabel: "A engine verificou",
    verdictProofs: (passed, total) => `${passed}/${total} provas`,
    verdictBlocked: "Uma prova falhou — a ferramenta não atesta este trecho.",
    verdictClear: "Nenhuma falha encontrada neste trecho.",
    verdictWords: "palavras",
    verdictMeasureNotApproval: "medição, não aprovação",
    proofLabel: "Prova · determinística",
    signalLabel: "Sinal · heurístico (não é prova)",
    evaluatedExcerpt: "Trecho avaliado",
    proposerTitle: "modelo + versão do prompt",
    applyStale: "Trecho mudou — gere de novo",
    applyBlocked: "Usar mesmo assim como rascunho",
    apply: "Usar como rascunho",
    applyStaleNote:
      "O trecho foi editado depois que esta versão foi gerada. Para não perder sua edição, gere de novo antes de aplicar.",
    applyBlockedNote: "Se você entende o motivo acima e ainda quer, aplique como rascunho — a engine re-audita.",
    applyNote: "Reveja antes de usar — a decisão de aplicar é sua.",
  },

  guidance: {
    generic:
      "A ferramenta apontou a construção, mas a correção depende de julgamento seu — ela não reescreve por conta própria.",
    passivaSintetica:
      "O “se” esconde quem age. Se quiser deixar o agente claro, reescreva com sujeito explícito (“a multa é aplicada " +
      "pelo órgão” ou “o órgão aplica a multa”). Se o “se” for reflexivo, ignore — só você sabe qual é o caso.",
    nominalizacaoEncadeada:
      "Procure o verbo escondido no substantivo e devolva a ação a ele (“a verificação das informações” → “verificar as " +
      "informações”). Quem pratica a ação — e qual nominalização vale desfazer — é decisão sua.",
    siglaSemExpansao:
      "Na primeira vez que a sigla aparece, escreva o nome por extenso seguido dela entre parênteses — “Nome Por " +
      "Extenso (SIGLA)”. Depois disso, use só a sigla. A expansão é sua; a ferramenta não a conhece.",
    redundancia:
      "Corte o termo que repete o sentido do outro — a forma enxuta está na justificativa acima. Qual dos dois remover é " +
      "decisão sua.",
    perifraseInflada:
      "Troque a locução pela forma enxuta equivalente (na justificativa). Confira só se a regência do que vem depois " +
      "continua certa.",
    duplaNegacao:
      "Diga direto o que a dupla negação afirma — a forma direta está na justificativa. Confirme que a nuance que você " +
      "quis dar não se perde.",
    maisQuePerfeito:
      "Prefira a forma composta, mais clara: “tinha feito” no lugar de “fizera”. A troca pede reconjugar com o " +
      "auxiliar — a frase final é sua.",
    gerundismo:
      "Troque o gerúndio encadeado pelo futuro simples ou o presente: “enviaremos” / “enviamos” no lugar de “vamos " +
      "estar enviando”.",
    adverbioMenteDenso:
      "Corte ou substitua parte dos advérbios em -mente — o excesso pesa a leitura. Quais tirar depende da ênfase que " +
      "você quer. (Critério descontinuado — ver “Advérbios vagos”.)",
    adverbiosVagos:
      "Tente ler a frase sem este advérbio (“basicamente”, “efetivamente”, “realmente”…): se o sentido não muda, ele " +
      "era só reforço e pode sair. Manter ou cortar é decisão sua.",
    mesoclise:
      "Reescreva sem a mesóclise: “será feito” ou “vai fazer” no lugar de “far-se-á”. Muda a construção, então a frase " +
      "final é sua.",
    paragraphLength:
      "Quebre o parágrafo em blocos menores, um grupo de ideias por vez. Onde cortar depende da organização do texto — " +
      "decisão sua.",
    proseEnumeration:
      "Transforme os itens embutidos no texto numa lista com marcadores — fica mais fácil localizar cada um. É uma " +
      "decisão de formatação sua.",
    saltoDeNivelTitulo:
      "A hierarquia de títulos pulou um nível. Rebaixe este título para o nível logo abaixo do anterior, ou crie o " +
      "título intermediário que falta — assim o sumário e a leitura por estrutura ficam previsíveis.",
    longHeading:
      "Encurte o título até virar um rótulo que o leitor use para localizar a seção — e, se ele fechou como frase, " +
      "tire o ponto final e reduza à etiqueta essencial. O corte é seu.",
    singleItemList:
      "Uma lista de um item só não separa nada: acrescente os itens que faltam, ou traga o conteúdo de volta para o " +
      "texto corrido. A escolha depende do conteúdo — sua.",
    headingBodyMismatch:
      "Releia o título e a seção juntos: ele antecipa o que o leitor vai encontrar aqui? Se não, ajuste o título ou " +
      "confirme que a palavra em comum só mudou de forma (plural/singular) — a ferramenta não decide por você.",
    jargon:
      "Há um equivalente mais simples no glossário, mas a troca depende do que vem a seguir. Confirme que o contexto é um " +
      "sintagma nominal (não uma oração) antes de substituir.",

    nominalizationBaseVerb: (verb) => `Verbo-base: “${verb}”.`,
    nominalizationBody:
      "Reescreva com o verbo direto (ex.: “fazer a análise” → “analisar”). A troca automática exigiria reconjugar o verbo " +
      "ou ajustar o complemento — passos que só você deve decidir.",

    readerNamed: (noun) => `O texto fala de “${noun}” em terceira pessoa. Para aproximar, `,
    readerUnnamed: "O texto fala do leitor em terceira pessoa. Para aproximar, ",
    readerBodyStrong: "fale com o leitor",
    readerBody:
      ": troque por “você deve…” ou use o imperativo (“apresente…”, “compareça…”). A ferramenta não faz a troca porque " +
      "mudar a pessoa muda o registro — a escolha é sua.",

    subordinationCount: (clauses) => `${clauses} orações subordinadas`,
    subordinationTrapped: " presas numa frase só. ",
    subordinationBody:
      "Separe em frases mais curtas, uma ideia por vez — o começo de cada oração subordinada costuma ser o corte natural. " +
      "A ferramenta não reescreve: decidir o que vira frase própria e reconjugar é decisão sua.",

    longSentenceLead: "A ferramenta não reescreve — ",
    longSentenceLeadStrong: "mede o esforço",
    longSentenceWithCuts: " da frase e ",
    longSentenceWithCutsStrong: "aponta abaixo onde ela se separa",
    longSentenceWithCutsTail: ". Recompor cada lado é decisão sua.",
    longSentenceNoCuts: " da frase. Onde dividir e como recompor é decisão sua.",
    statWords: "palavras",
    statOver: "acima de",
    statTarget: "meta",
    statTargetValue: (n) => `${n} frases`,
    cutsAvailable: (n) => (n === 1 ? "1 corte possível" : `${n} cortes possíveis`),
    cutsInformationNotAction: "informação, não ação",
    cutLabel: (i, boundary) => `corte ${i} · ${boundary}`,
    cutsNote: "A ferramenta aponta a fronteira, não divide. A frase nova é sua.",
    boundarySemicolon: "ponto-e-vírgula",
    boundaryDash: "travessão",
    boundaryCommaConjunction: (marker) => `vírgula antes de “${marker}”`,

    passiveWithAgent:
      "O agente está no texto, então a informação existe — reordene para “quem faz → ação → o quê” e reconjugue o " +
      "verbo. A ferramenta não monta a frase: reescreva abaixo ou peça a reescrita à IA; a engine verifica o resultado.",
    passiveNoAgentLead: "O texto não diz quem praticou a ação.",
    passiveNoAgentBody:
      " Essa informação só você tem — a ferramenta não a inventa, nem monta a frase por você. Responda abaixo e a resposta vira ",
    passiveNoAgentStrong: "requisito",
    passiveNoAgentRequirement:
      ": entra no briefing da reescrita por IA e a engine cobra que a versão final (sua ou da IA) nomeie esse agente.",
    scaffoldLead: "A ferramenta identifica os papéis no texto para você montar a voz ativa. É um ",
    scaffoldLeadStrong: "andaime, não a frase",
    scaffoldLeadTail: " — confira cada campo; a versão final é sua.",
    scaffoldAgent: "Agente",
    scaffoldAgentHint: "vira o sujeito",
    scaffoldAction: "Ação",
    scaffoldActionHint: "vira o verbo",
    scaffoldPickVerb: "→ escolha o verbo",
    scaffoldObject: "Objeto",
    scaffoldObjectHint: "o que sofreu a ação",
    scaffoldObjectPlaceholder: "você preenche",
    scaffoldNote:
      "Estrutura identificada · confira. A ferramenta não vira a frase: reordenar e reconjugar é escrever — e quem " +
      "escreve é você (ou a IA, que a engine então verifica).",
    agentQuestion: "Quem pratica essa ação?",
    agentPlaceholder: "ex.: a comissão",
    agentKeepImpersonal: "O agente não deve ser nomeado (manter impessoal)",
    agentRecordedKeep:
      "Registrado: manter a construção impessoal é uma decisão sua. O briefing instrui a IA a não inventar agente, e a " +
      "verificação não cobra a ativação.",
    agentRecorded: (agent) =>
      `Registrado como requisito: a versão final deve nomear «${agent}». A ferramenta não monta a frase — ela verifica quem montou.`,
  },

  briefing: {
    label: "Princípio 1 · Relevante",
    declared: "Leitor definido.",
    notDeclared: "Leitor não definido.",
    rationale:
      "Informe quem vai ler o documento e o que essa pessoa precisa saber ou fazer. A Lucid registra essa " +
      "informação, mas não avalia automaticamente se o conteúdo é relevante.",
    openDeclare: "Definir o leitor",
    openReview: "Rever leitor",
    closeBriefing: "Fechar",
    audienceLabel: "Quem é o leitor?",
    audienceHint: "Descreva quem vai ler de verdade — não o cargo que assina.",
    audiencePlaceholder: "Ex.: cidadão sem formação jurídica que pede o benefício pela primeira vez",
    purposeLabel: "O que ele precisa fazer depois de ler?",
    purposeHint: "A ação ou decisão concreta que o texto tem que viabilizar.",
    purposePlaceholder: "Ex.: saber se tem direito e reunir os documentos no prazo",
    priorLabel: "O que ele já sabe?",
    priorHint: "O que se pode pressupor — e, por consequência, o que precisa ser explicado.",
    priorPlaceholder: "Ex.: sabe que existe um benefício; não conhece o vocabulário do processo",
    mustFindLabel: "O que o leitor precisa encontrar no texto?",
    mustFindHintBefore: "Uma expressão por item. A ferramenta procura cada uma ",
    mustFindHintStrong: "literalmente",
    mustFindHintAfter: " e diz onde está — ela não julga se o assunto foi coberto.",
    mustFindPlaceholder: "Ex.: prazo de recurso",
    presenceLabel: "Presença literal",
    occurrences: (n) => ` — aparece ${n}×`,
    notFound: " — não aparece com essas palavras",
    removeNamed: (expression) => `Remover “${expression}”`,
    literalCaveat:
      "Busca literal, sensível a acento. Encontrar não prova que o leitor vai entender; não encontrar não prova que o " +
      "assunto está ausente — pode estar dito com outras palavras. Esta lista é a sua, não um critério da norma: ela " +
      "não entra no placar.",
  },

  profile: {
    label: "Critérios de análise",
    defaults: "Limites padrão.",
    adjustments: (n) => `${n} ${plural(n, "ajuste seu", "ajustes seus")} sobre o padrão.`,
    rationale:
      "A Lucid usa limites padrão para identificar frases longas e outros pontos de atenção. Você pode " +
      "ajustá-los às regras da sua organização. As alterações ficam registradas na auditoria.",
    openAdjust: "Ajustar critérios",
    closeAdjust: "Fechar",
    resetDefaults: "Voltar ao padrão",
    thresholdsLabel: "Limiares",
    policyLabel: "Critérios da política",
    policyNote:
      "Desligar um critério faz o pass não rodar. O silêncio dele deixa de significar “não encontrei” e passa a " +
      "significar “não procurei” — por isso cada desligamento é listado acima e no relatório.",
    deviationOff: (label) => `${label}: desligado (padrão: ligado)`,
    deviationOn: (label) => `${label}: ligado (padrão: desligado)`,
    deviationValue: (what, value, fallback) => `${what} ${value} (padrão: ${fallback})`,
    decrease: (label) => `Diminuir ${label}`,
    increase: (label) => `Aumentar ${label}`,
    knobSentenceWarn: "Frase longa — alerta acima de",
    knobSentenceError: "Frase longa — prioritário acima de",
    knobParagraph: "Parágrafo longo — acima de (frases)",
    knobHeading: "Título longo — acima de (palavras)",
    knobSubordination: "Subordinação densa — a partir de (orações)",
    knobChainedNominalization: "Nominalização encadeada — a partir de",
    knobProseEnumeration: "Enumeração em prosa — a partir de (itens)",
  },

  send: {
    always: (purpose: string) =>
      `Para ${purpose}, o documento será enviado a um serviço externo de inteligência artificial. ` +
      "A auditoria principal não depende desse serviço.",
    found: (named: string) => `Encontramos ${named} neste documento.`,
    limit:
      "A Lucid identifica apenas CPF, CNPJ e e-mail. Revise o documento antes de continuar, pois outros dados " +
      "pessoais podem não ser detectados.",
    kinds: {
      cpf: (n: number) => `${n} ${n === 1 ? "CPF" : "CPFs"}`,
      cnpj: (n: number) => `${n} ${n === 1 ? "CNPJ" : "CNPJs"}`,
      email: (n: number) => `${n} ${n === 1 ? "e-mail" : "e-mails"}`,
    },
    join: ", ",
    lastJoin: " e ",
    probePurpose: "fazer o teste",
    rewritePurpose: "gerar a reescrita",
  },
  probe: {
    title: "Teste de compreensão",
    lead: "Faça uma pergunta sobre o documento. A Lucid verifica se a resposta pode ser encontrada no texto.",
    useBriefingPurpose: "Usar o propósito do leitor que você declarou no Princípio 1:",
    questionLabel: "O que o leitor precisa encontrar no texto?",
    questionPlaceholder: "Ex.: Quando o prazo começa?",
    run: "Testar compreensão",
    httpFailure: (status) => `falha (HTTP ${status})`,
    running: "Testando…",
    staleWarning: "O texto mudou depois deste teste — o resultado abaixo é do trecho anterior. Teste de novo.",
    stuck: "A resposta não foi encontrada no texto.",
    excerpt: "trecho:",
    extracted: "Resposta encontrada:",
    noFloorViolation: "A resposta foi encontrada no texto.",
    loadLabel: "Carga de leitura",
    caveat:
      "Este teste usa inteligência artificial e pode errar. Encontrar a resposta no texto não garante que ele " +
      "esteja claro. Para confirmar a compreensão, faça testes com leitores reais.",
    operations: {
      resolver_referente_a_distancia: "resolver a quem um pronome se refere, à distância",
      integrar_entre_frases: "juntar informação de mais de uma frase",
      decodificar_termo_tecnico: "decodificar um termo técnico",
      inferir_agente_omitido: "inferir um agente que o texto não diz",
      segurar_sujeito_longo: "segurar um sujeito longo antes do verbo",
      desfazer_negacao_aninhada: "desfazer uma negação aninhada",
    },
  },

  documentView: {
    regionLabel: "Documento em revisão",
    draft: "Rascunho",
    structured: "Documento estruturado",
    underReview: "Documento em revisão",
    textareaLabel: "Texto do documento",
    emptyTitle: "Comece o seu rascunho",
    emptyBody:
      "Escreva ou cole o seu texto. A auditoria roda em tempo real, critério por critério — sem reescrever no seu lugar.",
    headingLevel: (level) => `Título · nível ${level}`,
    list: "Lista",
    orderedList: "Lista numerada",
    listItems: (n) => (n === 1 ? " · 1 item" : ` · ${n} itens`),
    segmentLabel: (label, text, severity) => `${label}: “${text}”. ${severity}.`,
    sheetLabel: "Revisões",
    sheetClose: "Fechar",
    sheetCollapse: "Recolher",
  },

  taxonomy: {
    severity: { info: "Observação", warning: "Atenção", error: "Prioritário" },
    principleGroup: {
      relevant: "Relevante",
      findable: "Localizável",
      understandable: "Compreensível",
      usable: "Usável",
    },
    coverage: { curated: "curada", productive: "produtiva" },
    editorialExtension: "Extensão editorial PT-BR",
    editorialExtensionTag: "PT-BR",
    editorialExtensionTitle: "Extensão editorial PT-BR — fora da norma ISO",
    structuralHeuristic: "Heurística estrutural",
    structuralHeuristicTag: "estrut.",
    structuralHeuristicTitle: "Heurística estrutural — fora da norma ISO",
  },

  ledger: {
    manual: "Edição do autor",
    ai: "Reescrita por IA",
  },

  readability: {
    noMeasure: "sem medida",
    noWords: "Não há palavras para medir — nenhum valor foi calculado (não é zero).",
    noSentences: "Não há frase delimitada para medir — nenhum valor foi calculado (não é zero).",
    smallSample: (words, threshold) =>
      `Amostra pequena: ${words} ${plural(words, "palavra", "palavras")}. A fórmula é calibrada para texto corrido; ` +
      `abaixo de ${threshold} palavras uma única palavra move o índice dezenas de pontos.`,
    sentenceBoundaryMissing: (wordsPerSentence, threshold) =>
      `${wordsPerSentence} palavras por frase, acima do máximo plausível de ${threshold}: a segmentação não encontrou ` +
      "fronteira de frase — provável pontuação ausente no texto colado.",
    syllablesImpossible: (syllablesPerWord, threshold) =>
      `${syllablesPerWord} sílabas por palavra, acima do máximo plausível de ${threshold}: a palavra mais longa do ` +
      "português tem 18 sílabas, então há token que não é palavra do idioma.",
    bandLabel: {
      very_easy: "muito fácil",
      easy: "fácil",
      hard: "difícil",
      very_hard: "muito difícil",
    },
    band: (label, min, max) => `faixa ${label} (${min}–${max})`,
    inRange: (range) => `dentro do intervalo de referência (${range})`,
    aboveRange: (range) => `acima do intervalo de referência (${range})`,
    belowRange: (range) => `abaixo do intervalo de referência (${range})`,
  },
};
