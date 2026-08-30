import type { ClauseTree } from "@/lucid/core/coverage/types";

const OVERVIEW =
  "Cláusula de visão geral: apresenta o princípio e remete às diretrizes seguintes, sem enunciar " +
  "uma diretriz própria que se possa verificar num texto.";

export const CLAUSE_TREE: ClauseTree = {
  standard: "ABNT NBR ISO 24495-1:2024",
  transcription:
    "Seção 5 (Diretrizes) transcrita por inteiro — os quatro princípios e as 23 subcláusulas de 5.1 a " +
    "5.4 — com os títulos conferidos contra o texto normativo. As seções 1 a 4 (Escopo, Referências " +
    "normativas, Termos e definições, Princípios norteadores) e os Anexos A e B não estão nesta " +
    "árvore, e a ausência delas aqui não afirma que não existam. Por isso `exhaustive` continua " +
    "`false` e nenhuma fração de cobertura é publicada.",
  exhaustive: false,
  nodes: [
    {
      section: "5.1",
      title: "Diretrizes para o Princípio 1: Os leitores obtêm o que precisam (relevante)",
      parent: null,
      principleGroup: "relevant",
      provisional: false,
    },
    {
      section: "5.1.1",
      title: "Visão geral",
      parent: "5.1",
      principleGroup: "relevant",
      provisional: false,
      limit: { kind: "out_of_reach", reason: OVERVIEW },
    },
    {
      section: "5.1.2",
      title: "Identifique os leitores",
      parent: "5.1",
      principleGroup: "relevant",
      provisional: false,
      limit: {
        kind: "out_of_reach",
        reason:
          "Quem é o leitor não é propriedade do texto. Nenhuma regra lê num documento a população que " +
          "ele pretende alcançar, e um texto pode nomear um público e ser escrito para outro.",
      },
    },
    {
      section: "5.1.3",
      title: "Identifique o objetivo dos leitores",
      parent: "5.1",
      principleGroup: "relevant",
      provisional: false,
      limit: {
        kind: "out_of_reach",
        reason:
          "O que o leitor veio fazer está no leitor, não no documento. O texto não carrega a pergunta " +
          "que alguém trouxe até ele.",
      },
    },
    {
      section: "5.1.4",
      title: "Identifique o contexto no qual os leitores lerão o documento",
      parent: "5.1",
      principleGroup: "relevant",
      provisional: false,
      limit: {
        kind: "out_of_reach",
        reason:
          "Onde, quando e sob que pressão o documento será lido é circunstância de uso, e não deixa " +
          "marca no texto que uma regra possa ler.",
      },
    },
    {
      section: "5.1.5",
      title: "Selecione o tipo ou tipos de documento",
      parent: "5.1",
      principleGroup: "relevant",
      provisional: false,
      limit: {
        kind: "out_of_reach",
        reason:
          "Se o formato escolhido é o adequado para a necessidade do leitor só se responde comparando " +
          "com as alternativas que não foram escritas.",
      },
    },
    {
      section: "5.1.6",
      title: "Selecione o conteúdo de que os leitores precisam",
      parent: "5.1",
      principleGroup: "relevant",
      provisional: false,
      instruments: ["checkBriefing"],
      limit: {
        kind: "partial",
        reason:
          "O briefing confere se as expressões que o autor declarou como essenciais aparecem no texto. " +
          "Isso verifica a declaração do autor, não a necessidade do leitor: se a declaração estiver " +
          "errada ou incompleta, a conferência passa mesmo assim. Saber o que o leitor precisa exige o " +
          "leitor, e o briefing não é um detector — não produz finding nem cita cláusula.",
      },
    },
    {
      section: "5.2",
      title:
        "Diretrizes para o Princípio 2: Os leitores conseguem encontrar com facilidade o que precisam (localizável)",
      parent: null,
      principleGroup: "findable",
      provisional: false,
    },
    {
      section: "5.2.1",
      title: "Visão geral",
      parent: "5.2",
      principleGroup: "findable",
      provisional: false,
      limit: { kind: "out_of_reach", reason: OVERVIEW },
    },
    {
      section: "5.2.2",
      title: "Estruture o documento para os leitores",
      parent: "5.2",
      principleGroup: "findable",
      provisional: false,
      limit: {
        kind: "partial",
        reason:
          "O fatiamento do parágrafo é medido. A ordenação do documento pela necessidade do leitor não " +
          "é: exige saber o que o leitor procura primeiro. A cláusula 5.3.5 da norma trata do parágrafo " +
          "sob o Princípio 3, e se `paragraph_length` pertence lá é questão em aberto, declarada e não " +
          "decidida.",
      },
    },
    {
      section: "5.2.3",
      title: "Use técnicas de Design da Informação que permitam aos leitores encontrar as informações",
      parent: "5.2",
      principleGroup: "findable",
      provisional: false,
      limit: {
        kind: "partial",
        reason:
          "Só a enumeração em prosa onde caberia lista é detectada. Tabela, destaque, espaçamento e " +
          "hierarquia visual não chegam ao motor: são decisões de apresentação que o texto puro não " +
          "carrega.",
      },
    },
    {
      section: "5.2.4",
      title: "Use títulos para ajudar os leitores a prever o que vem a seguir",
      parent: "5.2",
      principleGroup: "findable",
      provisional: false,
      limit: {
        kind: "partial",
        reason:
          "Tamanho do título e salto de nível são medidos. Se o título antecipa o que vem depois é " +
          "julgamento de conteúdo: `heading_body_mismatch` tenta uma aproximação por eco de termos, mas " +
          "é heurística estrutural do Lucid e não cita a norma.",
      },
    },
    {
      section: "5.2.5",
      title: "Mantenha informações complementares separadas",
      parent: "5.2",
      principleGroup: "findable",
      provisional: false,
      limit: {
        kind: "unbuilt",
        reason:
          "Alcançável por análise de texto: exceção, ressalva e nota encravadas no meio do período têm " +
          "marca sintática. Nenhum detector foi construído.",
      },
    },
    {
      section: "5.3",
      title:
        "Diretrizes para o Princípio 3: Os leitores conseguem entender com facilidade o que encontram (compreensível)",
      parent: null,
      principleGroup: "understandable",
      provisional: false,
    },
    {
      section: "5.3.1",
      title: "Visão geral",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: false,
      limit: { kind: "out_of_reach", reason: OVERVIEW },
    },
    {
      section: "5.3.2",
      title: "Escolha palavras familiares",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: false,
      limit: {
        kind: "partial",
        reason:
          "Jargão e sigla dependem de léxico curado. Um léxico não cobre uma língua: termo fora da " +
          "lista não é flagrado, e a ausência de achado não é atestado de vocabulário simples.",
      },
    },
    {
      section: "5.3.3",
      title: "Escreva frases claras",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: false,
      limit: {
        kind: "partial",
        reason:
          "A cláusula tem cinco alíneas. Os detectores alcançam parte de a) — estrutura ambígua, via " +
          "voz passiva e dupla negação — e c), quem faz o quê. Não alcançam a) 1) e 4), que pedem saber " +
          "o que é familiar ao leitor e o que já foi dito antes, nem d) e e), que remetem à norma " +
          "linguística. A alínea b), falar diretamente ao leitor, é tocada por " +
          "`leitor_terceira_pessoa`, que detecta a fala indireta mas não decide se ela é apropriada.",
      },
    },
    {
      section: "5.3.4",
      title: "Escreva frases concisas",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: false,
      limit: {
        kind: "partial",
        reason:
          "A cláusula tem três alíneas e nenhum número. A alínea b) — palavras redundantes, " +
          "modificadores vagos, clichês — é a mais alcançada, por `redundancia` e `perifrase_inflada`; " +
          "`adverbios_vagos` cobre a mesma alínea de fato, mas segue declarado como extensão editorial " +
          "do PT e por isso não cita esta cláusula. A alínea c) pede frases razoavelmente curtas COM " +
          "variação de tamanho: o " +
          "motor mede o comprimento e usa 20 palavras como gatilho de inspeção, número que é parâmetro " +
          "do Lucid e não da norma, e não mede variação nenhuma. A alínea a), uma ideia por frase, é a " +
          "diretriz central e não é verificável: contar ideias exige ler. `long_sentence` e " +
          "`subordinacao_densa` são aproximações estruturais dela, não a medição dela.",
      },
    },
    {
      section: "5.3.5",
      title: "Escreva parágrafos claros e concisos",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: false,
      limit: {
        kind: "unbuilt",
        reason:
          "Um parágrafo = um tópico, com o tópico anunciado no início, é alcançável por análise de " +
          "texto ao menos em parte. Nenhum detector cita esta cláusula: `paragraph_length` mede número " +
          "de frases e está declarado em 5.2.2.",
      },
    },
    {
      section: "5.3.6",
      title: "Considere incluir imagens e elementos multimídia",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: false,
      limit: {
        kind: "out_of_reach",
        reason:
          "Se uma imagem ajudaria, e se a que existe apoia o texto, não se decide a partir do texto. O " +
          "motor audita texto e não vê a imagem.",
      },
    },
    {
      section: "5.3.7",
      title: "Adote um tom respeitoso",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: false,
      limit: {
        kind: "unbuilt",
        reason:
          "Parte é lexical — termos que estereotipam ou excluem cabem num léxico curado, como jargão " +
          "cabe. Nada foi construído. O tom do documento como um todo, esse não é lexical e não seria " +
          "alcançado por um léxico.",
      },
    },
    {
      section: "5.3.8",
      title: "Certifique-se de que o documento seja coeso",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: false,
      instruments: ["cohesionMetrics"],
      limit: {
        kind: "partial",
        reason:
          "A bateria de coesão de superfície mede repetição lexical entre frases e conectivos por " +
          "classe. É descritor neutro: não produz achado, não entra no placar e não usa LSA nem " +
          "embeddings. Coesão de sentido — se as ideias se encadeiam — fica fora.",
      },
    },
    {
      section: "5.4",
      title: "Diretrizes para o Princípio 4: Os leitores conseguem utilizar com facilidade as informações (usáveis)",
      parent: null,
      principleGroup: "usable",
      provisional: false,
    },
    {
      section: "5.4.1",
      title: "Visão geral",
      parent: "5.4",
      principleGroup: "usable",
      provisional: false,
      limit: { kind: "out_of_reach", reason: OVERVIEW },
    },
    {
      section: "5.4.2",
      title: "Avalie o documento continuamente conforme ele for sendo elaborado",
      parent: "5.4",
      principleGroup: "usable",
      provisional: false,
      limit: {
        kind: "out_of_reach",
        reason:
          "É prática de processo, não propriedade do texto. Um documento não registra se foi avaliado " +
          "enquanto era escrito.",
      },
    },
    {
      section: "5.4.3",
      title: "Avalie o documento posteriormente com os leitores",
      parent: "5.4",
      principleGroup: "usable",
      provisional: false,
      limit: {
        kind: "out_of_reach",
        reason:
          "Se o leitor consegue usar a informação se mede testando com leitores. Nenhuma propriedade do " +
          "texto prova uso, e nenhum detector futuro alcança isto: um texto pode passar em todos os " +
          "critérios e ainda assim não permitir que a pessoa faça o que precisa fazer.",
      },
    },
    {
      section: "5.4.4",
      title: "Avalie o uso do documento pelos leitores de forma continuada",
      parent: "5.4",
      principleGroup: "usable",
      provisional: false,
      limit: {
        kind: "out_of_reach",
        reason:
          "Depende de observar o documento em uso depois de publicado. Está fora do alcance de qualquer " +
          "análise do texto.",
      },
    },
  ],
};
