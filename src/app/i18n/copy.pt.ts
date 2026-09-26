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
  },

  language: {
    ariaLabel: "Idioma da interface",
    short: { "pt-BR": "PT", en: "EN" },
    switchTo: { "pt-BR": "Mudar a interface para português", en: "Switch the interface to English" },
  },

  masthead: {
    home: "Voltar ao início",
    tagline: "Auditor textual determinístico",
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
    kicker: "Mesmo texto, mesmo diagnóstico",
    titleLead: "Lucid audita o seu texto, critério a critério.",
    titleTrail: "Não decide por você.",
    lead:
      "Cada apontamento mostra o trecho exato, o critério que disparou e a fonte desse critério, como a norma " +
      "ABNT NBR ISO 24495-1, e explica por que o trecho pode dificultar a leitura.",
    leadStrong: "Uma proposta da IA só entra no texto se você a aplicar.",
    doesLabel: "O que ele faz",
    verbs: ["Analisa", "Detecta", "Explica", "Pergunta", "Verifica"],
    doesNotBefore: "O que ele ",
    doesNotStrong: "não",
    doesNotAfter: " faz: aprovar o seu texto.",
    write: "Escrever ou colar texto",
    loadExample: "Carregar exemplo",
    anatomyLabel: "Cada trecho vira uma anotação assim",
    cardCriterion: {
      title: "O critério que disparou",
      body: "Voz passiva, jargão, frase longa, ações escritas como substantivos: cada um com a fonte que o fundamenta.",
    },
    cardWhy: {
      title: "Por que trava o leitor",
      body: "A justificativa em português claro e o trecho exato marcado no documento.",
    },
    cardWhat: {
      title: "O que fazer com isso",
      body: "Mostra quando há uma troca direta indicada e quando a decisão depende de você.",
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
      body: "O texto em revisão e as alterações registradas serão descartados, e isso não pode ser desfeito. Se quiser guardar a auditoria, exporte o relatório antes.",
      confirm: "Descartar e voltar",
    },
    replaceDocument: {
      title: "Abrir outro documento?",
      lead: "Há uma auditoria em andamento. Se você abrir outro documento, ela será substituída e você perde:",
      changes: (n) => `${n} ${plural(n, "alteração registrada", "alterações registradas")}`,
      reviewed: (n) => `${n} ${plural(n, "ponto revisado", "pontos revisados")}`,
      dismissed: (n) => `${n} ${plural(n, "ponto ignorado", "pontos ignorados")}`,
      editedText: "as edições feitas no texto desde que ele foi aberto",
      briefing: "as informações do relatório e as palavras obrigatórias que você registrou",
      kept: "O perfil editorial e o vocabulário da organização continuam valendo, porque não pertencem a este documento.",
      save: "Salvar ponto de partida…",
      saveHint:
        "“Salvar ponto de partida” baixa esta auditoria como arquivo antes de abrir o outro documento. Com esse " +
        "arquivo, você pode comparar as duas versões depois.",
      discard: "Descartar e abrir",
      cancel: "Cancelar a abertura",
    },
    spliceRefused: {
      crosses_units: "Esta alteração atravessa mais de um bloco do documento importado.",
      crosses_cells:
        "Esta alteração atravessa mais de uma célula da tabela. Aplicar moveria texto de uma célula para outra.",
      unsupported_unit:
        "O Lucid ainda não consegue aplicar uma alteração com várias linhas dentro de um título ou de um item de lista.",
      introduces_heading: "Esta alteração criaria um título novo, o que mudaria a estrutura do documento.",
      rebuild_mismatch: "Não foi possível reconstruir o documento preservando os outros blocos.",
    },
    spliceRefusedKept: "O documento continua como estava.",
    spliceAcceptPlain: "Aplicar como texto simples",
    spliceDiscard: "Descartar",
    saveFailed:
      "Não foi possível salvar este trabalho no navegador, e ele se perde se você fechar a aba. Antes de fechar, " +
      "use Exportar para baixar o texto e o relatório.",
    importRefusal: {
      unreadable: "Não foi possível ler este arquivo. Confira se é um .docx ou um PDF válido e tente abrir de novo.",
      tracked_changes:
        "Este arquivo tem alterações controladas que ainda não foram aceitas nem rejeitadas, então não dá para " +
        "saber qual é o texto final. Aceite ou rejeite as alterações no editor, salve e abra o arquivo de novo.",
      scanned:
        "Este PDF é uma imagem digitalizada e não contém texto que possa ser lido. Abra o arquivo original em " +
        ".docx ou um PDF exportado pelo editor de texto.",
      columns:
        "Este PDF está diagramado em duas ou mais colunas, e a leitura misturaria o texto delas. Abra o original " +
        "em .docx ou um PDF com uma coluna só.",
      glued:
        "Na leitura deste PDF, as palavras saem grudadas umas nas outras, então o texto lido não é o que foi " +
        "escrito. Abra o arquivo original em .docx.",
      invariant:
        "Um número que está no PDF se perdeu na leitura, e o Lucid não audita um texto que pode ter sido lido " +
        "errado. Abra o arquivo original em .docx.",
      no_readable_content:
        "O Lucid não encontrou texto neste arquivo, então não há o que auditar. Confira se abriu o arquivo certo.",
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
      "As palavras obrigatórias ajudam a aplicar a seção 5.1 da norma, sobre relevância para o leitor. " +
      "Os limites numéricos de frase, parágrafo e título são do Lucid: a norma não fixa números.",
    settingsOpen: "Configurar análise",
    settingsClose: "Voltar à auditoria",
    settingsDone: "Aplicar e voltar",
    goToFindingsHint:
      "Aqui ficam os limites e o vocabulário que a análise usa para encontrar os pontos. Qualquer mudança " +
      "refaz a análise.",
    exportLabel: "Exportar",
    exportMenuLabel: "Formatos de exportação",
    provenanceTitle: (configHash, version) => `config ${configHash} · lucid ${version}`,
  },

  overview: {
    foundLabel: "O que a auditoria encontrou",
    movedLabel: "O que já mudou",
    seeChanges: "Ver as alterações",
    limitsLabel: "Limites desta análise",
    experimentalLimit: (name) =>
      `Análise em ${name}, experimental: sem validação em corpus independente, sem leiturabilidade, coesão ` +
      "nem reescrita por IA.",
    annotations: (n) => plural(n, "ponto para revisar", "pontos para revisar"),
    adjustedProfileBefore: "Esta auditoria usa um ",
    adjustedProfileStrong: "perfil personalizado",
    adjustedProfile: (deviations, disabled) =>
      `, com ${deviations} ${plural(deviations, "ajuste", "ajustes")} em relação ao padrão` +
      (disabled > 0 ? ` e ${disabled} ${plural(disabled, "critério desligado", "critérios desligados")}` : "") +
      ".",
    adjustedProfileAfter: "Por isso, o resultado não é comparável ao de uma auditoria com o perfil padrão.",
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
    printNote: "Abre a janela de impressão do navegador. Para ter um PDF, escolha “Salvar como PDF”.",
    exportDocx: "Baixar texto revisado (.docx)",
    exportDocumentMd: "Baixar texto revisado (.md)",
    printDocument: "Imprimir texto revisado",
    exportPdf: "Baixar texto revisado (.pdf)",
    exportPdfNote: "Diagramado pelo Lucid: A4, títulos, listas com os níveis do documento e tabelas paginadas.",
    pdfPageLabel: (page: number, total: number) => `${page} de ${total}`,
    pdfError: "Não foi possível gerar o PDF. Use a exportação em .txt.",
    groupAudit: "Auditoria",
    groupDocument: "Texto revisado",
    exportTxt: "Baixar texto (.txt)",
    docxError: "Não foi possível gerar o .docx. Use a exportação em .txt.",
    docxNote:
      "PDF e .docx saem com a mesma diagramação: mesmos tamanhos, espaços e hierarquia. Contêm o texto " +
      "revisado com títulos, listas e tabelas, inclusive linhas, colunas e células mescladas. Fica de fora o " +
      "resto da formatação original: negrito, imagens, cabeçalhos e rodapés. As fontes da marca não são " +
      "embutidas. Nenhum dos dois serve para voltar ao original: reimportar aqui não devolve a mesma estrutura.",
    importTables: (n: number) => `${n} ${n === 1 ? "tabela achatada" : "tabelas achatadas"}`,
    importTextBoxes: (n: number) => `${n} ${n === 1 ? "caixa de texto embutida" : "caixas de texto embutidas"}`,
    importRuledRegions: (n: number) =>
      `${n} ${n === 1 ? "região com grade, lida" : "regiões com grade, lidas"} como texto corrido`,
    importPdfTables: (n: number) =>
      `${n} ${n === 1 ? "tabela reconstruída" : "tabelas reconstruídas"} a partir da grade desenhada no arquivo`,
    importFurniture: (n: number) =>
      `${n} ${n === 1 ? "linha repetida de cabeçalho, rodapé ou número de página, deixada" : "linhas repetidas de cabeçalho, rodapé ou número de página, deixadas"} fora da auditoria`,
    importDehyphenated: (n: number) =>
      `${n} ${n === 1 ? "palavra partida por hífen no fim da linha, remontada" : "palavras partidas por hífen no fim da linha, remontadas"}`,
    importAnd: " e ",
    importAlso: ", ",
    importRecovered: (styles: string) => `Os títulos foram lidos dos estilos declarados no arquivo (${styles}).`,
    importInferred: (styles: string) =>
      `Alguns títulos foram deduzidos pelo nome do estilo (${styles}), porque o arquivo não declara o nível ` +
      "deles. Confira se algum parágrafo virou título por engano.",
    importFlattened: (what: string) =>
      `Na importação, isto virou texto corrido: ${what}. O texto entra na auditoria, mas a disposição ` +
      "original se perde.",
    importFromPdf: (what: string) =>
      `Na leitura do PDF: ${what}. Um PDF não declara estrutura; ele só desenha caracteres na página.`,
    importPdfInferred: (headings: number, items: number, references: string) =>
      `Neste PDF, ${headings} ${headings === 1 ? "título" : "títulos"} e ${items} ` +
      `${items === 1 ? "item de lista" : "itens de lista"} foram deduzidos, não lidos do arquivo: o Lucid se ` +
      `baseou nas regras de articulação de textos normativos (${references}) e no tamanho e na posição do ` +
      "texto na página. Confira se estão certos, porque o PDF só desenha o texto e não declara a estrutura.",
    importPdfRuled:
      "O Lucid só reconstrói uma tabela onde a grade está desenhada no PDF: os traços verticais definem as " +
      "colunas, os horizontais definem as linhas, e uma célula sem traço de um lado é tratada como mesclada. " +
      "Texto só alinhado em colunas, sem grade, continua como texto corrido, porque adivinhar as células " +
      "poderia mudar o que o texto diz.",
    structureMissing: { heading: "títulos", list: "listas" } as Record<string, string>,
    structureMissingJoin: " nem ",
    structureCaveat: (missing: string, count: number) =>
      `Este documento não tem ${missing}. Por isso, ${count} ` +
      `${plural(count, "critério não pôde", "critérios não puderam")} ser ` +
      `${plural(count, "avaliado", "avaliados")}. ` +
      `${plural(count, "Para avaliá-lo", "Para avaliá-los")}, abra um arquivo .docx que tenha essas ` +
      "estruturas ou marque os títulos com # e os itens de lista com -.",
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
      "Efeito indireto: mudou fora do trecho que você editou. Critérios de título comparam um bloco com outro, " +
      "então mexer em um pode mudar o resultado do vizinho.",
    balanceTypingNote:
      "Trecho reescrito à mão: a comparação vale para a região inteira editada, e dentro dela não dá para dizer " +
      "qual ocorrência é qual.",
    balanceCaveat:
      "Um peso menor não significa que o texto está aprovado. Esta comparação mostra apenas o que os critérios " +
      "encontraram antes e depois, não se o público compreendeu o texto.",
    trailLabel: "Alterações registradas",
    trailWeight: (before, after, changes) =>
      `Peso da auditoria ${before} → ${after} · ${changes} ${plural(changes, "alteração registrada", "alterações registradas")}`,
    trailCaveat:
      "Esta lista traz as alterações aplicadas na revisão e o que você digitou no modo Escrever, registrado como " +
      "“Trecho reescrito à mão” quando você sai desse modo. O relatório exportado traz a mesma lista.",
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
    entryWrittenHere: "Este documento foi escrito aqui, então não há texto original para comparar.",
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
      `${n} ${plural(n, "critério com realces ocultos (continua", "critérios com realces ocultos (continuam")} na auditoria)`,
    highlightsOff: "realces ocultos no documento",
    lexiconCaveat:
      "Os critérios identificam padrões específicos e ajudam na revisão, mas não substituem a avaliação de quem " +
      "escreveu o texto.",
    occurrences: (n) => `${n} ${plural(n, "ponto", "pontos")}`,
    distinct: (n) => `${n} ${plural(n, "trecho distinto", "trechos distintos")}`,
    hiddenByFilter: (n) => `${n} ${plural(n, "ponto", "pontos")} fora do filtro`,
    statePending: "Pendentes",
    stateSeen: "Revisados",
    stateDismissedOne: "Ignorado",
    stateDismissed: "Ignorados",
    searchLabel: "Buscar nos pontos",
    searchPlaceholder: "Buscar nos pontos…",

    moreFilters: "Mais filtros",
    fewerFilters: "Menos filtros",
    clearFilters: "limpar filtros",
    orderBySeverity: "por gravidade",
    orderByDocument: "por posição",
    batchLabel: "Em lote",
    batchClear: (n) => `Limpar as marcas ${plural(n, "deste ponto", `destes ${n} pontos`)}`,
    batchCaveat:
      "Marcar como revisado é feito um ponto de cada vez, porque a marca só vale se alguém olhou o ponto. Em " +
      "lote, só é possível limpar as marcas.",
    clearGroupMarks: (n) => `Limpar ${n} ${plural(n, "marca", "marcas")}`,
    scopeOn: "Filtrar por este critério",
    scopeOff: "Ver todos os critérios",
    scopeHint: (n) =>
      `A lista e a navegação ‹ › passam a percorrer só ${plural(n, "o único ponto", `os ${n} pontos`)} deste critério.`,
    markSeen: "Marcar como revisado",
    markSeenHint: "Marcar como revisado: você avaliou este ponto",
    markSeenNamed: (excerpt) => `Marcar “${excerpt}” como revisado`,
    dismiss: "Ignorar",
    dismissHint: "Ignorar: você não vai mexer neste ponto",
    dismissNamed: (excerpt) => `Ignorar “${excerpt}”`,
    unmark: "Desmarcar",
    unmarkHint: "Desmarcar: o ponto volta a ficar pendente",
    progress: (done, total) => `${done} de ${total} revisados`,
    pendingCount: (n) => `${n} ${plural(n, "pendente", "pendentes")}`,
    progressCaveat:
      "Essas marcações servem apenas para acompanhar sua revisão. Elas não alteram o resultado da auditoria nem " +
      "aprovam o texto.",
    progressTitle: (done, total) => `${done} de ${total} revisados`,
    absenceCaveat:
      "A ausência de anotações não é atestado de clareza: mostra só que os sinais que o Lucid procura não " +
      "apareceram.",
    zeroCurated:
      "Confere uma lista curada. Zero aqui quer dizer que nenhum item da lista apareceu, não que o texto esteja " +
      "livre do problema.",
    zeroProductive:
      "Reconhece o padrão no texto, sem depender de lista. Aqui, zero é uma medida: o padrão não apareceu.",
    zeroDeclared: (n: number) =>
      n === 0
        ? "Procura só os termos que você declarar no vocabulário da organização. Nenhum termo declarado ainda, " +
          "então este zero não mede nada."
        : `Procura só ${n === 1 ? "o termo que você declarou" : `os ${n} termos que você declarou`}. Outros termos não são procurados.`,
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
    engineOutput: (locale) => `Justificativa no idioma da análise · ${locale}`,
    engineOutputHint: "Esta justificativa é escrita no idioma da análise e não é traduzida junto com a interface.",
    navPrev: "Anterior (k)",
    navNext: "Próximo (j)",
    navOf: "de",
    panelLabel: "Auditoria",
    crumbAll: "Todos os critérios",
    crumbBackTo: (criterion) => `Voltar para a lista de ${criterion}`,
    backToList: "Voltar à lista",
    footerDeterministic: "Análise determinística · norma de referência:",

    safeHeader: "Troca direta · equivalente curado",
    declaredHeader: "Troca direta · equivalente declarado pela organização",
    declaredEquivalent: "equivalente registrado no vocabulário da organização",
    declaredApplyNote:
      "Este equivalente foi registrado pela sua organização, e o Lucid não verificou o sentido. Confira se ele " +
      "serve nesta frase antes de trocar. A troca vale só para esta ocorrência, e o Lucid audita o texto de " +
      "novo em seguida.",
    safeTerm: "Termo",
    safePlain: "Comum",
    safeEquivalent: "equivalente registrado no glossário do Lucid",
    safeApply: (term: string) => `Trocar por «${term}»`,
    safeApplyNote:
      "O registro no glossário não garante que o equivalente sirva nesta frase. Confira o sentido antes de " +
      "trocar. A troca vale só para esta ocorrência, e o Lucid audita o texto de novo em seguida.",
    safeNote:
      "O texto só muda se você clicar em “Trocar por”. Se a frase pedir outro ajuste, use “Editar ou colar " +
      "minha versão” abaixo.",

    humanHeader: "Exige decisão humana",
    humanLead:
      "Este ponto depende do contexto. Releia o trecho e decida se e como alterá-lo, preservando o sentido " +
      "original.",
    howToProceed: "Como seguir",

    manualOpen: "Editar ou colar minha versão",
    manualTitle: "Sua versão",
    manualUnitSentence: "esta frase",
    manualUnitParagraph: "este parágrafo",
    manualEditAria: (unit) => `Editar ${unit}`,
    manualVerify: "Verificar minha versão",
    manualVerifying: "Verificando…",
    manualNote:
      "Escreva ou cole sua versão e clique em “Verificar minha versão”. Ela passa pelas mesmas verificações da " +
      "reescrita por IA e só entra no texto se você decidir usá-la.",

    aiUnavailableForLocale:
      "A reescrita por IA ainda não existe para este idioma de análise, porque o Lucid só sabe verificar " +
      "propostas em português. Edite o trecho em “Editar ou colar minha versão”; o Lucid analisa o documento " +
      "de novo em seguida.",
    manualApplyUnverified: "Aplicar edição",
    manualUnverifiedNote:
      "Neste idioma de análise não há verificação da reescrita: a edição entra no texto sem as provas de " +
      "preservação (números, datas, agente declarado). Depois, o Lucid analisa o documento de novo.",
    aiTitle: "Reescrita por IA",
    aiTarget: (unit) => `A IA vai reescrever ${unit}, em destaque no documento, e o Lucid vai verificar a proposta.`,
    proposerManual: "sua edição",
    aiRun: "Gerar e verificar",
    aiRunning: "Gerando e verificando…",
    aiFailed: (message) => `Não foi possível gerar a reescrita: ${message}.`,
    aiFailedGeneric: "erro inesperado",
    aiErrorKind: {
      authentication:
        "O servidor não conseguiu se autenticar no provedor do modelo, então não há proposta. A auditoria " +
        "determinística continua completa.",
      quota:
        "A cota do provedor do modelo acabou, então não há proposta agora. A auditoria determinística continua completa.",
      rate_limit:
        "O provedor do modelo pediu para esperar antes de uma nova tentativa. Tente de novo em alguns instantes.",
      model_unavailable: "O modelo configurado não está disponível no provedor, então não há proposta.",
      invalid_request: "O provedor recusou a configuração enviada ao modelo, então não há proposta.",
      incomplete: "O modelo interrompeu a resposta antes do fim, então não há proposta utilizável. Nada foi aplicado.",
      empty: "O modelo respondeu sem conteúdo, então não há proposta. Nada foi aplicado.",
      unusable:
        "O modelo não devolveu uma proposta utilizável. Nada foi aplicado; tente de novo ou edite o trecho você mesmo.",
      network: "Não foi possível falar com o provedor do modelo. Verifique a conexão e tente de novo.",
      server: "O provedor do modelo falhou ao responder. Tente de novo em alguns instantes.",
    },
    aiNoProposal:
      "A IA devolveu o trecho sem mudanças, então não há proposta para verificar. Tente de novo ou edite o " +
      "trecho você mesmo.",

    verdictLabel: "O Lucid verificou",
    verdictDivergent: "Há divergência entre o trecho original e a proposta. Confira antes de usar.",
    verdictEffect: "O Lucid ainda aponta problemas no trecho reescrito.",
    verdictNoDivergence: "O Lucid não encontrou divergência no que verifica.",
    verdictWords: "palavras",
    verdictMeasureNotApproval: "medição, não aprovação",
    groupNotConfirmed: "Não confirmado",
    groupAddition: "Acréscimo para conferir",
    groupEffect: "Efeito no texto",
    groupSignals: "Sinais (não são provas)",
    groupConfirmed: "Confirmado",
    groupNotApplicable: "Não se aplica",
    groupNotVerified: "Não verificado",
    notVerifiedLead: "O Lucid não verifica",
    evaluatedExcerpt: "Trecho avaliado",
    checksShow: (count) => `Ver ${plural(count, "a outra verificação", `as outras ${count} verificações`)}`,
    checksHide: "Ocultar as outras verificações",
    proposerTitle: "modelo + versão do prompt",
    applyStale: "O trecho mudou: gere de novo",
    applyBlocked: "Usar mesmo assim como rascunho",
    apply: "Usar como rascunho",
    applyStaleNote:
      "O trecho foi editado depois que esta versão foi gerada. Para não perder sua edição, gere de novo antes de aplicar.",
    applyBlockedNote:
      "Se você entendeu o motivo acima e ainda quer usar esta versão, aplique como rascunho. O Lucid audita o " +
      "texto de novo em seguida.",
    applyNote: "Releia antes de usar. A decisão de aplicar é sua.",
  },

  guidance: {
    generic: "Releia o trecho e decida se e como reescrevê-lo. O Lucid aponta a construção, mas não reescreve o texto.",
    passivaSintetica:
      "Se for voz passiva, reescreva com quem age como sujeito (“aplica-se a multa” → “o órgão aplica a multa”). " +
      "Quem age é uma informação que precisa vir de você. Se o “se” for reflexivo, ou se a forma impessoal for " +
      "intencional, ignore este ponto.",
    nominalizacaoEncadeada:
      "Para escrever a ação como verbo, use o verbo correspondente: “a verificação das informações” → “verificar as " +
      "informações”. Às vezes o verbo pede alguém que pratique a ação; se o texto não disser quem é, essa " +
      "informação precisa vir de você. Não é preciso mudar todas. Veja quais podem ser escritas de forma mais direta.",
    siglaSemExpansao:
      "Na primeira vez que a sigla aparece, escreva o nome por extenso seguido da sigla entre parênteses: “Nome " +
      "por Extenso (SIGLA)”. Depois, use só a sigla. O Lucid não sabe o que a sigla significa: o nome por " +
      "extenso precisa vir de você.",
    redundancia:
      "Corte o termo que repete o sentido do outro. Se esta nota indicar uma forma enxuta, confira se ela mantém " +
      "o sentido nesta frase.",
    perifraseInflada:
      "Troque a locução por uma forma mais curta. Se esta nota indicar uma forma enxuta, confira se a regência " +
      "do que vem depois continua certa.",
    duplaNegacao:
      "Diga de forma afirmativa o que a dupla negação quer dizer. Se esta nota indicar uma forma afirmativa, " +
      "confira se ela mantém a nuance que você quis dar.",
    maisQuePerfeito:
      "Use a forma composta, mais comum: “tinha feito” no lugar de “fizera”. Reconjugue o verbo com o auxiliar " +
      "e confira a concordância.",
    gerundismo:
      "Troque o gerúndio encadeado pelo futuro simples ou pelo presente: “enviaremos” ou “enviamos” no lugar de " +
      "“vamos estar enviando”.",
    adverbioMenteDenso:
      "Corte ou substitua alguns advérbios em -mente: o excesso pesa a leitura. Quais tirar depende da ênfase " +
      "que você quer. (Critério descontinuado; use “Advérbios vagos”.)",
    adverbiosVagos:
      "Leia a frase sem o advérbio (“basicamente”, “efetivamente”, “realmente”…). Se o sentido não mudar, ele é " +
      "só reforço e pode sair.",
    mesoclise:
      "Reescreva sem a mesóclise, com a forma comum do verbo: “vai lhe dar” no lugar de “dar-lhe-á”, “o órgão " +
      "fará” no lugar de “far-se-á”.",
    paragraphLength:
      "Divida o parágrafo em blocos menores, com um grupo de ideias em cada um. Um bom lugar para cortar é onde " +
      "o assunto muda.",
    proseEnumeration:
      "Transforme os itens citados no meio do texto em uma lista com marcadores, para o leitor encontrar cada " +
      "um com facilidade.",
    saltoDeNivelTitulo:
      "A hierarquia de títulos pulou um nível. Mude este título para o nível logo abaixo do título anterior ou " +
      "crie o título intermediário que falta. Assim o sumário e a navegação pela estrutura ficam previsíveis.",
    longHeading:
      "Encurte o título até ele virar um rótulo que ajude o leitor a localizar a seção. Se o título termina " +
      "com ponto final, como uma frase, tire o ponto e deixe só o essencial.",
    vocabularioDaOrganizacao:
      "Este termo está no vocabulário que a sua organização declarou como pouco familiar ao leitor, sem " +
      "equivalente registrado. Troque-o por uma palavra comum ou, se o termo técnico for obrigatório, explique-o " +
      "na primeira vez que ele aparece.",
    singleItemList:
      "Uma lista com um item só não organiza nada. Acrescente os itens que faltam ou passe o conteúdo para o " +
      "texto corrido.",
    jargon:
      "Troque o termo por uma palavra comum ou explique-o na primeira vez que ele aparece. Se esta nota citar um " +
      "equivalente possível, confira se ele cabe nesta frase: o sentido e a construção do que vem depois precisam " +
      "continuar certos.",

    nominalizationBaseVerb: (verb) => `Verbo registrado na lista do Lucid: “${verb}”.`,
    nominalizationBody:
      "Para escrever com o verbo correspondente, conjugue-o e ajuste o complemento, como em “fazer a análise” → " +
      "“analisar”. Se a construção estiver clara como está, marque o ponto como revisado.",

    readerNamed: (noun) => `O texto fala de “${noun}” em terceira pessoa. Para `,
    readerUnnamed: "O texto fala do leitor em terceira pessoa. Para ",
    readerBodyStrong: "falar diretamente com o leitor",
    readerBody:
      ", use “você deve…” ou o imperativo (“apresente…”, “compareça…”). Isso muda o tom do texto: avalie se " +
      "combina com o documento.",

    subordinationCount: (clauses) => `${clauses} orações subordinadas`,
    subordinationTrapped: " na mesma frase. ",
    subordinationBody:
      "Separe em frases mais curtas, com uma ideia em cada. O início de cada oração subordinada costuma ser um " +
      "bom ponto de corte.",

    longSentenceLead: "O Lucid ",
    longSentenceLeadStrong: "conta as palavras",
    longSentenceWithCuts: " da frase e ",
    longSentenceWithCutsStrong: "mostra abaixo onde ela pode ser dividida",
    longSentenceWithCutsTail: ", se você concluir que ela tem mais de uma ideia. Dividir não é obrigatório.",
    longSentenceNoCuts:
      " da frase, mas não encontrou um ponto óbvio de divisão. Se ela tiver mais de uma ideia, escolha onde " +
      "separar.",
    statWords: "palavras",
    statTrigger: "gatilho",
    statTriggerNote: "parâmetro do Lucid",
    statTriggerNoteProvisional: "provisório",
    standardSaysLabel: "A norma pede",
    standardSays: (standard) =>
      "frases concisas, uma ideia por frase e variação de tamanho ao longo do texto, sem fixar um número de " +
      `palavras (${standard}, 5.3.4).`,
    parameterSaysLabel: "O Lucid inspeciona",
    parameterSays: (threshold) =>
      `frases acima de ${threshold} palavras. Esse limite é do Lucid, não da norma, e pode ser ajustado em ` +
      "“Configurar análise”. Passar dele não significa que a frase esteja inadequada.",
    parameterSaysProvisional: (threshold) =>
      `frases acima de ${threshold} palavras. Esse limite é do Lucid e ainda é provisório neste idioma de ` +
      "análise, sem validação. Passar dele não significa que a frase esteja inadequada.",
    coOccurringLabel: "Outros sinais nesta frase",
    coOccurringNote: "Cada sinal tem seu próprio critério e sua própria justificativa. Eles não se somam numa nota.",
    coOccurringNone:
      "O Lucid não encontrou outros sinais nesta frase. Isso não quer dizer que ela esteja clara, só que os " +
      "sinais que ele procura não apareceram.",
    cutsAvailable: (n) => (n === 1 ? "1 divisão possível" : `${n} divisões possíveis`),
    cutsInformationNotAction: "informação, não ação",
    cutLabel: (i, boundary) => `divisão ${i} · ${boundary}`,
    cutsNote: "Se decidir dividir, escreva sua versão em “Editar ou colar minha versão” ou peça uma proposta à IA.",
    boundarySemicolon: "ponto e vírgula",
    boundaryDash: "travessão",
    boundaryCommaConjunction: (marker) => `vírgula antes de “${marker}”`,

    passiveWithAgent:
      "O texto já diz quem pratica a ação. Para passar à voz ativa, coloque quem age como sujeito e reconjugue " +
      "o verbo (“o recurso foi analisado pela equipe” → “a equipe analisou o recurso”). Escreva sua versão " +
      "abaixo ou peça uma proposta à IA; o Lucid verifica o resultado.",
    passiveNoAgentLead: "Se a frase não diz quem praticou a ação, reescreva nomeando quem a praticou.",
    passiveNoAgentBody: " Para pedir essa versão à IA, informe o agente em ",
    passiveNoAgentRequirement: ", logo abaixo: sem essa informação, a IA teria de inventar quem agiu.",
    scaffoldLead: "O Lucid identificou no texto os papéis para montar a voz ativa. Use-os como ",
    scaffoldLeadStrong: "guia, não como frase pronta",
    scaffoldLeadTail: ": confira cada campo antes de escrever sua versão.",
    scaffoldAgent: "Agente",
    scaffoldAgentHint: "vira o sujeito",
    scaffoldAction: "Ação",
    scaffoldActionHint: "vira o verbo",
    scaffoldPickVerb: "→ escolha o verbo",
    scaffoldObject: "Objeto",
    scaffoldObjectHint: "o que sofreu a ação",
    scaffoldObjectPlaceholder: "você preenche",
    scaffoldNote:
      "Para a voz ativa, coloque o agente como sujeito, conjugue o verbo e ponha o objeto depois dele. Escreva " +
      "sua versão abaixo ou peça uma proposta à IA; o Lucid verifica o resultado.",
    agentQuestion: "Quem pratica essa ação?",
    agentQuestionHint:
      "A IA vai usar a resposta como sujeito da nova versão. Se a frase já diz quem agiu, deixe em branco.",
    agentPlaceholder: "Ex.: a comissão",
    agentKeepImpersonal: "O agente não deve ser nomeado (manter impessoal)",
    agentRecordedKeep:
      "A construção fica impessoal: a IA não vai inventar um agente, e a verificação não exige voz ativa.",
    agentRecorded: (agent) =>
      `A IA vai usar «${agent}» como quem pratica a ação, e o Lucid confere se a nova versão, da IA ou sua, ` +
      "o nomeia.",
  },

  vocabulary: {
    label: "Vocabulário da organização",
    chip: "declarado por você",
    lead:
      "Declare aqui os termos da sua organização que o leitor pode não conhecer. O Lucid passa a procurá-los em " +
      "todo documento auditado com este vocabulário. O glossário do Lucid é pequeno de propósito, só com termos " +
      "verificados um a um, e não conhece as palavras da sua organização.",
    fromSelection: "Do trecho selecionado no documento:",
    useSelection: "Usar este trecho como termo",
    termLabel: "Termo",
    termPlaceholder: "Ex.: termo de fomento",
    plainLabel: "Equivalente simples",
    plainHint:
      "Deixe em branco se não houver um equivalente que sirva em todos os usos do termo. Sem equivalente, o termo " +
      "só é sinalizado.",
    plainPlaceholder: "Ex.: acordo de repasse",
    reasonLabel: "Motivo",
    reasonPlaceholder: "Ex.: ninguém fora da administração usa esta expressão",
    add: "Declarar termo",
    duplicate: "Este termo já está declarado.",
    declaredLabel: (n: number) => `${n} ${n === 1 ? "termo declarado" : "termos declarados"}`,
    occurrences: (n: number) => `· ${n} ${n === 1 ? "ocorrência" : "ocorrências"}`,
    signalOnly: "Sem equivalente registrado: só sinaliza, não propõe troca.",
    swapsTo: (plain: string) => `Equivalente registrado: “${plain}”.`,
    remove: (term: string) => `Remover “${term}” do vocabulário`,
    authorityCaveat:
      "Estes termos são responsabilidade da sua organização, não da norma: nunca citam cláusula da ISO 24495-1 e " +
      "aparecem separados do glossário do Lucid no relatório. O vocabulário fica registrado junto com a análise, " +
      "então todo resultado mostra com que termos foi medido.",
  },
  briefing: {
    label: "Palavras e expressões obrigatórias",
    chip: "O Lucid procura no texto",
    lead:
      "Adicione as palavras ou expressões que precisam aparecer no texto. O Lucid procura cada uma exatamente " +
      "como você escreveu e mostra onde ela aparece, ou avisa quando não a encontra.",
    audienceLabel: "Para quem este texto foi escrito?",
    audienceHint: "Quem vai ler de verdade, não quem assina.",
    audiencePlaceholder: "Ex.: cidadão sem formação jurídica que pede o benefício pela primeira vez",
    purposeLabel: "O que essa pessoa precisa fazer?",
    purposeHint: "A ação concreta que o texto tem que viabilizar.",
    purposePlaceholder: "Ex.: saber se tem direito e reunir os documentos no prazo",
    priorLabel: "O que ela já sabe sobre o assunto?",
    priorHint: "O que dá para pressupor e, portanto, o que precisa ser explicado.",
    priorPlaceholder: "Ex.: sabe que existe um benefício; não conhece o vocabulário do processo",
    mustFindLabel: "Qual palavra ou expressão deve aparecer?",
    mustFindHint: "Adicione uma expressão por vez. A busca ignora maiúsculas e minúsculas, mas considera os acentos.",
    mustFindPlaceholder: "Ex.: prazo para recurso",
    addExpression: "Adicionar expressão",
    presenceLabel: "Ocorrências no documento",
    occurrences: (n) => `${n} ${plural(n, "ocorrência", "ocorrências")}`,
    notFound: "Não encontrada",
    showOccurrences: (expression, n) =>
      `Ver “${expression}” no documento (${n} ${plural(n, "ocorrência", "ocorrências")})`,
    occurrencePosition: (index, total) => `${index} de ${total}`,
    occurrenceNav: (expression) => `Ocorrências de “${expression}”`,
    prevOccurrence: (expression) => `Ocorrência anterior de “${expression}”`,
    nextOccurrence: (expression) => `Próxima ocorrência de “${expression}”`,
    removeNamed: (expression) => `Remover “${expression}”`,
    literalCaveat:
      "Encontrar não garante que o leitor vai entender; não encontrar pode significar só que o texto diz " +
      "de outro jeito. Esta lista é sua e não altera o placar.",
  },

  reportRecord: {
    menuItem: "Informações do relatório",
    menuNote: "Opcional: entra no relatório exportado, não na análise.",
    title: "Informações do relatório",
    optionalTag: "Opcional",
    lead:
      "Registre para quem o texto foi escrito, o que essa pessoa precisa fazer depois da leitura e o que " +
      "ela já sabe sobre o assunto.",
    caveat: "O Lucid guarda estas respostas no relatório exportado, mas não as verifica: são registro, não medição.",
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
      purpose: "Teste opcional com IA. Nunca produz aprovação: só aponta onde um leitor pode travar.",
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
      `O percurso agrupa ${plural(found, "o único ponto", `os ${found} pontos`)} em ${steps} ` +
      `${plural(steps, "etapa", "etapas")}: um critério de cada vez, do mais grave ao mais leve.`,
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
      "Concluir o percurso não aprova o texto. Um ponto revisado é um ponto que você examinou; um ponto " +
      "resolvido é um ponto que saiu do texto. A auditoria só muda quando o texto muda.",
    allDoneNext: "O que você revisou fica registrado no relatório, em Exportar › Auditoria.",
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
    swapShortcut: (n) => plural(n, "Ver a única troca direta", `Ver as ${n} trocas diretas`),
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

  decision: {
    label: "Decisão registrada",
    kinds: { seen: "Revisado", dismissed: "Ignorado" },
    fieldLabel: "Por que você manteve este ponto",
    placeholder: "Por que manter este ponto? (opcional)",
    caveat:
      "É um registro seu, não uma medição do Lucid: não altera o placar nem o resultado da auditoria. Entra no " +
      "relatório como decisão humana.",
    reportPointer: "Aparece em Exportar › Auditoria, na seção “Pontos examinados e mantidos”.",
  },

  changes: {
    emptyTitle: "Nenhuma alteração ainda",
    emptyBody:
      "Quando você aplicar uma troca direta, usar uma versão verificada ou editar o texto, a alteração aparece " +
      "aqui com o antes, o depois e o efeito nos critérios.",
    listLabel: "Alterações aplicadas",
    effectLabel: "Efeito nos critérios",
    usedAnyway: "Usado mesmo assim, com estas divergências",
    detailsShow: "Ver detalhes da alteração",
    detailsHide: "Ocultar detalhes da alteração",
    undoLast: "Desfazer esta alteração",
    weightMeaning:
      "O peso soma a gravidade dos pontos encontrados (prioritário 3, atenção 1, observação 0,3) e serve para " +
      "comparar o texto com ele mesmo, antes e depois de uma alteração. Um peso menor não significa que o texto " +
      "está aprovado: mostra apenas o que os critérios automáticos encontraram, não se o público compreendeu o texto.",
    stillOpen: (n) => `${n} ${plural(n, "ponto continua no texto", "pontos continuam no texto")}`,
    none: "Nenhum critério mudou de contagem.",
  },

  baseline: {
    label: "Ponto de partida",
    saveAction: "Salvar ponto de partida…",
    attachAction: "Anexar ponto de partida",
    detach: "Desanexar",
    dialogTitle: "Salvar ponto de partida",
    dialogLead:
      "Guarda esta auditoria para comparar com uma versão futura do mesmo documento, mesmo depois de o texto ser " +
      "reescrito fora do Lucid.",
    titleLabel: "Nome do documento",
    titleHint:
      "Obrigatório. É o único nome que o arquivo salvo carrega: o Lucid não guarda o nome do arquivo que você abriu.",
    titlePlaceholder: "Ex.: Edital 04/2026, versão enviada à procuradoria",
    fileNotice:
      "Este arquivo contém o documento inteiro: o texto, a estrutura, a auditoria desta sessão e os motivos que " +
      "você registrou. Ele fica no seu computador e não é enviado a lugar nenhum, mas trate-o como trataria o " +
      "próprio documento ao compartilhá-lo.",
    save: "Salvar arquivo",
    savedAt: (when) => `salvo em ${when}`,
    emptyLead:
      "Anexe um ponto de partida salvo em uma auditoria anterior para comparar esta versão com ela, inclusive " +
      "quando o texto foi reescrito fora do Lucid.",
    sameRuler:
      "A régua é a mesma nos dois lados: o texto do ponto de partida foi analisado de novo com os critérios, o " +
      "perfil e os dados em vigor agora. Nenhum número abaixo compara medições feitas com réguas diferentes.",
    historical: (count) => `${count} ${plural(count, "ponto na auditoria da época", "pontos na auditoria da época")}`,
    rebased: (count) => `${count} ${plural(count, "ponto agora", "pontos agora")}, com a régua atual`,
    engineDrift: (delta) =>
      `${Math.abs(delta)} ${plural(Math.abs(delta), "ponto de diferença vem", "pontos de diferença vêm")} da mudança ` +
      "da régua, não do texto.",
    divergenceLabel: "O que mudou na régua desde então",
    divergenceFields: {
      lucidVersion: "versão do Lucid",
      localeId: "idioma",
      configHash: "perfil editorial",
      dataHash: "dados curados",
      standardVersion: "versão da norma",
    },
    adoptProfile: "Adotar o perfil do ponto de partida",
    adoptProfileHint:
      "A comparação usa o perfil em vigor agora. Adotar o perfil salvo refaz a auditoria inteira com os limiares " +
      "que estavam valendo lá.",
    stillThereLabel: "O que você apontou e continua lá",
    stillThereCount: (n) => `${n} ${plural(n, "ponto continua", "pontos continuam")}`,
    stillThereLead:
      "Trechos que a auditoria anterior apontou e que a versão atual aponta de novo, palavra por palavra. Esta " +
      "lista não afirma que nada foi resolvido: ela diz apenas o que sobreviveu.",
    stillThereNone: "Nenhum dos trechos apontados antes aparece de novo com as mesmas palavras.",
    occurrences: (n) => `${n}×`,
    alreadyDecided: { seen: "já examinado e mantido", dismissed: "já ignorado" },
    noReason: "sem motivo registrado",
    refusal: {
      unreadable:
        "Este arquivo não é um ponto de partida do Lucid, ou foi alterado depois de salvo. Escolha um arquivo " +
        "gerado em “Salvar ponto de partida”.",
      schema: "Este ponto de partida foi salvo num formato que esta versão do Lucid não consegue ler.",
      locale:
        "Este ponto de partida foi auditado em outro idioma de análise, então não dá para comparar. Para " +
        "comparar, mude o idioma da análise para o mesmo do ponto de partida.",
    },
    caveat:
      "Entre duas versões editadas fora do Lucid não é possível dizer qual edição produziu qual mudança. Os " +
      "números são contagens do mesmo detector sobre dois textos, e peso menor não é aprovação.",
  },

  metricsView: {
    notAScore:
      "Estas medidas descrevem a superfície do texto. Elas apoiam a leitura dos critérios e nunca substituem " +
      "a avaliação de quem escreveu, nem indicam aprovação.",
    tablesLabel: "Fora das médias",
    tablesApart: (tables, cells, words) =>
      `${tables} ${tables === 1 ? "tabela" : "tabelas"}, ${cells} ${cells === 1 ? "célula" : "células"} e ` +
      `${words} ${words === 1 ? "palavra" : "palavras"} ficam fora dos números acima.`,
    tablesAudited:
      "Uma célula não é uma frase: contá-la como texto corrido encurtaria a média de palavras por frase e " +
      "mudaria a legibilidade sem que o texto tivesse mudado. O texto das células continua sendo auditado pelos " +
      "critérios.",
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
        meaning: "Quantas frases o Lucid encontrou no texto.",
        direction: "Nem maior nem menor é melhor.",
        limit: "Abreviações e listas podem deslocar a contagem em textos muito fragmentados.",
      },
      wordsPerSentence: {
        meaning: "Média de palavras por frase.",
        direction: "Média alta costuma acompanhar frases que acumulam ideias: é um sinal, não um defeito.",
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
    lead:
      "Escolha a finalidade do texto para usar um conjunto de limites adequado a ela. Os limites são do Lucid, " +
      "não da norma, que não fixa números. Um placar só vale dentro do conjunto de limites que o gerou.",
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
        "Lei, decreto, edital, contrato. Aceita frases e parágrafos mais longos, porque a estrutura jurídica os impõe, e continua apontando jargão, passiva e ações escritas como substantivos.",
      publico:
        "Texto escrito para quem não é da área. Frase curta, parágrafo curto e pouca subordinação; é o perfil mais exigente do conjunto.",
      digital:
        "Texto que se lê na tela, aos saltos. Cobra parágrafo curto e título curto, porque a pessoa varre a página antes de ler.",
    },
    limits: {
      base: "Comparável a qualquer outro placar padrão.",
      normativo:
        "Um placar deste perfil não é comparável ao do perfil padrão nem ao dos outros: o mesmo texto tem menos frases longas aqui porque o limite é outro.",
      publico:
        "Aplicado a texto jurídico, este perfil aponta quase toda frase. Isso não é defeito do texto nem do perfil: é o perfil errado para aquele documento.",
      digital:
        "Em texto sem títulos nem listas, os critérios de título e de lista ficam sem objeto, e o placar não diz nada sobre eles.",
    },
    changes: (n) => `${n} ${plural(n, "diferença", "diferenças")} em relação ao padrão`,
    noChanges: "É a configuração de referência.",
    caveat:
      "Trocar a finalidade muda o que é medido, não o texto. Dois placares só são comparáveis se tiverem o mesmo perfil e o mesmo hash.",
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
    provisionalTag: "provisório",
    provisionalNote:
      "Os limiares marcados como provisórios não foram validados para este idioma de análise. Passe o cursor " +
      "sobre a marca para ver de onde cada número veio.",
    knobSentenceWarn: "Inspecionar frases acima de",
    knobParagraph: "Parágrafo longo, em frases: acima de",
    knobHeading: "Título longo, em palavras: acima de",
    knobSubordination: "Subordinação densa, em orações: a partir de",
    knobChainedNominalization: "Ações escritas como substantivos, na mesma frase: a partir de",
    knobProseEnumeration: "Enumeração em prosa, em itens: a partir de",
  },

  send: {
    always: "Ao continuar, o documento será enviado a um serviço externo de IA.",
    found: (named: string) => `Encontramos ${named} no documento.`,
    limit: "Revise o conteúdo antes de continuar: outros dados pessoais podem não ser detectados.",
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
      "Selecione um trecho no documento ao lado. O teste lê só o trecho que você escolher, não o documento inteiro.",
    excerptLabel: "Trecho que será enviado",
    clearExcerpt: "limpar",
    onlyThisExcerpt: "O teste responde só com o que está neste trecho.",
    excerptTooLong: (chars, max) =>
      `Trecho com ${chars.toLocaleString("pt-BR")} caracteres, acima do limite de ${max.toLocaleString("pt-BR")}. Selecione um trecho menor.`,
    useBriefingPurpose: "Usar o que você registrou sobre o que o leitor precisa fazer:",
    questionLabel: "O que o leitor precisa encontrar no texto?",
    questionPlaceholder: "Ex.: Quando o prazo começa?",
    run: "Testar compreensão",
    httpFailure: (status) => `falha (HTTP ${status})`,
    running: "Testando…",
    staleWarning: "O texto mudou depois deste teste, então o resultado abaixo é do trecho anterior. Teste de novo.",
    stuck: "A resposta não foi encontrada no texto.",
    excerpt: "trecho:",
    extracted: "Resposta encontrada:",
    noFloorViolation: "A resposta foi encontrada no texto.",
    loadLabel: "Carga de leitura",
    caveat:
      "Este teste usa IA e pode errar. Encontrar a resposta não garante que o texto esteja claro: só um teste " +
      "com leitores reais confirma isso.",
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
      "Escreva ou cole o seu texto. A auditoria acontece enquanto você escreve, critério por critério, sem reescrever nada no seu lugar.",
    headingLevel: (level) => `Título · nível ${level}`,
    list: "Lista",
    orderedList: "Lista numerada",
    listItems: (n) => (n === 1 ? " · 1 item" : ` · ${n} itens`),
    listLevels: (n) => ` · ${n} níveis`,
    table: "Tabela",
    tableShape: (rows, columns) =>
      ` · ${rows} ${rows === 1 ? "linha" : "linhas"} × ${columns} ${columns === 1 ? "coluna" : "colunas"}`,
    tableLabel: "Tabela do documento",
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
    editorialExtension: (locale) => `Extensão editorial ${locale}`,
    editorialExtensionTag: (locale) => locale,
    editorialExtensionTitle: (locale) => `Extensão editorial ${locale}: não vem da norma ISO`,
    organizational: "Vocabulário da organização",
    organizationalTag: "declarado",
    organizationalTitle:
      "Termo declarado pela sua organização. Não vem da norma nem cita cláusula: quem afirma que ele dificulta a leitura é quem conhece o leitor.",
    structuralHeuristic: "Heurística estrutural",
    structuralHeuristicTag: "estrut.",
    structuralHeuristicTitle: "Heurística estrutural: não vem da norma ISO",
  },

  ledger: {
    manual: "Edição do autor",
    ai: "Reescrita por IA",
    glossary: "Troca direta do glossário",
    attested: "Troca atestada por fonte",
    typing: "Trecho reescrito à mão",
  },

  analysisLocale: {
    label: "Idioma da análise",
    lead:
      "O idioma do documento auditado. É independente do idioma da interface: dá para ler o Lucid em " +
      "português e auditar um texto em inglês, ou o contrário.",
    current: "Auditando como",
    onlyOne: "Hoje só existe um idioma de análise. Quando houver outro, ele aparece aqui.",
    switchWarning:
      "Trocar o idioma analisa o documento de novo com os critérios do outro idioma. Se houver trabalho feito, " +
      "o Lucid pergunta antes e mostra o que seria descartado.",
    name: { "pt-BR": "Português (Brasil)", "en-US": "Inglês (EUA)" },
    experimentalTag: "experimental",
    experimentalNote:
      "Catálogo experimental. Nenhum critério foi validado em corpus independente: os testes que existem foram " +
      "escritos junto com os detectores e só evitam regressões. Neste idioma não há leiturabilidade, coesão nem " +
      "reescrita por IA, e a análise só existe nesta interface: a CLI analisa apenas pt-BR.",
    switchDialog: {
      title: (target) => `Trocar o idioma da análise para ${target}?`,
      lead: "Estes itens pertencem à análise atual e serão descartados:",
      changes: (n) => `${n} ${plural(n, "alteração registrada", "alterações registradas")}`,
      reviewed: (n) => `${n} ${plural(n, "ponto revisado ou ignorado", "pontos revisados ou ignorados")}`,
      baseline: "o ponto de partida anexado",
      vocabulary: (n) => `${n} ${plural(n, "termo", "termos")} do vocabulário da organização`,
      profile: (name) => `o perfil editorial “${name}”`,
      adjustments: (n) => `${n} ${plural(n, "ajuste de limite", "ajustes de limite")}`,
      kept:
        "O documento, as informações do relatório e as palavras obrigatórias continuam. O texto é analisado de " +
        "novo no idioma escolhido.",
      cancel: "Cancelar",
      confirm: "Trocar idioma e reanalisar",
    },
  },

  readability: {
    unavailable: "indisponível neste idioma",
    unavailableWhy:
      "O Lucid ainda não tem uma medida de legibilidade validada para este idioma de análise, por isso não mostra " +
      "nenhum valor. Isso não indica que o texto seja fácil nem que a medição tenha falhado.",
    noMeasure: "sem medida",
    noWords: "Não há palavras para medir, então nenhum valor foi calculado (não é zero).",
    noSentences: "Não há frase delimitada para medir, então nenhum valor foi calculado (não é zero).",
    smallSample: (words, threshold) =>
      `Amostra pequena: ${words} ${plural(words, "palavra", "palavras")}. A fórmula foi feita para texto corrido; ` +
      `com menos de ${threshold} palavras, uma única palavra muda o índice em dezenas de pontos.`,
    sentenceBoundaryMissing: (wordsPerSentence, threshold) =>
      `${wordsPerSentence} palavras por frase, acima do máximo plausível de ${threshold}: o Lucid não encontrou ` +
      "onde as frases terminam. Provavelmente falta pontuação no texto colado.",
    syllablesImpossible: (syllablesPerWord, threshold) =>
      `${syllablesPerWord} sílabas por palavra, acima do máximo plausível de ${threshold}: há no texto sequências ` +
      "de letras que não são palavras do português (a palavra mais longa do idioma tem 18 sílabas).",
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
