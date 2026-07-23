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
import type { Pass } from "@/lucid/core/types";
import { sentenceLengthPass } from "./sentence-length";
import { passiveVoicePass } from "./passive-voice";
import { nominalizationPass } from "./nominalization";
import { nominalizacaoEncadeadaPass } from "./nominalizacao-encadeada";
import { jargonPass } from "./jargon";
import { maisQuePerfeitoPass } from "./mais-que-perfeito";
import { gerundismoPass } from "./gerundismo";
import { adverbioMenteDensoPass } from "./adverbio-mente-denso";
import { redundanciaPass } from "./redundancia";
import { perifraseInfladaPass } from "./perifrase-inflada";
import { paragraphLengthPass } from "./paragraph-length";
import { proseEnumerationPass } from "./prose-enumeration";
import { mesoclisePass } from "./mesoclise";
import { duplaNegacaoPass } from "./dupla-negacao";
import { subordinacaoPass } from "./subordinacao";
import { leitorTerceiraPessoaPass } from "./leitor-terceira-pessoa";
import { hierarquiaTitulosPass } from "./hierarquia-titulos";
import { longHeadingPass } from "./long-heading";
import { singleItemListPass } from "./single-item-list";
import { headingBodyMismatchPass } from "./heading-body-mismatch";

export const PASSES: readonly Pass[] = [
  sentenceLengthPass,
  passiveVoicePass,
  nominalizationPass,
  nominalizacaoEncadeadaPass,
  jargonPass,
  maisQuePerfeitoPass,
  gerundismoPass,
  adverbioMenteDensoPass,
  redundanciaPass,
  perifraseInfladaPass,
  paragraphLengthPass,
  proseEnumerationPass,
  mesoclisePass,
  duplaNegacaoPass,
  subordinacaoPass,
  leitorTerceiraPessoaPass,
  hierarquiaTitulosPass,
  longHeadingPass,
  singleItemListPass,
  headingBodyMismatchPass,
];
