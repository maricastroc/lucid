/**
 * Contexto do locale pt-BR para o Tier 3 (ADR-031). Fornecido como objeto simples que satisfaz,
 * por tipagem ESTRUTURAL, o contrato `RewriteLocale` do `report` — SEM importar `report` (a cerca
 * proíbe locale→report). Quem consome (o verificador) faz a atribuição tipada.
 *
 * O que é específico do português aqui: a re-análise ligada ao locale, os marcadores de 1ª pessoa
 * (lista fechada de pronomes/possessivos PT) e o id do critério de jargão.
 */
import type { Diagnostic } from "@/lucid/core/types";
import { analyzeWithLocale } from "@/lucid/core/analyzer";
import { localePtBR } from "./index";

/**
 * Marcadores de 1ª pessoa — LISTA FECHADA e INAMBÍGUA em PT-BR moderno. O risco fatal do LLM é
 * fabricar o AGENTE ("foi realizada a análise" → "nós analisamos"). Movido de
 * `report/rewrite/verify.ts` (ADR-031).
 *
 * Duas famílias, ambas FECHADAS (zero morfologia produtiva — "-mos" cru colide com
 * "mesmos"/"termos"/"últimos"/"extremos"):
 *   1. pronomes/possessivos (`eu|nós|meu|nosso`…); "nos"/"no" ficam de fora (ambíguos com a
 *      contração em+os).
 *   2. conjugações de 1ª pessoa do PLURAL — o "nós" PRO-DROP, escondido no verbo sem escrever o
 *      pronome ("foi verificado" → "verificamos", "vamos analisar"). É a forma MAIS comum, em PT,
 *      de fabricar o agente, e a que o guard só-pronome deixava vazar (achado ao vivo 2026-07-22,
 *      ADR-049). Lista curada de auxiliares/modais + verbos de ação administrativa (o registro
 *      onde o "nós" fabricado aparece), em presente/pretérito/futuro/imperfeito. Fechada por
 *      necessidade — sempre extensível, jamais produtiva.
 */
const FIRST_PERSON_PRONOUNS = [
  "eu", "nós", "me", "mim", "comigo", "conosco",
  "meu", "minha", "meus", "minhas", "nosso", "nossa", "nossos", "nossas",
];

const FIRST_PERSON_PLURAL_VERBS = [
  // auxiliares, modais e altíssima frequência
  "somos", "estamos", "temos", "vamos", "fomos", "fizemos", "vimos", "vemos", "havemos",
  "seremos", "estaremos", "teremos", "iremos", "faremos", "veremos",
  "podemos", "poderemos", "devemos", "deveremos", "queremos", "precisamos", "precisaremos",
  "estávamos", "tínhamos", "fazíamos", "podíamos", "devíamos", "precisávamos",
  // ação administrativa (presente/pretérito/futuro)
  "analisamos", "analisaremos", "verificamos", "verificaremos", "examinamos", "examinaremos",
  "consideramos", "consideraremos", "avaliamos", "avaliaremos", "decidimos", "decidiremos",
  "determinamos", "determinaremos", "deliberamos", "deliberaremos", "encaminhamos", "encaminharemos",
  "enviamos", "enviaremos", "recebemos", "receberemos", "concluímos", "concluiremos",
  "informamos", "informaremos", "solicitamos", "solicitaremos", "notificamos", "notificaremos",
  "negamos", "negaremos", "aprovamos", "aprovaremos", "realizamos", "realizaremos",
  "constatamos", "apuramos", "entendemos", "observamos", "identificamos",
  "corrigimos", "corrigiremos", "aplicamos", "adotamos", "tomamos", "tomaremos",
  "registramos", "garantimos", "providenciamos",
];

export const RE_FIRST_PERSON_PT = new RegExp(
  `\\b(?:${[...FIRST_PERSON_PRONOUNS, ...FIRST_PERSON_PLURAL_VERBS].join("|")})\\b`,
  "giu",
);

/** Objeto de locale para o Tier 3 (shape de `RewriteLocale`, verificado no consumidor). */
export const rewriteLocalePtBR = {
  id: "pt-BR",
  analyze: (text: string): Diagnostic => analyzeWithLocale(text, localePtBR),
  firstPersonMarkers: RE_FIRST_PERSON_PT,
  jargonCriterionId: "jargon",
};
