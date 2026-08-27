import type { ClauseTree } from "@/lucid/core/coverage/types";

export const CLAUSE_TREE: ClauseTree = {
  standard: "ABNT NBR ISO 24495-1:2024",
  transcription:
    "Árvore parcial. Os quatro princípios (5.1–5.4) e as subcláusulas de 5.3 que os critérios já " +
    "citam. Os títulos são formulações de trabalho, ainda NÃO conferidas contra o texto normativo — " +
    "toda cláusula aqui está marcada `provisional: true` até essa conferência. Não é transcrição " +
    "integral da norma: a ausência de uma cláusula nesta árvore não afirma que ela não existe.",
  exhaustive: false,
  nodes: [
    {
      section: "5.1",
      title: "Princípio 1 — o leitor obtém o que precisa",
      parent: null,
      principleGroup: "relevant",
      provisional: true,
      instruments: ["checkBriefing"],
      limit: {
        kind: "partial",
        reason:
          "O briefing confere se as expressões que o autor declarou como essenciais aparecem no " +
          "texto. Isso verifica a declaração do autor, não a necessidade do leitor: se a declaração " +
          "estiver errada ou incompleta, a conferência passa mesmo assim. Saber o que o leitor " +
          "precisa exige o leitor, e o briefing não é um detector — não produz finding nem cita cláusula.",
      },
    },
    {
      section: "5.2",
      title: "Princípio 2 — o leitor encontra o que precisa",
      parent: null,
      principleGroup: "findable",
      provisional: true,
      limit: {
        kind: "partial",
        reason:
          "Os detectores cobrem hierarquia de títulos, título longo, fatiamento do parágrafo e " +
          "enumeração em prosa. Não cobrem sumário, índice, remissão entre seções nem ordenação por " +
          "necessidade do leitor — alcançáveis por análise de texto, ainda não construídas.",
      },
    },
    {
      section: "5.3",
      title: "Princípio 3 — o leitor entende o que encontra",
      parent: null,
      principleGroup: "understandable",
      provisional: true,
    },
    {
      section: "5.3.2",
      title: "Escolha de palavra",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: true,
      limit: {
        kind: "partial",
        reason:
          "Jargão e sigla dependem de léxico curado. Um léxico não cobre uma língua: termo fora da " +
          "lista não é flagrado, e a ausência de achado não é atestado de vocabulário simples.",
      },
    },
    {
      section: "5.3.3",
      title: "Construção da frase",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: true,
    },
    {
      section: "5.3.4",
      title: "Economia da frase",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: true,
    },
    {
      section: "5.4",
      title: "Princípio 4 — o leitor consegue usar a informação",
      parent: null,
      principleGroup: "usable",
      provisional: true,
      limit: {
        kind: "out_of_reach",
        reason:
          "Se o leitor consegue usar a informação se mede testando com leitores. Nenhuma propriedade " +
          "do texto prova uso, e nenhum detector futuro alcança isto: um texto pode passar em todos " +
          "os critérios e ainda assim não permitir que a pessoa faça o que precisa fazer.",
      },
    },
  ],
};
