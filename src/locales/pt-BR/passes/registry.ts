import type { Pass } from "@/lucid/core/types";
import { sentenceLengthPass } from "./sentence-length";
import { passiveVoicePass } from "./passive-voice";
import { passivaSinteticaPass } from "./passiva-sintetica";
import { nominalizationPass } from "./nominalization";
import { nominalizacaoEncadeadaPass } from "./nominalizacao-encadeada";
import { jargonPass } from "./jargon";
import { siglaSemExpansaoPass } from "./sigla-sem-expansao";
import { maisQuePerfeitoPass } from "./mais-que-perfeito";
import { gerundismoPass } from "./gerundismo";
import { adverbioMenteDensoPass } from "./adverbio-mente-denso";
import { adverbiosVagosPass } from "./adverbios-vagos";
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
  passivaSinteticaPass,
  nominalizationPass,
  nominalizacaoEncadeadaPass,
  jargonPass,
  siglaSemExpansaoPass,
  maisQuePerfeitoPass,
  gerundismoPass,
  adverbioMenteDensoPass,
  adverbiosVagosPass,
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
