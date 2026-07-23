import type { Finding, Span } from "@/lucid/core/types";
import { getPrepared } from "../datasets/registry";
import type { PassiveTense } from "../datasets/types";
import { extractPassiveRoles } from "./passive-roles";
import { regularArConjugation } from "./regular-morphology";

const SER_TENSES = getPrepared("ser-tempos.pt");
const CONJUGATIONS = getPrepared("conjugacoes-ativas.pt");

function formsFor(lemma: string): Readonly<Record<string, string>> | null {
  return CONJUGATIONS.get(lemma) ?? regularArConjugation(lemma);
}

export type PassiveRewrite =
  | { kind: "automatic"; replacement: string; target: Span }
  | { kind: "needsAgent"; verbLemma: string; tense: PassiveTense; object: string | null }
  | { kind: "unsupported"; reason: string };

const DECONTRACT: Record<string, string> = { pela: "a", pelo: "o", pelas: "as", pelos: "os" };
const SINGULAR_MARKERS = new Set(["pela", "pelo"]);

const PLURAL_ARTICLES = new Set(["os", "as", "uns", "umas"]);

const LOWERCASE_HEAD_ARTICLES = new Set([
  "O", "A", "Os", "As", "Um", "Uma", "Uns", "Umas",
  "Qualquer", "Quaisquer", "Nenhum", "Nenhuma", "Todo", "Toda", "Todos", "Todas", "Cada",
  "Algum", "Alguma", "Alguns", "Algumas", "Este", "Esta", "Estes", "Estas", "Esse", "Essa",
  "Esses", "Essas", "Aquele", "Aquela", "Aqueles", "Aquelas",
]);

const AGENT_ADJUNCT_STOPWORDS = new Set([
  "em", "para", "com", "após", "durante", "sobre", "sem", "contra", "entre", "perante", "por",
  "quando", "onde", "conforme", "segundo",
]);

// Advérbios de negação que, antes do auxiliar, negam o verbo — reposicioná-los
// como cauda do objeto na ordem ativa inverteria o sentido da frase.
const NEGATION_WORDS = new Set(["não", "nunca", "jamais", "nem", "tampouco"]);

function containsNegation(text: string): boolean {
  return text.split(/\s+/u).some((w) => NEGATION_WORDS.has(w.toLowerCase()));
}

function trimTrailingEnd(source: string, end: number): number {
  let e = end;
  while (e > 0 && /[\s.,;:!?…]/u.test(source[e - 1])) e--;
  return e;
}

function agentHasAdjunct(agentBody: string): boolean {
  return agentBody.split(/\s+/u).some((w) => AGENT_ADJUNCT_STOPWORDS.has(w.toLowerCase()));
}

function unsupported(reason: string): PassiveRewrite {
  return { kind: "unsupported", reason };
}

function featureKey(tense: PassiveTense, number: "sg" | "pl"): string {
  return `${tense}.3${number === "sg" ? "s" : "p"}`;
}

function conjugate(lemma: string, tense: PassiveTense, number: "sg" | "pl"): string | null {
  return formsFor(lemma)?.[featureKey(tense, number)] ?? null;
}

function capitalizeFirst(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function lowercaseObjectHead(object: string): string {
  const firstWord = object.split(/\s/u)[0];
  if (LOWERCASE_HEAD_ARTICLES.has(firstWord)) {
    return `${object.charAt(0).toLowerCase()}${object.slice(1)}`;
  }
  return object;
}

function agentNumberFromText(agentText: string): "sg" | "pl" {
  const firstWord = (agentText.match(/^\p{L}+/u)?.[0] ?? "").toLowerCase();
  return PLURAL_ARTICLES.has(firstWord) ? "pl" : "sg";
}

export function passiveToActive(finding: Finding, source: string): PassiveRewrite {
  const roles = extractPassiveRoles(finding, source);
  if (!roles) return unsupported("estrutura da passiva não reconhecida");

  const ser = SER_TENSES.get(roles.serForm);
  if (!ser) return unsupported("tempo verbal não conversível com segurança (composto, subjuntivo ou pessoa)");
  if (!roles.baseVerbLemma) return unsupported("verbo-base do particípio desconhecido");
  if (!formsFor(roles.baseVerbLemma)) return unsupported("verbo fora da tabela fechada e não regular em -ar");
  if (roles.objectRegion === null) return unsupported("sujeito posposto ou ausente (ordem não-SVO)");
  if (/[,;:]/u.test(roles.objectRegion)) return unsupported("sujeito com estrutura complexa");
  if (containsNegation(roles.objectRegion)) return unsupported("negação antes do auxiliar (a conversão inverteria o sentido)");
  if (roles.interveningModifier !== null) {
    // "foi apenas enviado", "foi devidamente enviado", "enviado apenas pela comissão":
    // o rebuild sujeito+verbo+objeto descartaria o advérbio, mudando o sentido.
    return unsupported(`advérbio intercalado ("${roles.interveningModifier}") — a conversão o descartaria`);
  }

  const object = roles.objectRegion;

  if (roles.hasAgent) {
    const marker = roles.agentMarker ?? "";
    const article = DECONTRACT[marker];
    if (!article) return unsupported("agente sem contração pel- clara");
    if (!roles.agentBody || roles.agentEnd === null) return unsupported("agente vazio");
    if (roles.agentTruncated) return unsupported("agente truncado no limite de tokens reconhecido com segurança");
    if (agentHasAdjunct(roles.agentBody)) return unsupported("limite do agente incerto (adjunto)");
    const number = SINGULAR_MARKERS.has(marker) ? "sg" : "pl";
    const verb = conjugate(roles.baseVerbLemma, ser.tense, number);
    if (!verb) return unsupported("conjugação ausente para este tempo/número");

    const subject = capitalizeFirst(`${article} ${roles.agentBody}`);
    const replacement = `${subject} ${verb} ${lowercaseObjectHead(object)}`;
    const end = trimTrailingEnd(source, roles.agentEnd);
    const target: Span = { start: roles.subjectStart, end, text: source.slice(roles.subjectStart, end) };
    return { kind: "automatic", replacement, target };
  }

  return { kind: "needsAgent", verbLemma: roles.baseVerbLemma, tense: ser.tense, object };
}

export function applyPassiveWithAgent(finding: Finding, source: string, agent: string): PassiveRewrite {
  const result = passiveToActive(finding, source);
  if (result.kind !== "needsAgent") return result;

  const agentText = agent.trim();
  if (agentText.length === 0) return unsupported("agente não informado");

  const number = agentNumberFromText(agentText);
  const verb = conjugate(result.verbLemma, result.tense, number);
  if (!verb) return unsupported("conjugação ausente para este tempo/número");

  const roles = extractPassiveRoles(finding, source);
  if (!roles) return unsupported("estrutura da passiva não reconhecida");

  const subject = capitalizeFirst(agentText);
  const object = result.object;
  const replacement = object ? `${subject} ${verb} ${lowercaseObjectHead(object)}` : `${subject} ${verb}`;
  const target: Span = {
    start: roles.subjectStart,
    end: roles.participleEnd,
    text: source.slice(roles.subjectStart, roles.participleEnd),
  };
  return { kind: "automatic", replacement, target };
}
