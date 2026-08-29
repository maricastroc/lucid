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
    openDocument: "Abrir documento",
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
    spliceRefused: {
      crosses_units: "Esta alteração atravessa mais de um bloco do documento importado.",
      unsupported_unit:
        "Ainda não sabemos aplicar uma alteração em várias linhas dentro de um título ou de um item de lista.",
      introduces_heading: "Esta alteração criaria um título novo, o que mudaria a estrutura do documento.",
      empty_unit: "Esta alteração deixaria o bloco vazio.",
      rebuild_mismatch: "Não foi possível reconstruir o documento preservando os outros blocos.",
    },
    spliceRefusedKept: "O documento continua como estava — nada foi alterado.",
    spliceAcceptPlain: "Aplicar como texto simples",
    spliceDiscard: "Descartar",
    saveFailed:
      "Não foi possível salvar este trabalho no navegador — ele será perdido se você fechar a aba. Exporte o " +
      "relatório para não depender disto.",
    importRefusal: {
      unreadable: "Não foi possível ler o arquivo. Confirme que é um .docx válido.",
      tracked_changes:
        "Este arquivo tem alterações rastreadas ainda não resolvidas. Enquanto elas existirem, o próprio " +
        "arquivo não diz qual é o seu texto — auditar aqui seria auditar uma versão que ninguém aprovou. " +
        "Aceite ou rejeite as alterações no editor e importe de novo.",
      scanned:
        "Este PDF é uma imagem digitalizada, não texto. Não dá para auditar o que não foi escrito como texto — envie o arquivo original, em .docx ou em PDF gerado pelo computador.",
      columns:
        "Este PDF está em duas ou mais colunas, e a leitura de cima para baixo misturaria as colunas. Em vez de auditar um texto embaralhado, a importação para aqui — envie o original em .docx ou um PDF de uma coluna.",
      glued:
        "As palavras deste PDF saem grudadas na extração: o texto lido não é o texto escrito, e auditar aqui mediria a extração, não a escrita.",
      invariant:
        "Um número que está no PDF não sobreviveu à leitura. A ferramenta prefere recusar a auditar um texto do qual não tem certeza.",
      no_readable_content:
        "Este arquivo não tem conteúdo legível para auditar. Não é um documento limpo: é um documento vazio.",
    },
    revisions: (n) => `${n} ${plural(n, "revisão", "revisões")}`,
    changeApplied: "Alteração aplicada ao texto.",
    undo: "Desfazer",
  },

  panel: {
    navLabel: "Seções do painel",
    sections: {
      summary: "Resumo",
      findings: "Pontos",
      settings: "Ajustes",
      metrics: "Métricas",
      probe: "Compreensão",
    },
    settingsTitle: "Personalizar análise",
    settingsLead: "Personalize os critérios de acordo com as regras do documento ou da sua organização.",
    settingsSummaryExpressions: (n) => (n === 0 ? "nenhuma expressão" : `${n} ${plural(n, "expressão", "expressões")}`),
    settingsSummaryProfile: (deviations) =>
      deviations === 0
        ? "limites padrão"
        : `${deviations} ${plural(deviations, "limite alterado", "limites alterados")}`,
    settingsSummaryJoin: " · ",
    settingsRecordPointer:
      "Informações sobre o leitor e o objetivo do documento ficam em Exportar › Informações do relatório.",
    settingsIsoNote: "Baseado na ABNT NBR ISO 24495-1",
    settingsIsoTitle:
      "Esta seção ajuda a aplicar as orientações da seção 5.1 sobre relevância para o leitor. " +
      "Os demais limites correspondem aos critérios de frase, parágrafo e título.",
    goToFindings: "Ver pontos da auditoria",
    goToFindingsHint: "Esses ajustes não são pontos da auditoria, mas mudam como alguns pontos são identificados.",
    metricsSummary: (words, perSentence) => `${words} palavras · ${perSentence} por frase`,
    probeSummary: "teste opcional com IA",
    exportLabel: "Exportar",
    exportMenuLabel: "Formatos de exportação",
    provenanceTitle: (configHash, version) => `config ${configHash} · lucid ${version}`,
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
    docxNote: "Contém o texto revisado, sem a formatação original: negrito, tabelas, imagens e cabeçalhos.",
    importTables: (n: number) => `${n} ${n === 1 ? "tabela achatada" : "tabelas achatadas"}`,
    importTextBoxes: (n: number) => `${n} ${n === 1 ? "caixa de texto embutida" : "caixas de texto embutidas"}`,
    importRuledRegions: (n: number) =>
      `${n} ${n === 1 ? "região com grade, lida" : "regiões com grade, lidas"} como texto corrido`,
    importFurniture: (n: number) =>
      `${n} ${n === 1 ? "linha repetida de cabeçalho, rodapé ou número de página" : "linhas repetidas de cabeçalho, rodapé ou número de página"} fora da auditoria`,
    importDehyphenated: (n: number) =>
      `${n} ${n === 1 ? "palavra remontada" : "palavras remontadas"} de quebra de linha`,
    importAnd: " e ",
    importAlso: ", ",
    importRecovered: (styles: string) =>
      `Reconhecemos os títulos do arquivo (${styles}). Sem isso, eles entrariam como parágrafo comum.`,
    importFlattened: (what: string) =>
      `${what} viraram parágrafos. O conteúdo entra na auditoria, mas a disposição original não.`,
    importFromPdf: (what: string) =>
      `Leitura do PDF: ${what}. O PDF não declara títulos nem listas, então tudo entra como parágrafo.`,
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
    readingLabel: "Métricas de leitura",
    readingCaveat:
      "Os indicadores de legibilidade e coesão ajudam na revisão, mas não determinam sozinhos se o texto está claro.",
    trailLabel: "Trilha de revisão",
    trailWeight: (before, after, changes) =>
      `Peso da auditoria ${before} → ${after} · ${changes} ${plural(changes, "alteração", "alterações")}`,
    trailCaveat: "Registro do que foi feito nesta sessão — não é atestado de qualidade. Vai no relatório exportado.",
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
    filterLabel: "Filtrar anotações",
    bucketAll: "Todas",
    bucketSafe: "Troca direta",
    bucketHuman: "Decisão sua",
    empty: "Nenhuma anotação disparada.",
    emptyInFilter: "Nenhuma anotação neste filtro.",
    hideInDocument: "Ocultar realces no documento",
    hideNamed: (label) => `Ocultar os realces de “${label}” no documento`,
    showInDocument: "Mostrar realces no documento",
    showNamed: (label) => `Mostrar os realces de “${label}” no documento`,
    coverage: "Cobertura",
    cleanCriteria: (n) =>
      `${n} ${plural(n, "critério verificado, sem ocorrência", "critérios verificados, sem ocorrência")}`,
    hiddenCriteria: (n) =>
      `${n} ${plural(n, "critério com realces ocultos", "critérios com realces ocultos")} — continuam na auditoria`,
    highlightsOff: "realces ocultos no documento",
    lexiconCaveat:
      "Os critérios verificam padrões específicos. Ajudam na revisão, mas não substituem a análise de quem escreveu.",
    occurrences: (n) => `${n} ${plural(n, "ocorrência", "ocorrências")}`,
    distinct: (n) => `${n} ${plural(n, "trecho distinto", "trechos distintos")}`,
    hiddenByFilter: (n) => `${n} fora do filtro`,
    statePending: "Pendentes",
    stateSeen: "Vistas",
    stateDismissed: "Dispensadas",
    searchLabel: "Buscar trecho nos achados",
    searchPlaceholder: "Buscar trecho…",
    showingAll: (n) => `${n} ${plural(n, "ocorrência", "ocorrências")}`,
    showingFiltered: (shown, total) => `${shown} de ${total} ${plural(total, "ocorrência", "ocorrências")}`,
    moreFilters: "Mais filtros",
    fewerFilters: "Menos filtros",
    clearFilters: "limpar filtros",
    orderBySeverity: "por gravidade",
    orderByDocument: "por posição",
    batchLabel: "Em lote",
    batchClear: (n) => `Limpar as marcas destas ${n}`,
    batchCaveat:
      "Marcar como vista é um a um, de propósito: a marca só vale se alguém olhou. Em lote só dá para limpar.",
    clearGroupMarks: (n) => `Limpar ${n} ${plural(n, "marca", "marcas")}`,
    scopeOn: "Filtrar por este critério",
    scopeOff: "Ver todos os critérios",
    scopeHint: (n) =>
      `A lista e a navegação ‹ › passam a percorrer só as ${n} ${plural(n, "ocorrência", "ocorrências")} deste critério.`,
    markSeen: "Marcar como vista",
    markSeenHint: "Marcar como vista — você olhou esta ocorrência",
    markSeenNamed: (excerpt) => `Marcar “${excerpt}” como vista`,
    dismiss: "Dispensar",
    dismissHint: "Dispensar — você não vai mexer nesta ocorrência",
    dismissNamed: (excerpt) => `Dispensar “${excerpt}”`,
    unmark: "Desmarcar",
    unmarkHint: "Desmarcar — volta a pendente",
    progress: (done, total) => `${done} de ${total} marcadas`,
    pendingCount: (n) => `${n} ${plural(n, "pendente", "pendentes")}`,
    progressCaveat: "Marca do autor sobre a própria revisão — não altera o placar nem aprova o texto.",
    progressTitle: (done, total) => `${done} de ${total} marcadas`,
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
    understandCriterion: "Entenda este critério",
    excerptMore: "Ver o trecho completo",
    excerptLess: "Recolher o trecho",
    engineOutput: "Saída da engine · pt-BR",
    engineOutputHint:
      "A justificativa vem do motor de análise, que audita português — ela não é traduzida junto com a interface.",
    navPrev: "Anterior (k)",
    navNext: "Próximo (j)",
    navOf: "de",
    panelLabel: "Auditoria",
    crumbAll: "Todos os critérios",
    crumbBackTo: (criterion) => `Voltar para a lista de ${criterion}`,
    backToList: "Voltar à lista",
    footerDeterministic: "Análise determinística",

    safeHeader: "Troca direta · equivalente curado",
    safeTerm: "Termo",
    safePlain: "Comum",
    safeEquivalent: "equivalente 1:1 do glossário",
    safeApply: (term: string) => `Trocar por «${term}»`,
    safeApplyNote:
      "A troca é sua: a ferramenta só assina que este equivalente é 1:1 e não depende do contexto. Aplicada uma de cada vez, e a engine re-audita o texto depois.",
    safeNote:
      "A ferramenta indica o equivalente; ela não altera o texto. Faça a troca em “Editar ou colar minha versão” " +
      "abaixo — a engine re-audita o resultado.",

    humanHeader: "Exige decisão humana",
    humanLead:
      "Este ponto exige uma análise do contexto. Revise o trecho e escolha a alteração que melhor preserve o " +
      "sentido original.",
    humanLeadByCriterion: {
      long_sentence:
        "Há mais de uma forma de dividir esta frase. Revise o trecho e escolha a divisão que melhor " +
        "preserve o sentido original.",
    },
    howToProceed: "Como seguir",

    manualOpen: "Editar ou colar minha versão",
    manualTitle: "Sua versão",
    manualUnitSentence: "esta frase",
    manualUnitParagraph: "este parágrafo",
    manualEditAria: (unit) => `Editar ${unit}`,
    manualVerify: "Verificar minha versão",
    manualVerifying: "Verificando…",
    manualNote:
      "Escreva ou cole sua versão. Ao aplicar, ela será salva como rascunho e analisada pelos mesmos critérios " +
      "usados na reescrita por IA.",

    aiTitle: "Reescrita por IA",
    aiTarget: (unit) => `A IA vai reescrever ${unit} em destaque no documento e verificar o resultado.`,
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
    label: "Palavras e expressões obrigatórias",
    chip: "A Lucid procura no texto",
    lead:
      "Adicione palavras ou expressões que precisam ser encontradas exatamente como você escrever. " +
      "A Lucid mostra onde cada uma aparece ou avisa quando não encontra.",
    audienceLabel: "Para quem este texto foi escrito?",
    audienceHint: "Quem vai ler de verdade, não quem assina.",
    audiencePlaceholder: "Ex.: cidadão sem formação jurídica que pede o benefício pela primeira vez",
    purposeLabel: "O que essa pessoa precisa fazer?",
    purposeHint: "A ação concreta que o texto tem que viabilizar.",
    purposePlaceholder: "Ex.: saber se tem direito e reunir os documentos no prazo",
    priorLabel: "O que ela já sabe sobre o assunto?",
    priorHint: "O que dá para pressupor — e, portanto, o que precisa ser explicado.",
    priorPlaceholder: "Ex.: sabe que existe um benefício; não conhece o vocabulário do processo",
    mustFindLabel: "Qual palavra ou expressão deve aparecer?",
    mustFindHint: "Adicione uma expressão por vez. A busca ignora maiúsculas e minúsculas, mas considera os acentos.",
    mustFindPlaceholder: "Ex.: prazo para recurso",
    addExpression: "Adicionar expressão",
    presenceLabel: "Ocorrências no documento",
    occurrences: (n) => `${n} ${plural(n, "ocorrência", "ocorrências")}`,
    notFound: "Não encontrada",
    showOccurrences: (expression, n) =>
      `Ver “${expression}” no documento — ${n} ${plural(n, "ocorrência", "ocorrências")}`,
    occurrencePosition: (index, total) => `${index} de ${total}`,
    occurrenceNav: (expression) => `Ocorrências de “${expression}”`,
    prevOccurrence: (expression) => `Ocorrência anterior de “${expression}”`,
    nextOccurrence: (expression) => `Próxima ocorrência de “${expression}”`,
    removeNamed: (expression) => `Remover “${expression}”`,
    literalCaveat:
      "Encontrar não garante que o leitor vai entender; não encontrar pode significar só que o texto diz " +
      "de outro jeito. Esta lista é sua e não altera a pontuação.",
  },

  reportRecord: {
    menuItem: "Informações do relatório",
    menuNote: "Opcional — entra no relatório exportado, não na análise.",
    title: "Informações do relatório",
    optionalTag: "Opcional",
    lead:
      "Registre para quem o texto foi escrito, o que essa pessoa precisa fazer depois da leitura e o que " +
      "ela já sabe sobre o assunto.",
    caveat: "A Lucid guarda estas respostas no relatório exportado, mas não as verifica: são registro, não medição.",
    isoNote: "Baseado na ABNT NBR ISO 24495-1",
    isoTitle: "Estas perguntas ajudam a aplicar as orientações da seção 5.1 sobre relevância para o leitor.",
    done: "Fechar",
  },

  startHere: {
    label: "Comece por aqui",
    volume: (total, criteria) =>
      `${total} ${plural(total, "ocorrência", "ocorrências")} em ${criteria} ${plural(criteria, "critério", "critérios")}.`,
    lead: (hasSwaps) =>
      hasSwaps
        ? "Ler tudo de uma vez não funciona. Uma ordem que funciona: primeiro o que é mecânico, depois um " +
          "critério de cada vez."
        : "Ler tudo de uma vez não funciona. Aqui não há troca direta a fazer, então a ordem que funciona é " +
          "um critério de cada vez.",
    safeStep: "Trocas diretas",
    safeBody:
      "Têm equivalente 1:1 do glossário. São as decisões mais rápidas e derrubam volume — a troca é sua, " +
      "a ferramenta só indica.",
    safeAction: (n) => `Ver as ${n} ${plural(n, "troca direta", "trocas diretas")}`,
    criterionStep: "Um critério de cada vez",
    criterionBody:
      "O mesmo problema repetido se resolve com a mesma cabeça. Percorrer um critério inteiro cansa menos " +
      "do que trocar de critério a cada ponto.",
    criterionAction: (label, n) => `Percorrer “${label}” (${n})`,
    caveat:
      "Sugestão de ordem, não regra: os pontos são os mesmos em qualquer sequência, e a ordem não altera o placar.",
  },

  profile: {
    label: "Limites da análise",
    defaults: "Nenhum limite alterado.",
    adjustments: (n) => `${n} ${plural(n, "limite alterado", "limites alterados")} por você.`,
    chip: "Muda o que é apontado",
    lead:
      "Ajuste os limites de critérios como tamanho de frase e de parágrafo. Valem para esta análise e " +
      "ficam registrados no relatório.",
    openAdjust: "Ajustar limites",
    resetDefaults: "Voltar ao padrão",
    thresholdsLabel: "Limites",
    policyLabel: "Critérios ativos",
    policyNote:
      "Critérios desativados não são verificados nem aparecem nos resultados. Todos ficam registrados no " +
      "relatório e podem ser ativados novamente.",
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
    always: "Ao continuar, o documento será enviado a um serviço externo de IA.",
    found: (named: string) => `Encontramos ${named} no documento.`,
    limit: "Revise o conteúdo: outros dados pessoais podem não ser detectados.",
    kinds: {
      cpf: (n: number) => `${n} ${n === 1 ? "CPF" : "CPFs"}`,
      cnpj: (n: number) => `${n} ${n === 1 ? "CNPJ" : "CNPJs"}`,
      email: (n: number) => `${n} ${n === 1 ? "e-mail" : "e-mails"}`,
    },
    join: ", ",
    lastJoin: " e ",
  },
  probe: {
    title: "Teste de compreensão",
    lead: "Verifique se a resposta que o leitor procura está mesmo no trecho.",
    selectPrompt:
      "Selecione um trecho no documento ao lado. A sonda lê só o recorte que você escolher — não o documento inteiro.",
    excerptLabel: "Trecho que será enviado",
    clearExcerpt: "limpar",
    onlyThisExcerpt: "A sonda responde só com o que está neste trecho.",
    excerptTooLong: (chars, max) =>
      `Trecho com ${chars.toLocaleString("pt-BR")} caracteres — acima do limite de ${max.toLocaleString("pt-BR")}. Selecione um recorte menor.`,
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
      "Este teste usa IA e pode errar. Encontrar a resposta não garante que o texto esteja claro — só teste " +
      "com leitores reais confirma.",
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
    emptyDrop: "Ou arraste um .docx ou .pdf para cá.",
    dropHere: "Solte para abrir",
    dropHint: "Aceita .docx e .pdf",
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
    glossary: "Troca direta do glossário",
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
