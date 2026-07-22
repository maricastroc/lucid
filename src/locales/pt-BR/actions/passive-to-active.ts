/**
 * Conversão voz passiva → voz ativa como AÇÃO estrutural do Tier 2 (ADR-032). 100% determinística,
 * zero LLM, zero morfologia produtiva em runtime: só CONSULTA tabelas fechadas. Reversão escopada da
 * rejeição do ADR-011 — a segurança vem da classificação em 3 classes + gates conservadores.
 *
 * Nunca inventa agente, nunca infere sentido. Quando falta o agente, devolve `needsAgent` e a UI pede
 * SÓ o agente; toda a conjugação e a montagem continuam aqui. Combinação ausente ⇒ `unsupported`.
 *
 * Escopo v1: passiva ANALÍTICA (`ser` + particípio) em ordem SVO (sujeito antes de `ser`), 3ª pessoa,
 * 5 tempos simples. Sujeito posposto (VS), tempos compostos, subjuntivo/1ª-2ª pessoa → `unsupported`.
 */
import type { Finding, Span } from "@/lucid/core/types";
import { getPrepared } from "../datasets/registry";
import type { PassiveTense } from "../datasets/types";
import { extractPassiveRoles } from "./passive-roles";

const SER_TENSES = getPrepared("ser-tempos.pt");
const CONJUGATIONS = getPrepared("conjugacoes-ativas.pt");

export type PassiveRewrite =
  | { kind: "automatic"; replacement: string; target: Span }
  | { kind: "needsAgent"; verbLemma: string; tense: PassiveTense; object: string | null }
  | { kind: "unsupported"; reason: string };

/** de-contração `pel-` → artigo (fato gramatical fechado). */
const DECONTRACT: Record<string, string> = { pela: "a", pelo: "o", pelas: "as", pelos: "os" };
const SINGULAR_MARKERS = new Set(["pela", "pelo"]);

/** artigos iniciais que indicam PLURAL — para o número do agente digitado na Classe B (lista fechada). */
const PLURAL_ARTICLES = new Set(["os", "as", "uns", "umas"]);

/** artigos que, iniciando o objeto (ex-sujeito), podem ser reminusculizados com segurança. */
const LOWERCASE_HEAD_ARTICLES = new Set(["O", "A", "Os", "As", "Um", "Uma", "Uns", "Umas"]);

/**
 * Preposições/palavras que, DENTRO do sintagma do agente, sinalizam que o pass (que estende o
 * agente de forma gulosa, até 6 tokens) provavelmente absorveu um ADJUNTO ("pela equipe **em**
 * segunda instância"). Nesses casos o limite do agente é incerto → `unsupported`, nunca um rascunho
 * com o adjunto no lugar errado. Deliberadamente NÃO inclui `de/do/da/no/na/ao/à` (internos ao SN,
 * ex.: "comissão de ética"). Lista fechada; precisão > recall.
 */
const AGENT_ADJUNCT_STOPWORDS = new Set([
  "em", "para", "com", "após", "durante", "sobre", "sem", "contra", "entre", "perante", "por",
  "quando", "onde", "conforme", "segundo",
]);

/** Recua sobre pontuação/espaço no fim de `end` — o pass inclui o ponto final no `agentEnd`. */
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
  return CONJUGATIONS.get(lemma)?.[featureKey(tense, number)] ?? null;
}

function capitalizeFirst(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/** Reminuscula o artigo inicial do objeto (ex-sujeito) — nunca um nome próprio. */
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

/**
 * Classifica e (quando possível) monta a conversão. `automatic` só quando há agente explícito com
 * contração `pel-`; `needsAgent` quando a única coisa que falta é quem pratica a ação.
 */
export function passiveToActive(finding: Finding, source: string): PassiveRewrite {
  const roles = extractPassiveRoles(finding, source);
  if (!roles) return unsupported("estrutura da passiva não reconhecida");

  const ser = SER_TENSES.get(roles.serForm);
  if (!ser) return unsupported("tempo verbal não conversível com segurança (composto, subjuntivo ou pessoa)");
  if (!roles.baseVerbLemma) return unsupported("verbo-base do particípio desconhecido");
  if (!CONJUGATIONS.has(roles.baseVerbLemma)) return unsupported("verbo fora da tabela fechada de conjugação");
  if (roles.objectRegion === null) return unsupported("sujeito posposto ou ausente (ordem não-SVO)");
  if (/[,;:]/u.test(roles.objectRegion)) return unsupported("sujeito com estrutura complexa");

  const object = roles.objectRegion;

  if (roles.hasAgent) {
    const marker = roles.agentMarker ?? "";
    const article = DECONTRACT[marker];
    if (!article) return unsupported("agente sem contração pel- clara");
    if (!roles.agentBody || roles.agentEnd === null) return unsupported("agente vazio");
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

/**
 * Classe B: o usuário forneceu APENAS o agente; a engine conjuga e monta o rascunho. Deriva o número
 * do verbo do artigo inicial do agente (lista fechada); na dúvida, singular (é um rascunho revisável).
 */
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
