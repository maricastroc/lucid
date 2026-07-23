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
const THIRD_PERSON_AGENT_NOUNS = [
  "comissão", "comissões",
  "equipe", "equipes",
  "diretoria", "diretorias",
  "conselho", "conselhos",
  "coordenação", "coordenações",
  "secretaria", "secretarias",
  "comitê", "comitês",
  "órgão", "órgãos",
  "administração", "administrações",
  "gestão", "gestões",
  "presidência",
  "reitoria",
  "procuradoria",
  "ouvidoria",
  "corregedoria",
  "ministério", "ministérios",
  "tribunal", "tribunais",
  "câmara", "câmaras",
  "prefeitura", "prefeituras",
  "governo", "governos",
  "departamento", "departamentos",
  "divisão", "divisões",
  "unidade", "unidades",
  "junta", "juntas",
  "banca", "bancas",
  "assembleia", "assembleias",
  "diretor", "diretora", "diretores", "diretoras",
  "coordenador", "coordenadora", "coordenadores", "coordenadoras",
  "presidente", "presidentes",
  "secretário", "secretária", "secretários", "secretárias",
  "gestor", "gestora", "gestores", "gestoras",
  "responsável", "responsáveis",
  "fiscal", "fiscais",
  "auditor", "auditora", "auditores", "auditoras",
  "procurador", "procuradora", "procuradores", "procuradoras",
  "juiz", "juíza", "juízes", "juízas",
  "promotor", "promotora", "promotores", "promotoras",
  "delegado", "delegada", "delegados", "delegadas",
  "relator", "relatora", "relatores", "relatoras",
  "autoridade", "autoridades",
];

export const RE_THIRD_PERSON_AGENT_NOUN_PT = new RegExp(
  `\\b(?:${THIRD_PERSON_AGENT_NOUNS.join("|")})\\b`,
  "giu",
);

const AGENT_PRECEDING_PREPOSITIONS = ["para", "com", "sobre", "sem", "entre", "contra", "até"];

export const RE_THIRD_PERSON_AGENT_SUBJECT_PT = new RegExp(
  `(?<!\\b(?:${AGENT_PRECEDING_PREPOSITIONS.join("|")})\\s)\\b(?:o|a|os|as)\\s+` +
    `(${THIRD_PERSON_AGENT_NOUNS.join("|")})\\b`,
  "giu",
);

export const rewriteLocalePtBR = {
  id: "pt-BR",
  analyze: (text: string): Diagnostic => analyzeWithLocale(text, localePtBR),
  firstPersonMarkers: RE_FIRST_PERSON_PT,
  jargonCriterionId: "jargon",
  thirdPersonAgentNouns: RE_THIRD_PERSON_AGENT_NOUN_PT,
  thirdPersonAgentSubject: RE_THIRD_PERSON_AGENT_SUBJECT_PT,
};
