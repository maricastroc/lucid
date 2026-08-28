import { buildRewritePromptV3, composePrompt, PROMPT_PARTS, withFirstBullet } from "@/report/rewrite";
import { renderFullBriefing } from "./briefing";
import type { EvalTarget } from "./targets";

const { SENTENCES } = PROMPT_PARTS;

const head = composePrompt;

const LIST_GATE_PARALLEL = `- Arquitetura da informação: se o trecho contiver ITENS SEMANTICAMENTE PARALELOS E SEPARÁVEIS,
  você pode devolver um parágrafo curto de introdução terminado em ":" seguido dos itens, um por
  linha, cada um começando por "- ". Use essa forma somente se TODAS as condições valerem:
  - cada item pode ser preservado integralmente, sem cortar nem resumir o que ele diz;
  - a introdução, sozinha, continua dizendo do que a lista trata;
  - as relações normativas e os modificadores continuam ligados ao item CERTO — o que vale para
    um item específico ("alterada pela", "regulamentada por", "revogada por", "nos termos de",
    "combinado com", um prazo, uma condição, uma exceção) fica DENTRO desse item, nunca vira
    item solto nem migra para outro;
  - montar a lista NÃO exige inventar categoria, agente, destinatário nem número: se para os
    itens ficarem paralelos você precisar criar um rótulo que o texto não dá, devolva texto
    corrido.
  DOIS itens já bastam. Não existe mínimo de três: a quantidade não é critério, o paralelismo é.
  Não invente item que o original não tem, não junte dois itens num só e não mude a ordem.
  Nunca use "#", "##" nem qualquer marcação de título.`;

const ENGINE_SAW_ENUMERATION = `
  A engine determinística também apontou "Enumeração em prosa" neste trecho — é evidência a mais
  de que a forma de lista cabe aqui, mas as condições acima continuam decidindo.`;


function sentenceBullets(): { heading: string; bullets: string[] } {
  const lines = SENTENCES.split("\n");
  const heading = lines[0];
  const bullets: string[] = [];
  for (const line of lines.slice(1)) {
    if (line.startsWith("- ")) bullets.push(line);
    else bullets[bullets.length - 1] += `\n${line}`;
  }
  return { heading, bullets };
}

export const IARIS_LIST_RULE = sentenceBullets().bullets[0];

export function buildIarisPort(target: EvalTarget, fullText: string): string {
  return head(fullText, target.span.text, SENTENCES);
}

export function buildIarisWithBriefing(target: EvalTarget, fullText: string): string {
  return buildRewritePromptV3(fullText, target.span, target.findings);
}

export function buildIarisListGate2(target: EvalTarget, fullText: string): string {
  const gate = target.criteria.includes("prose_enumeration")
    ? `${LIST_GATE_PARALLEL}${ENGINE_SAW_ENUMERATION}`
    : LIST_GATE_PARALLEL;
  const briefing = renderFullBriefing(target.findings);
  return head(fullText, target.span.text, withFirstBullet(gate)).replace(
    "[CONTEXTO DO DOCUMENTO",
    `BRIEFING DA ENGINE DETERMINÍSTICA — o que ela mediu NESTE trecho. Resolva TODOS:
${briefing}

[CONTEXTO DO DOCUMENTO`,
  );
}
