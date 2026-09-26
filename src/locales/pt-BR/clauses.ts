import type { ClauseTree } from "@/lucid/core/coverage/types";

const OVERVIEW =
  "Visão geral: apresenta o princípio e remete às diretrizes seguintes. Não traz diretriz própria que " +
  "se possa verificar num texto.";

export const CLAUSE_TREE: ClauseTree = {
  standard: "ABNT NBR ISO 24495-1:2024",
  referenceName: "ABNT NBR ISO 24495-1",
  transcription:
    "Esta árvore transcreve por inteiro a seção 5 (Diretrizes): os quatro princípios e as 23 " +
    "subcláusulas de 5.1 a 5.4, com os títulos conferidos com o texto da norma. As seções 1 a 4 " +
    "(Escopo, Referências normativas, Termos e definições, Princípios norteadores) e os Anexos A e B " +
    "ficaram fora dela, o que não quer dizer que não existam. Por isso a árvore não é declarada completa.",
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
          "Quem é o leitor não está escrito no texto. Nenhuma regra descobre num documento o público que " +
          "ele quer alcançar, e um texto pode nomear um público e ter sido escrito para outro.",
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
          "Saber se o formato escolhido atende à necessidade do leitor exige comparar com alternativas " +
          "que não foram escritas.",
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
          "O Lucid confere se as expressões que o autor declarou como essenciais aparecem no texto. Isso " +
          "verifica a declaração do autor, não a necessidade do leitor: se a declaração estiver errada ou " +
          "incompleta, a conferência passa mesmo assim. Saber do que o leitor precisa exige ouvir o leitor. " +
          "A conferência não gera achado nem cita cláusula.",
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
          "O Lucid mede o tamanho dos parágrafos. Não mede se o documento está ordenado pela necessidade " +
          "do leitor, porque isso exige saber o que ele procura primeiro. A norma também trata de " +
          "parágrafo na 5.3.5 (Princípio 3); se paragraph_length pertence lá é uma questão em aberto, " +
          "ainda não decidida.",
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
          "O Lucid detecta só a enumeração em prosa onde caberia uma lista. Tabela, destaque, espaçamento " +
          "e hierarquia visual são decisões de apresentação que não chegam à análise do texto.",
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
          "O Lucid mede o tamanho do título e o salto de nível. Se o título antecipa o que vem depois é " +
          "julgamento de conteúdo e fica com o autor: repetir ou não as palavras do corpo não mostra se o " +
          "título cumpre essa função.",
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
          "Dá para verificar pelo texto, porque exceção, ressalva e nota no meio do período têm marca " +
          "sintática, mas nenhum detector foi construído.",
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
          "Jargão e sigla dependem de listas curadas, e nenhuma lista cobre a língua inteira: termo fora " +
          "dela não é apontado, e não ter achado não atesta que o vocabulário é familiar.",
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
          "A cláusula tem cinco alíneas. Os detectores alcançam parte da a), estrutura ambígua, pela voz " +
          "passiva e pela dupla negação, e a c), quem faz o quê. Não alcançam os itens 1) e 4) da a), que " +
          "pedem saber o que é familiar ao leitor e o que já foi dito antes, nem a d) e a e), que remetem à " +
          "norma linguística. A b), falar diretamente ao leitor, é tratada por leitor_terceira_pessoa, que " +
          "detecta a fala indireta mas não decide se ela é adequada.",
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
          "A cláusula tem três alíneas e não fixa número. A b), palavras redundantes, modificadores vagos " +
          "e clichês, é a mais alcançada, por redundancia e perifrase_inflada; adverbios_vagos cobre a mesma " +
          "alínea, mas é declarado como extensão editorial do português e por isso não cita esta cláusula. " +
          "A c) pede frases razoavelmente curtas e com variação de tamanho: o Lucid mede o comprimento e " +
          "usa 20 palavras como gatilho de inspeção, número do Lucid e não da norma, mas não mede a " +
          "variação. A a), uma ideia por frase, é a diretriz central e não se verifica automaticamente, " +
          "porque contar ideias exige ler; long_sentence e subordinacao_densa são aproximações estruturais " +
          "dela, não a medição dela.",
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
          "Um tópico por parágrafo, anunciado no início, pode ser verificado pelo texto ao menos em " +
          "parte, mas nenhum detector cita esta cláusula: paragraph_length conta frases e está declarado " +
          "na 5.2.2.",
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
          "Se uma imagem ajudaria, ou se a que existe apoia o texto, não se decide pelo texto. O Lucid " +
          "audita texto e não vê imagens.",
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
          "Parte é lexical: termos que estereotipam ou excluem caberiam numa lista curada, como o jargão, " +
          "mas nada foi construído. O tom do documento como um todo não é lexical e não seria alcançado " +
          "por uma lista.",
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
          "As métricas de coesão medem a repetição de palavras entre frases vizinhas e os conectivos por " +
          "tipo. São descritivas: não geram achado nem entram no placar. A coesão de sentido (se as ideias " +
          "se encadeiam) fica fora.",
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
          "Só um teste com leitores mostra se eles conseguem usar a informação. Nenhuma propriedade do " +
          "texto prova uso, e nenhum detector futuro alcança isto: um texto pode não ter nenhum achado e " +
          "ainda assim não permitir que a pessoa faça o que precisa fazer.",
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
