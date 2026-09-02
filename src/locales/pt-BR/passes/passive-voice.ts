import type { PassFinding, Pass, Token } from "@/lucid/core/types";
import { getPrepared } from "../datasets/registry";

const CRITERION = "passive_voice";

const SER_FORMS = getPrepared("verbos-ser.pt");
const IRREGULAR_PARTICIPLES = getPrepared("participios-irregulares.pt");
const AMBIGUOUS_PARTICIPLES = getPrepared("participios-ambiguos.pt");
const NOMINAL_FALSE_POSITIVES = getPrepared("participios-falsos-nominais.pt");
const NON_AGENT_HEADS = getPrepared("adjuntos-nao-agente.pt");

const CONNECTOR_ADVERBS = new Set(["não", "já", "ainda", "também", "sempre", "nunca", "apenas", "logo"]);
const RE_MENTE_ADVERB = /^\p{L}+mente$/u;

const BARRIER_PUNCTUATION = new Set([",", ";", ":", "!", "?", "…", "(", ")", "[", "]", '"', "'", "—"]);

const BARRIER_CONJUNCTIONS = new Set(["que", "mas", "e", "porque", "quando"]);

const AGENT_MARKERS = new Set(["pelo", "pela", "pelos", "pelas"]);

const POR_AGENT_MARKER = "por";
const AGENT_DETERMINERS = new Set(["um", "uma", "uns", "umas"]);
const AGENT_PRONOUNS = new Set(["mim", "ti", "ele", "ela", "eles", "elas", "nós", "vós", "você", "vocês"]);
const RE_PROPER_NOUN_START = /^\p{Lu}/u;

const MAX_CONNECTOR_TOKENS = 2;

const MAX_AGENT_PHRASE_TOKENS = 6;

const RE_REGULAR_PARTICIPLE_SUFFIX = /^(.{2,}?)(ad|id|íd)[ao]s?$/u;

const RE_STEM_STRESS_ACCENT = /[áàâãéêíóôõú]/u;

type Eventiveness = "agent" | "eventive_tense" | "postposed_subject";

const PRESENT_INDICATIVE_SER = new Set(["sou", "és", "é", "somos", "sois", "são"]);

const ITEM_MARKERS = new Set([
  "art",
  "artigo",
  "artigos",
  "parágrafo",
  "parágrafos",
  "inciso",
  "incisos",
  "alínea",
  "alíneas",
  "item",
  "itens",
  "anexo",
  "capítulo",
  "seção",
  "subseção",
  "título",
  "único",
  "única",
]);

const RE_ORDINAL_OR_NUMBER = /^(?:\d+[ºª°]?|[ºª°])$/u;
const RE_ROMAN_NUMERAL = /^[ivxlcdm]+$/u;

function hasPreverbalSubject(tokens: readonly Token[], anchorIndex: number): boolean {
  for (let i = 0; i < anchorIndex; i++) {
    const token = tokens[i];
    if (!token.isWord) continue;
    if (ITEM_MARKERS.has(token.lower)) continue;
    if (RE_ORDINAL_OR_NUMBER.test(token.lower)) continue;
    if (RE_ROMAN_NUMERAL.test(token.lower)) continue;
    return true;
  }
  return false;
}

const DEONTIC_PARTICIPLES = new Set(["obrigado", "obrigada", "obrigados", "obrigadas"]);

const TER_HAVER_AUXILIARIES = new Set([
  "tinha",
  "tinhas",
  "tínhamos",
  "tínheis",
  "tinham",
  "tenho",
  "tens",
  "tem",
  "temos",
  "tendes",
  "têm",
  "tive",
  "tiveste",
  "teve",
  "tivemos",
  "tivestes",
  "tiveram",
  "terei",
  "terás",
  "terá",
  "teremos",
  "tereis",
  "terão",
  "teria",
  "terias",
  "teríamos",
  "teríeis",
  "teriam",
  "tenha",
  "tenhas",
  "tenhamos",
  "tenhais",
  "tenham",
  "tivesse",
  "tivesses",
  "tivéssemos",
  "tivésseis",
  "tivessem",
  "tiver",
  "tiveres",
  "tivermos",
  "tiverdes",
  "tiverem",
  "ter",
  "tendo",
  "havia",
  "havias",
  "havíamos",
  "havíeis",
  "haviam",
  "há",
  "hei",
  "hás",
  "hão",
  "houve",
  "houvera",
  "houveram",
  "haja",
  "hajam",
  "houvesse",
  "houvessem",
  "houver",
  "houverem",
  "haver",
  "havendo",
  "haverá",
  "haverão",
  "haveria",
  "haveriam",
]);

const ESTAR_AUXILIARIES = new Set([
  "está",
  "estás",
  "estou",
  "estamos",
  "estais",
  "estão",
  "estava",
  "estavas",
  "estávamos",
  "estáveis",
  "estavam",
  "esteve",
  "estive",
  "estivemos",
  "estiveram",
  "estará",
  "estarão",
  "estaria",
  "estariam",
  "esteja",
  "estejam",
  "estivesse",
  "estivessem",
  "estiver",
  "estiverem",
  "estar",
  "estando",
  "vai",
  "vão",
  "vem",
  "vêm",
  "continua",
  "continuam",
]);

function compositeStart(tokens: readonly Token[], anchorIndex: number): number | null {
  const anchor = tokens[anchorIndex];
  const previous = tokens[anchorIndex - 1];
  if (!previous?.isWord) return null;

  if (anchor.lower === "sido" && TER_HAVER_AUXILIARIES.has(previous.lower)) return previous.start;
  if (anchor.lower === "sendo" && ESTAR_AUXILIARIES.has(previous.lower)) return previous.start;
  return null;
}

function isConnector(token: Token): boolean {
  return token.isWord && (CONNECTOR_ADVERBS.has(token.lower) || RE_MENTE_ADVERB.test(token.lower));
}

function isBarrier(token: Token): boolean {
  if (token.isWord) return BARRIER_CONJUNCTIONS.has(token.lower);
  return BARRIER_PUNCTUATION.has(token.text);
}

function isParticipleShape(token: Token): boolean {
  if (!token.isWord) return false;
  if (IRREGULAR_PARTICIPLES.has(token.lower)) return true;
  const match = RE_REGULAR_PARTICIPLE_SUFFIX.exec(token.lower);
  if (!match) return false;
  return !RE_STEM_STRESS_ACCENT.test(match[1]);
}

interface ParticipleSearchResult {
  index: number;
}

function findParticipleAfter(tokens: readonly Token[], startIndex: number): ParticipleSearchResult | null {
  let i = startIndex;
  let connectorsUsed = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (isParticipleShape(token)) return { index: i };
    if (isBarrier(token)) return null;
    if (isConnector(token) && connectorsUsed < MAX_CONNECTOR_TOKENS) {
      connectorsUsed++;
      i++;
      continue;
    }
    return null;
  }

  return null;
}

interface AgentSearchResult {
  markerIndex: number;
}

function porLicensesAgent(next: Token | undefined): boolean {
  if (!next?.isWord) return false;
  if (NON_AGENT_HEADS.has(next.lower)) return false;
  return AGENT_DETERMINERS.has(next.lower) || AGENT_PRONOUNS.has(next.lower) || RE_PROPER_NOUN_START.test(next.text);
}

function findAgentAfter(tokens: readonly Token[], startIndex: number): AgentSearchResult | null {
  let i = startIndex;
  let connectorsUsed = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.isWord && AGENT_MARKERS.has(token.lower)) {
      const next = tokens[i + 1];
      const isNonAgentHead = next?.isWord && NON_AGENT_HEADS.has(next.lower);
      if (!isNonAgentHead) return { markerIndex: i };
      return null;
    }
    if (token.isWord && token.lower === POR_AGENT_MARKER) {
      return porLicensesAgent(tokens[i + 1]) ? { markerIndex: i } : null;
    }
    if (isBarrier(token)) return null;
    if (isConnector(token) && connectorsUsed < MAX_CONNECTOR_TOKENS) {
      connectorsUsed++;
      i++;
      continue;
    }
    return null;
  }

  return null;
}

interface AgentPhraseExtent {
  end: number;
  truncated: boolean;
}

function isAdjunctBoundary(tokens: readonly Token[], j: number): boolean {
  const token = tokens[j];
  if (!token.isWord) return false;
  if (NON_AGENT_HEADS.has(token.lower)) return true;
  const next = tokens[j + 1];
  return (token.lower === "à" || token.lower === "às") && (next?.isWord ?? false) && NON_AGENT_HEADS.has(next.lower);
}

function extendAgentPhraseEnd(tokens: readonly Token[], markerIndex: number): AgentPhraseExtent {
  let end = tokens[markerIndex].end;
  let consumed = 0;
  let j = markerIndex + 1;

  while (j < tokens.length && consumed < MAX_AGENT_PHRASE_TOKENS) {
    const token = tokens[j];
    if (isBarrier(token) || isAdjunctBoundary(tokens, j)) return { end, truncated: false };
    end = token.end;
    consumed++;
    j++;
  }

  const truncated = j < tokens.length && tokens[j].isWord;
  return { end, truncated };
}

function buildJustification(eventiveness: Eventiveness, agentTruncated: boolean): string {
  if (eventiveness === "agent") {
    if (!agentTruncated) {
      return (
        "Frase na voz passiva, com agente explícito — o texto já diz quem praticou a " +
        "ação. Considere reescrever na voz ativa para tornar a frase mais direta; a " +
        "ferramenta não reescreve automaticamente."
      );
    }
    return (
      "Frase na voz passiva com agente explícito, mas o agente é longo demais para a " +
      "ferramenta delimitar com segurança — reconhece só os primeiros " +
      `${MAX_AGENT_PHRASE_TOKENS} termos após o marcador. Indique o agente manualmente ou ` +
      "reescreva na voz ativa; converter automaticamente arriscaria cortar o agente no meio " +
      "e colar o resto da frase ao objeto, corrompendo o sentido."
    );
  }
  if (eventiveness === "postposed_subject") {
    return (
      "Frase na voz passiva: a oração começa no verbo e o sujeito vem depois do particípio " +
      "(“É vedada a cobrança” = “a cobrança é vedada”). Falta dizer quem pratica a ação. Indique o " +
      "agente ou reescreva na voz ativa; a ferramenta não reescreve automaticamente."
    );
  }
  return (
    "Frase na voz passiva, sem agente que a ferramenta reconheça com segurança. Ela reconhece " +
    '"pelo/pela/pelos/pelas" e "por" seguido de nome próprio, pronome ou determinante indefinido ' +
    '("por João", "por ela", "por uma comissão"); "por" + substantivo comum ("por lei", "por engano") ' +
    "fica de fora por ser ambíguo entre agente e adjunto. Indique o agente ou reescreva na voz ativa; a " +
    "ferramenta não reescreve automaticamente porque isso exigiria adivinhar quem agiu."
  );
}

export const passiveVoicePass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  dataDeps: [
    "verbos-ser.pt",
    "participios-irregulares.pt",
    "participios-ambiguos.pt",
    "participios-falsos-nominais.pt",
    "adjuntos-nao-agente.pt",
  ],

  run(ctx) {
    if (!ctx.config.passiveVoice.enabled) return [];

    const findings: PassFinding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const tokens = sentence.tokens;

      for (let i = 0; i < tokens.length; i++) {
        const anchor = tokens[i];
        if (!(anchor.isWord && SER_FORMS.has(anchor.lower))) continue;

        const participleMatch = findParticipleAfter(tokens, i + 1);
        if (!participleMatch) continue;

        const participle = tokens[participleMatch.index];
        if (AMBIGUOUS_PARTICIPLES.has(participle.lower) || NOMINAL_FALSE_POSITIVES.has(participle.lower)) {
          continue;
        }

        const agentMatch = findAgentAfter(tokens, participleMatch.index + 1);
        const hasAgent = agentMatch !== null;

        if (DEONTIC_PARTICIPLES.has(participle.lower) && !hasAgent) continue;

        const agentExtent = hasAgent ? extendAgentPhraseEnd(tokens, agentMatch.markerIndex) : null;
        const agentTruncated = agentExtent?.truncated ?? false;

        let eventiveness: Eventiveness;
        if (hasAgent) {
          eventiveness = "agent";
        } else if (!PRESENT_INDICATIVE_SER.has(anchor.lower)) {
          eventiveness = "eventive_tense";
        } else if (!hasPreverbalSubject(tokens, i)) {
          eventiveness = "postposed_subject";
        } else {
          continue;
        }

        const start = compositeStart(tokens, i) ?? anchor.start;
        const end = agentExtent ? agentExtent.end : participle.end;

        const marker = hasAgent ? tokens[agentMatch.markerIndex] : null;
        const meta: Record<string, string | number | boolean> = {
          hasAgent,
          eventiveness,
          participleStart: participle.start,
          participleEnd: participle.end,
        };
        if (hasAgent && marker) {
          meta.agentMarkerStart = marker.start;
          meta.agentMarkerEnd = marker.end;
          meta.agentEnd = end;
          meta.subjectStart = sentence.start;
          meta.agentTruncated = agentTruncated;
        }

        findings.push({
          criterion: CRITERION,
          category: "syntactic",
          span: { start, end, text: ctx.doc.source.slice(start, end) },
          severity: "warning",
          requiresHuman: !hasAgent || agentTruncated,
          justification: buildJustification(eventiveness, agentTruncated),
          meta,
        });
      }
    }

    return findings;
  },
};
