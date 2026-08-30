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
    openAudit: (pending) =>
      pending === 0 ? "Ver a auditoria" : `Ver a auditoria · ${pending} ${plural(pending, "pendente", "pendentes")}`,
    changeApplied: "Alteração aplicada ao texto.",
    undo: "Desfazer",
  },

  panel: {
    navLabel: "Destinos da auditoria",
    settingsTitle: "Personalizar análise",
    settingsLead: "Personalize os critérios de acordo com as regras do documento ou da sua organização.",
    settingsSummaryExpressions: (n) =>
      n === 0 ? "Nenhuma expressão adicionada" : `${n} ${plural(n, "expressão adicionada", "expressões adicionadas")}`,
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
    settingsOpen: "Configurar análise",
    settingsClose: "Voltar à auditoria",
    settingsDone: "Aplicar e voltar",
    goToFindingsHint:
      "Nada aqui é um ponto da auditoria: são os limites e o vocabulário que a análise usa para encontrar os " +
      "pontos. Mudanças aqui refazem a análise.",
    exportLabel: "Exportar",
    exportMenuLabel: "Formatos de exportação",
    provenanceTitle: (configHash, version) => `config ${configHash} · lucid ${version}`,
  },

  overview: {
    foundLabel: "O que a auditoria encontrou",
    movedLabel: "O que já mudou",
    seeChanges: "Ver as alterações",
    limitsLabel: "Limites desta análise",
    annotations: (n) => plural(n, "ponto para revisar", "pontos para revisar"),
    adjustedProfileBefore: "Esta auditoria usa um ",
    adjustedProfileStrong: "perfil personalizado",
    adjustedProfile: (deviations, disabled) =>
      `, com ${deviations} ${plural(deviations, "ajuste", "ajustes")} em relação ao padrão` +
      (disabled > 0 ? `, ${disabled} ${plural(disabled, "critério desligado", "critérios desligados")}` : "") +
      ".",
    adjustedProfileAfter: "Por isso, o resultado não pode ser comparado ao de uma auditoria padrão.",
    splitAriaLabel: (safe, human) => `${safe} com troca direta, ${human} para você decidir`,
    legendSafe: (n) => plural(n, "troca direta indicada", "trocas diretas indicadas"),
    legendHuman: (n) => plural(n, "ponto para você decidir", "pontos para você decidir"),
    severityCount: (severity, n) =>
      severity === "error"
        ? plural(n, "prioridade alta", "prioridades altas")
        : severity === "warning"
          ? plural(n, "requer atenção", "requerem atenção")
          : plural(n, "observação", "observações"),
    exportAudit: "Baixar auditoria (.md)",
    printAudit: "Imprimir auditoria (PDF)",
    printNote: "Abre a caixa de impressão do navegador — escolha “Salvar como PDF”.",
    exportDocx: "Baixar texto revisado (.docx)",
    exportDocumentMd: "Baixar texto revisado (.md)",
    printDocument: "Imprimir texto revisado (PDF)",
    groupAudit: "Auditoria",
    groupDocument: "Texto revisado",
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
      `Este documento não tem ${missing}. Por isso, ${count} ` +
      `${plural(count, "critério não pôde", "critérios não puderam")} ser ` +
      `${plural(count, "avaliado", "avaliados")}. ` +
      `${plural(count, "Para avaliá-lo", "Para avaliá-los")}, envie um arquivo .docx que contenha essas ` +
      "estruturas ou use # nos títulos e - nos itens de lista.",
    scoreCaveat:
      "O placar resume os critérios avaliados, mas não substitui uma revisão completa nem garante que o texto " +
      "esteja claro.",
    readingLabel: "Métricas de leitura",
    readingCaveat:
      "Os indicadores de legibilidade e coesão ajudam na revisão, mas não determinam sozinhos se o texto está claro.",
    balanceWeightNoun: "de peso",
    balanceLabel: "Antes e depois",
    balanceNone: "Nenhuma alteração foi registrada ainda.",
    balanceTotal: (before, after) => `Peso da auditoria: ${before} → ${after}`,
    balanceFound: (before, after) => `Pontos encontrados: ${before} → ${after}`,
    balanceCount: (before, after) => `${before} → ${after}`,
    balanceDirection: { improved: "melhorou", regressed: "piorou", unchanged: "sem mudança" },
    balanceKind: {
      resolved: "resolvido",
      kept: "mantido",
      reshaped: "reescrito, mas ainda identificado",
      introduced: "identificado após a alteração",
      transformed: "virou outra coisa",
      indirect: "efeito indireto",
    },
    balanceTransformed: (before, after) => `${before} virou ${after}`,
    balanceIndirectNote:
      "Mudou fora do trecho que você editou: critérios de título comparam um bloco com outro, então mexer em um muda o veredito do vizinho.",
    balanceTypingNote:
      "Trecho reescrito à mão. A comparação é da região inteira: dentro dela não dá para dizer qual ocorrência é qual.",
    balanceCaveat:
      "Um peso menor não significa que o texto está aprovado. Esta comparação mostra apenas o que os critérios " +
      "encontraram antes e depois — não se o público compreendeu o texto.",
    trailLabel: "Alterações registradas",
    trailWeight: (before, after, changes) =>
      `Peso da auditoria ${before} → ${after} · ${changes} ${plural(changes, "alteração registrada", "alterações registradas")}`,
    trailCaveat:
      "Esta lista mostra apenas as alterações aplicadas durante a revisão. As mudanças feitas diretamente no modo " +
      "Escrever alteram o documento, mas não aparecem aqui nem no relatório exportado.",
    changeFrom: "de",
    changeTo: "para",
    changeExpand: "Ver trecho completo",
    changeCollapse: "Recolher trecho",
    entryLabel: "Texto original",
    entryShow: "Ver o texto original",
    entryHide: "Ocultar o texto original",
    entrySize: (chars) => `${chars.toLocaleString("pt-BR")} ${plural(chars, "caractere", "caracteres")}`,
    entryNote:
      "Versão original do texto, disponível apenas para consulta. O Lucid não restaura nem aplica alterações a " +
      "partir dela.",
    entryStartingPoint: "Esse texto foi usado para calcular o peso inicial mostrado acima.",
    entryUnknown:
      "Texto original não registrado para este documento: a sessão foi salva antes de o Lucid guardar essa cópia.",
    entryWrittenHere: "Este documento foi escrito aqui — não há texto original para comparar.",
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
    regionLabel: "Revisão",
    title: "Revisão",
    browseLabel: "Pontos por critério",
    filterLabel: "Filtrar anotações",
    bucketAll: "Todos",
    bucketSafe: "Com troca direta",
    bucketHuman: "Para você decidir",
    empty: "Nenhum critério disparou neste texto.",
    emptyFilterTitle: "Nenhum ponto corresponde a este filtro",
    emptyFilterBody: (found) =>
      `O documento continua com ${found} ${found === 1 ? "ponto encontrado" : "pontos encontrados"}. ` +
      "Limpe os filtros para voltar a vê-los.",
    hideInDocument: "Ocultar realces no documento",
    hideNamed: (label) => `Ocultar os realces de “${label}” no documento`,
    showInDocument: "Mostrar realces no documento",
    showNamed: (label) => `Mostrar os realces de “${label}” no documento`,
    coverage: "Cobertura da análise",
    cleanCriteria: (n) => `${n} ${plural(n, "critério avaliado", "critérios avaliados")} sem nenhum ponto encontrado`,
    hiddenCriteria: (n) =>
      `${n} ${plural(n, "critério com realces ocultos", "critérios com realces ocultos")} — continuam na auditoria`,
    highlightsOff: "realces ocultos no documento",
    lexiconCaveat:
      "Os critérios identificam padrões específicos e ajudam na revisão, mas não substituem a avaliação de quem " +
      "escreveu o texto.",
    occurrences: (n) => `${n} ${plural(n, "ponto", "pontos")}`,
    distinct: (n) => `${n} ${plural(n, "trecho distinto", "trechos distintos")}`,
    hiddenByFilter: (n) => `${n} fora do filtro`,
    statePending: "Pendentes",
    stateSeen: "Revisados",
    stateDismissed: "Ignorados",
    searchLabel: "Buscar nos pontos",
    searchPlaceholder: "Buscar nos pontos…",

    moreFilters: "Mais filtros",
    fewerFilters: "Menos filtros",
    clearFilters: "limpar filtros",
    orderBySeverity: "por gravidade",
    orderByDocument: "por posição",
    batchLabel: "Em lote",
    batchClear: (n) => `Limpar as marcas destas ${n}`,
    batchCaveat:
      "Marcar como revisado é um a um, de propósito: a marca só vale se alguém olhou. Em lote só dá para limpar.",
    clearGroupMarks: (n) => `Limpar ${n} ${plural(n, "marca", "marcas")}`,
    scopeOn: "Filtrar por este critério",
    scopeOff: "Ver todos os critérios",
    scopeHint: (n) =>
      `A lista e a navegação ‹ › passam a percorrer só os ${n} ${plural(n, "ponto", "pontos")} deste critério.`,
    markSeen: "Marcar como revisado",
    markSeenHint: "Marcar como revisado — você avaliou este ponto",
    markSeenNamed: (excerpt) => `Marcar “${excerpt}” como revisado`,
    dismiss: "Ignorar",
    dismissHint: "Ignorar — você não vai mexer neste ponto",
    dismissNamed: (excerpt) => `Ignorar “${excerpt}”`,
    unmark: "Desmarcar",
    unmarkHint: "Desmarcar — volta a pendente",
    progress: (done, total) => `${done} de ${total} revisados`,
    pendingCount: (n) => `${n} ${plural(n, "pendente", "pendentes")}`,
    progressCaveat:
      "Essas marcações servem apenas para acompanhar sua revisão. Elas não alteram o resultado da auditoria nem " +
      "aprovam o texto.",
    progressTitle: (done, total) => `${done} de ${total} revisados`,
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
    footerDeterministic: "Análise automática baseada na",

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
        "Leia a frase e decida se ela carrega mais de uma ideia. Se carrega, você escolhe onde separar e como " +
        "recompor; se carrega uma só, marque como vista — a extensão sozinha não obriga a nada.",
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

    longSentenceLead: "A ferramenta não reescreve e não pede que você divida — ",
    longSentenceLeadStrong: "conta as palavras",
    longSentenceWithCuts: " da frase e ",
    longSentenceWithCutsStrong: "mostra abaixo onde ela poderia se separar",
    longSentenceWithCutsTail: ", caso você decida que há mais de uma ideia aqui.",
    longSentenceNoCuts: " da frase. Se há mais de uma ideia aqui, e o que fazer com ela, é leitura sua.",
    statWords: "palavras",
    statTrigger: "gatilho",
    statTriggerNote: "parâmetro do Lucid",
    standardSaysLabel: "A norma pede",
    standardSays:
      "frases concisas, uma ideia por frase e variação de tamanho ao longo do texto — sem fixar número " +
      "(ABNT NBR ISO 24495-1, 5.3.4).",
    parameterSaysLabel: "O Lucid inspeciona",
    parameterSays: (threshold) =>
      `frases acima de ${threshold} palavras. O número é escolha do produto, ajustável no perfil editorial, ` +
      "e passar dele não significa que a frase esteja inadequada.",
    coOccurringLabel: "Outros sinais nesta frase",
    coOccurringNote: "Cada um tem seu próprio critério e sua própria justificativa. Nada aqui vira nota somada.",
    coOccurringNone:
      "O motor não encontrou outro sinal dentro desta frase. Isso não atesta que ela esteja clara: é só a " +
      "ausência dos sinais que ele sabe procurar.",
    cutsAvailable: (n) => (n === 1 ? "1 fronteira possível" : `${n} fronteiras possíveis`),
    cutsInformationNotAction: "informação, não ação",
    cutLabel: (i, boundary) => `fronteira ${i} · ${boundary}`,
    cutsNote: "A ferramenta aponta a fronteira, não divide, e não afirma que dividir seja necessário.",
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

  views: {
    overview: {
      label: "Panorama",
      purpose: "O que a auditoria encontrou neste texto e qual é o próximo passo.",
    },
    review: {
      label: "Revisão",
      purpose: "Onde você percorre os pontos e decide o que fazer com cada um.",
    },
    changes: {
      label: "Alterações",
      purpose: "O histórico verificável do que mudou no texto e o efeito de cada mudança.",
    },
    metrics: {
      label: "Métricas",
      purpose: "Medidas descritivas do texto. Nenhuma delas é nota nem aprovação.",
    },
    probe: {
      label: "Compreensão",
      purpose: "Teste opcional com IA. Nunca produz aprovação — só aponta onde um leitor trava.",
    },
  },

  counts: {
    stripLabel: "Estado da revisão",
    found: (n) => `${n} ${plural(n, "ponto encontrado", "pontos encontrados")}`,
    pending: (n) => `${n} ${plural(n, "pendente", "pendentes")}`,
    reviewed: (n) => `${n} ${plural(n, "revisado", "revisados")}`,
    dismissed: (n) => `${n} ${plural(n, "ignorado", "ignorados")}`,
    noun: {
      found: (n) => plural(n, "ponto encontrado", "pontos encontrados"),
      pending: (n) => plural(n, "pendente", "pendentes"),
      pendingPoints: (n) => plural(n, "ponto pendente", "pontos pendentes"),
      reviewed: (n) => plural(n, "revisado", "revisados"),
      dismissed: (n) => plural(n, "ignorado", "ignorados"),
      change: (n) => plural(n, "alteração registrada", "alterações registradas"),
    },
    shown: (shown, found) => `Exibindo ${shown} de ${found} ${plural(found, "ponto", "pontos")}`,
    shownAll: (found) => `Exibindo ${plural(found, "o único ponto", `os ${found} pontos`)}`,
    stepsDone: (done, total) => `${done} de ${total} ${plural(total, "etapa concluída", "etapas concluídas")}`,
    nothingPending: "Nada pendente",
    resolvedSince: (resolved, introduced) =>
      introduced === 0
        ? `${resolved} ${plural(resolved, "ponto saiu do texto", "pontos saíram do texto")}`
        : `${resolved} ${plural(resolved, "ponto saiu", "pontos saíram")} · ` +
          `${introduced} ${plural(introduced, "novo ponto apareceu", "novos pontos apareceram")}`,
  },

  route: {
    label: "Percurso",
    tabsLabel: "Como revisar",
    tabRoute: "Percurso",
    tabBrowse: "Todos os pontos",
    idleLead: (found, steps) =>
      `O percurso agrupa os ${found} pontos em ${steps} ${plural(steps, "etapa", "etapas")}: ` +
      "um critério de cada vez, do mais grave ao mais leve.",
    stepOf: (index, total) => `Etapa ${index} de ${total}`,
    begin: "Começar a revisão",
    resume: "Continuar a revisão",
    beginHint: (index, label) => `Começa na etapa ${index}: ${label}`,
    resumeHint: (index, label) => `Você parou na etapa ${index}: ${label}`,
    openStep: "Abrir o primeiro ponto",
    resumeStep: "Continuar de onde parou",
    stepPending: (n) =>
      n === 1
        ? "Falta 1 ponto nesta etapa. Abra e marque como revisado ou ignorado."
        : `Faltam ${n} pontos nesta etapa. Abra um a um e marque cada um como revisado ou ignorado.`,
    stepProgress: (reviewed, count) => `${reviewed} de ${count} ${plural(count, "ponto", "pontos")} desta etapa`,
    routeProgress: (reviewed, found) => `${reviewed} de ${found} ${plural(found, "ponto", "pontos")} no percurso`,
    nextUp: (index, label) => `Depois: etapa ${index} · ${label}`,
    advance: (index, label) => `Continuar para a etapa ${index}: ${label}`,
    finishedTitle: (label) => `Etapa concluída: ${label}`,
    finishedCount: (reviewed, dismissed) =>
      dismissed === 0
        ? `${reviewed} ${plural(reviewed, "ponto revisado", "pontos revisados")}`
        : `${reviewed} ${plural(reviewed, "revisado", "revisados")} · ${dismissed} ${plural(dismissed, "ignorado", "ignorados")}`,
    reviewAgain: "Rever esta etapa",
    allDoneTitle: "Percurso concluído",
    allDoneCount: (reviewed, steps) =>
      `${reviewed} ${plural(reviewed, "ponto revisado", "pontos revisados")} em ${steps} ${plural(steps, "etapa", "etapas")}.`,
    allDoneBody:
      "Percorrer não é aprovar. Ponto revisado é ponto que você olhou; ponto resolvido é ponto que deixou de " +
      "existir no texto. A auditoria continua a mesma até o texto mudar.",
    allDoneNext: "O que foi percorrido fica registrado em Exportar › Relatório da auditoria.",
    leave: "Sair do percurso",
    leaveDone: "Voltar ao panorama",
    backToReview: "Rever os pontos",
    stepsLabel: "Etapas do percurso",
    stepDone: "concluída",
    stepPartial: (reviewed, count) => `${reviewed} de ${count} revisados`,
    startTag: "começar daqui",
    resumeTag: "continuar daqui",
    stepAction: (label, n) => `Percorrer “${label}” (${n} ${plural(n, "ponto", "pontos")})`,
    states: { "not-started": "não iniciada", "in-progress": "em andamento", done: "concluída" },
    orderCaveat:
      "Esta é apenas uma ordem sugerida. Você pode revisar as etapas em qualquer sequência, sem alterar o " +
      "resultado da auditoria.",
    swapShortcutLabel: "Atalho",
    swapShortcut: (n) => `Ver as ${n} ${plural(n, "troca direta", "trocas diretas")}`,
    browseLead: "Consulta livre: filtre e abra qualquer ponto. Nada aqui altera o percurso.",
    browseReturn: (index, label) => `Voltar ao percurso · etapa ${index}: ${label}`,
  },

  guided: {
    trailLabel: "Etapas do percurso",
    trailStep: (index, total, label, state) => `Etapa ${index} de ${total}: ${label}, ${state}`,
    occurrenceOf: (index, total) => `Ponto ${index} de ${total}`,
    backToStep: "Voltar à etapa",
    markAndAdvance: "Marcar como revisado e avançar",
    markAndFinish: "Marcar como revisado e concluir a etapa",
    seenChip: "Revisado",
    nextOccurrence: "Próximo ponto",
    stepOccurrences: "Pontos desta etapa",
    stepProgressLabel: "Progresso da etapa",
    routeProgressLabel: "Progresso do percurso",
  },

  changes: {
    emptyTitle: "Nenhuma alteração ainda",
    emptyBody:
      "Quando você aplicar uma troca do glossário, colar uma reescrita ou editar o texto, cada alteração " +
      "aparece aqui com o antes, o depois e o efeito nos critérios.",
    listLabel: "Alterações aplicadas",
    effectLabel: "Efeito nos critérios",
    detailsShow: "Ver detalhes da alteração",
    detailsHide: "Ocultar detalhes da alteração",
    undoLast: "Desfazer esta alteração",
    weightMeaning:
      "O peso soma a gravidade dos pontos encontrados (erro 3, atenção 1, observação 0,3) e serve para comparar o " +
      "texto com ele mesmo, antes e depois de uma alteração. Um peso menor não significa que o texto está " +
      "aprovado: mostra apenas o que os critérios automáticos encontraram — não se o público compreendeu o texto.",
    stillOpen: (n) => `${n} ${plural(n, "ponto continua no texto", "pontos continuam no texto")}`,
    none: "Nenhum critério mudou de contagem.",
  },

  metricsView: {
    notAScore:
      "Estas medidas descrevem a superfície do texto. Elas apoiam a leitura dos critérios e nunca substituem " +
      "a avaliação de quem escreveu, nem indicam aprovação.",
    explainShow: "O que esta medida quer dizer",
    explainHide: "Ocultar explicação",
    meaningLabel: "O que mede",
    directionLabel: "Direção",
    limitLabel: "Limite",
    meanings: {
      words: {
        meaning: "Quantas palavras o texto tem depois da importação.",
        direction: "Nem maior nem menor é melhor: é só o tamanho do que foi analisado.",
        limit: "Conta palavras do texto extraído, não do arquivo original.",
      },
      sentences: {
        meaning: "Quantas frases o segmentador encontrou.",
        direction: "Nem maior nem menor é melhor.",
        limit: "Abreviações e listas podem deslocar a contagem em textos muito fragmentados.",
      },
      wordsPerSentence: {
        meaning: "Média de palavras por frase.",
        direction: "Média alta costuma acompanhar frases que acumulam ideias — é um sinal, não um defeito.",
        limit: "A média esconde a variação: um texto com frases muito curtas e muito longas pode ter média boa.",
      },
      readability: {
        meaning: "Índice Flesch adaptado ao português por Martins et al. (1996).",
        direction: "Valor maior indica superfície mais fácil de decodificar.",
        limit: "Fórmula mecânica de sílabas e palavras: não lê sentido, ordem nem estrutura.",
      },
      referentialCohesion: {
        meaning: "Quanto as frases vizinhas repetem os mesmos substantivos.",
        direction: "Descritivo: repetição demais cansa, de menos obriga o leitor a adivinhar o referente.",
        limit: "Compara palavras, não sentidos. Sinônimos e pronomes não entram na conta.",
      },
      adjacentGap: {
        meaning: "Proporção de frases vizinhas sem nenhuma palavra em comum.",
        direction: "Descritivo: valor alto indica saltos entre frases, que podem ou não estar corretos.",
        limit: "Não distingue salto proposital de salto acidental.",
      },
      connectives: {
        meaning: "Conectivos a cada 100 palavras.",
        direction: "Descritivo: os dois extremos atrapalham, e o número certo depende do gênero do texto.",
        limit: "Conta por lista fechada de conectivos; não julga se o conectivo está correto.",
      },
    },
  },

  presets: {
    label: "Finalidade do texto",
    lead: "Os limiares não vêm da norma — a ABNT não fixa números. Escolher a finalidade troca os limiares por um conjunto declarado, e o placar passa a valer só dentro dele.",
    current: (name) => `Em uso: ${name}`,
    adjustedOn: (name, n) => `${name}, com ${n} ${plural(n, "ajuste seu", "ajustes seus")}`,
    stamp: (name, version, hash) => `${name} v${version} · ${hash}`,
    names: {
      base: "Padrão",
      normativo: "Normativo ou contratual",
      publico: "Cartilha e comunicado ao cidadão",
      digital: "Página de serviço e conteúdo web",
    },
    purposes: {
      base: "Sem finalidade declarada. Os limiares de referência do Lucid, iguais para qualquer texto.",
      normativo:
        "Lei, decreto, edital, contrato. Aceita frases e parágrafos mais longos, porque a estrutura jurídica os impõe — e continua cobrando jargão, passiva e nominalização.",
      publico:
        "Texto escrito para quem não é da área. Frase curta, parágrafo curto e pouca subordinação; é o perfil mais exigente do conjunto.",
      digital:
        "Texto que se lê na tela, aos saltos. Cobra parágrafo curto e título curto, porque a pessoa varre a página antes de ler.",
    },
    limits: {
      base: "Comparável a qualquer outro placar padrão.",
      normativo:
        "Um placar deste perfil não é comparável a um padrão nem a um dos outros: o mesmo texto tem menos frases longas aqui porque o limite é outro.",
      publico:
        "Aplicado a texto jurídico, este perfil aponta quase toda frase. Isso não é defeito do texto nem do perfil — é o perfil errado para aquele documento.",
      digital: "Aplicado a texto sem títulos nem listas, quatro critérios ficam sem objeto e o placar cala sobre eles.",
    },
    changes: (n) => `${n} ${plural(n, "diferença", "diferenças")} em relação ao padrão`,
    noChanges: "É a configuração de referência.",
    caveat:
      "Trocar a finalidade muda o que é medido, não o texto. Dois placares só se comparam com o mesmo perfil e o mesmo hash.",
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
    knobSentenceWarn: "Inspecionar frases acima de",
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
    typing: "Trecho reescrito à mão",
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
