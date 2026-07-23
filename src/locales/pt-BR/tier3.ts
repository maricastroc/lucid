import type { Diagnostic } from "@/lucid/core/types";
import { analyzeWithLocale } from "@/lucid/core/analyzer";
import { localePtBR } from "./index";

const FIRST_PERSON_PRONOUNS = [
  "eu", "nós", "me", "mim", "comigo", "conosco",
  "meu", "minha", "meus", "minhas", "nosso", "nossa", "nossos", "nossas",
];

const FIRST_PERSON_PLURAL_VERBS = [
  "somos", "estamos", "temos", "vamos", "fomos", "fizemos", "vimos", "vemos", "havemos",
  "seremos", "estaremos", "teremos", "iremos", "faremos", "veremos",
  "podemos", "poderemos", "devemos", "deveremos", "queremos", "precisamos", "precisaremos",
  "estávamos", "tínhamos", "fazíamos", "podíamos", "devíamos", "precisávamos",
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

export const rewriteLocalePtBR = {
  id: "pt-BR",
  analyze: (text: string): Diagnostic => analyzeWithLocale(text, localePtBR),
  firstPersonMarkers: RE_FIRST_PERSON_PT,
  jargonCriterionId: "jargon",
};
