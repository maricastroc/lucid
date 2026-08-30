import { buildRewritePrompt, buildRewritePromptV4 } from "@/report/rewrite";
import { buildLucidV1 } from "./lucid-v1-frozen";
import { buildLucidV2 } from "./lucid-v2-frozen";
import { buildLucidV3 } from "./lucid-v3-frozen";
import { renderFullBriefing } from "./briefing";
import type { EvalTarget } from "./targets";

export type CandidateId =
  "rewrite@2" | "ab-A@1" | "ab-B@1" | "ab-C@1" | "lucid@v1" | "lucid@v2" | "lucid@v3" | "lucid@v4";

const NO_INVENTION_RULES = `- NÃO acrescente fato, exemplo, número, data ou explicação que não esteja no trecho;
- NÃO invente quem praticou a ação — se o texto não diz o agente, NÃO diga (não crie "nós", "a
  equipe", "o governo" etc.);
- NÃO mude nem remova números, datas, valores ou nomes próprios.`;

const HEAD = (fullText: string): string =>
  `Você reescreve textos em Linguagem Simples para um cidadão comum, sem NUNCA inventar.

Contexto: abaixo está o DOCUMENTO INTEIRO, apenas para você entender o assunto.
"""
${fullText}
"""

Sua tarefa: reescreva SOMENTE o TRECHO-ALVO abaixo para que um cidadão comum o entenda na
primeira leitura.`;

const FREEDOMS = `Você PODE, dentro do trecho-alvo:
- reorganizar a ordem das ideias e das frases;
- dividir uma frase longa em várias curtas (uma ideia por frase);
- condensar expressões e trocar palavras difíceis por comuns;
- mudar a estrutura do trecho.`;

const TAIL = (targetText: string): string =>
  `TRECHO-ALVO (reescreva só isto):
"""
${targetText}
"""

Responda SOMENTE com este JSON, sem texto fora dele:
{"reescrita": "sua reescrita do trecho-alvo aqui"}`;

function buildA(target: EvalTarget, fullText: string): string {
  const briefing = renderFullBriefing(target.findings);
  return `${HEAD(fullText)}

A engine determinística já analisou este trecho e apontou os pontos abaixo. Resolva TODOS:
${briefing}

${FREEDOMS}

Você NÃO PODE:
${NO_INVENTION_RULES}

${TAIL(target.span.text)}`;
}

const WHOLE_GAIN = `A lista acima é o PISO, não o teto. Resolver só os pontos listados e deixar o
resto igual NÃO é uma reescrita aceitável: o TRECHO INTEIRO tem de ficar mais fácil de ler na
primeira leitura — cada frase do trecho, inclusive as que não foram apontadas. Ao terminar,
releia o trecho inteiro e pergunte: um cidadão comum entende ISTO de primeira?`;

function buildB(target: EvalTarget, fullText: string): string {
  const briefing = renderFullBriefing(target.findings);
  return `${HEAD(fullText)}

A engine determinística já analisou este trecho e apontou os pontos abaixo. Resolva TODOS:
${briefing}

${WHOLE_GAIN}

${FREEDOMS}

Você NÃO PODE:
${NO_INVENTION_RULES}

${TAIL(target.span.text)}`;
}

const LIST_CLAUSE = `PERMISSÃO CONDICIONADA DE LISTA. A engine apontou "Enumeração em prosa"
neste trecho. Só nesse caso você pode devolver um parágrafo curto de introdução terminado em
":" seguido de itens, um por linha, cada um começando por "- ". Use essa forma SOMENTE se as
três condições valerem ao mesmo tempo:
- os itens são paralelos entre si (mesma natureza, mesmo nível — não misture um requisito com
  a consequência de descumpri-lo);
- separar os itens NÃO rompe a relação entre eles e o que os liga ("alterada pela",
  "regulamentada por", "revogada por", "nos termos de", "combinado com" e equivalentes): o que
  vale para um item específico tem de continuar DENTRO desse item, nunca virar item solto;
- a introdução sozinha continua dizendo do que a lista trata.
Se qualquer condição falhar, devolva texto corrido. Número de itens NÃO é critério: três itens
não autorizam nada por si só, e dois itens paralelos podem virar lista.
Nunca use "#", "##" nem qualquer marcação de título: o trecho não pode virar título.`;

const LEGAL_FIDELITY = `FIDELIDADE JURÍDICA (além das proibições acima):
- copie cada referência a norma EXATAMENTE como está — tipo, número, ano e qualificação
  ("Lei Complementar nº 119/2012" não é "Lei 119"; "Decreto Estadual" não é "Decreto");
- mantenha a relação entre normas junto da norma a que ela pertence: se o texto diz
  "Lei X, alterada pela Lei Y", a reescrita não pode deixar as duas soltas nem sugerir que
  quem altera é outra;
- mantenha a força do verbo: "deverá" é obrigação, "poderá" é permissão, "é vedado" é
  proibição — não troque uma pela outra nem transforme obrigação em recomendação;
- mantenha TODAS as condições e exceções ("se", "caso", "desde que", "salvo", "exceto",
  "ressalvado", "sem prejuízo de"): apagar uma exceção muda o que a norma manda;
- mantenha prazos, valores e unidades exatamente como estão.`;

function buildC(target: EvalTarget, fullText: string): string {
  const briefing = renderFullBriefing(target.findings);
  const listAllowed = target.criteria.includes("prose_enumeration");
  const structure = listAllowed
    ? `\n${LIST_CLAUSE}\n`
    : `\nDevolva o trecho como texto corrido: não use listas, marcadores nem títulos.\n`;
  return `${HEAD(fullText)}

A engine determinística já analisou este trecho e apontou os pontos abaixo. Resolva TODOS:
${briefing}

${WHOLE_GAIN}
${structure}
${FREEDOMS}

Você NÃO PODE:
${NO_INVENTION_RULES}

${LEGAL_FIDELITY}

${TAIL(target.span.text)}`;
}

export interface Candidate {
  readonly id: CandidateId;
  readonly description: string;
  build(target: EvalTarget, fullText: string): string;
}

export const CANDIDATES: readonly Candidate[] = [
  {
    id: "rewrite@2",
    description: "a linha de base anterior — documento inteiro + dica de um critério só",
    build: (target, fullText) =>
      buildRewritePrompt(fullText, target.span, { strategy: "rewrite2", criterion: target.primaryCriterion }),
  },
  { id: "ab-A@1", description: "briefing com todos os achados que cruzam o trecho", build: buildA },
  { id: "ab-B@1", description: "A + exigência de ganho do trecho inteiro", build: buildB },
  {
    id: "ab-C@1",
    description: "B + permissão condicionada de lista + fidelidade jurídica reforçada",
    build: buildC,
  },
  {
    id: "lucid@v1",
    description: "primeira versão do prompt próprio: norma pública + as provas que a engine já executa",
    build: (target, fullText) => buildLucidV1(fullText, target.span, target.findings),
  },
  {
    id: "lucid@v2",
    description: "lucid@v1 com o teto de 20 palavras declarado como condição de aceitação, não como preferência",
    build: (target, fullText) => buildLucidV2(fullText, target.span, target.findings),
  },
  {
    id: "lucid@v3",
    description:
      "lucid@v2 mais o bloco do que a divisão não pode quebrar: ressalva, dever inventado e nome da categoria",
    build: (target, fullText) => buildLucidV3(fullText, target.span, target.findings),
  },
  {
    id: "lucid@v4",
    description: "lucid@v3 com o rótulo do dispositivo e a proibição de lista elevados a condição de aceitação",
    build: (target, fullText) => buildRewritePromptV4(fullText, target.span, target.findings),
  },
];

export const candidateById = (id: string): Candidate | undefined => CANDIDATES.find((c) => c.id === id);
