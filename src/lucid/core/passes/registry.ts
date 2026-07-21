/**
 * Registro de passes ativos da Camada 1 (docs/ARQUITETURA.md §2, §9 Fase 1 item 10).
 *
 * A ORDEM aqui só determina a sequência de EXECUÇÃO — nunca a ordem final dos
 * findings, que é sempre recanonizada por `sortFindings` em `analyzer.ts`,
 * independente de como os passes estão listados neste array.
 *
 * Nesta etapa, contém `sentenceLengthPass` (`long_sentence`), `passiveVoicePass`
 * (`passive_voice`), `nominalizationPass` (`nominalization`) e `jargonPass` (`jargon`,
 * ver ADR-008 em docs/DECISOES.md).
 */
import type { Pass } from "../types";
import { sentenceLengthPass } from "./sentence-length";
import { passiveVoicePass } from "./passive-voice";
import { nominalizationPass } from "./nominalization";
import { jargonPass } from "./jargon";
import { maisQuePerfeitoPass } from "./mais-que-perfeito";
import { gerundismoPass } from "./gerundismo";
import { adverbioMenteDensoPass } from "./adverbio-mente-denso";
import { redundanciaPass } from "./redundancia";
import { perifraseInfladaPass } from "./perifrase-inflada";

export const PASSES: readonly Pass[] = [
  sentenceLengthPass,
  passiveVoicePass,
  nominalizationPass,
  jargonPass,
  maisQuePerfeitoPass,
  gerundismoPass,
  adverbioMenteDensoPass,
  redundanciaPass,
  perifraseInfladaPass,
];
