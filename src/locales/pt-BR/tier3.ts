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
 * Marcadores de 1ª pessoa — LISTA FECHADA e INAMBÍGUA em PT-BR moderno (pronomes/possessivos).
 * O risco fatal do LLM é fabricar o AGENTE ("foi realizada a análise" → "nós analisamos"). Zero
 * morfologia produtiva (não pegamos "-mos", que colide com "mesmos"/"termos"); "nos"/"no" ficam
 * de fora (ambíguos com a contração em+os). Movido de `report/rewrite/verify.ts` (ADR-031).
 */
export const RE_FIRST_PERSON_PT =
  /\b(?:eu|nós|me|mim|comigo|conosco|meu|minha|meus|minhas|nosso|nossa|nossos|nossas)\b/giu;

/** Objeto de locale para o Tier 3 (shape de `RewriteLocale`, verificado no consumidor). */
export const rewriteLocalePtBR = {
  id: "pt-BR",
  analyze: (text: string): Diagnostic => analyzeWithLocale(text, localePtBR),
  firstPersonMarkers: RE_FIRST_PERSON_PT,
  jargonCriterionId: "jargon",
};
