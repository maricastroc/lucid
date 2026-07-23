import type { Finding, Pass, Token } from "@/lucid/core/types";
import { getPrepared } from "../datasets/registry";

const CRITERION = "passive_voice";
const PRINCIPLE = "5.3.3";

const SER_FORMS = getPrepared("verbos-ser.pt");
const IRREGULAR_PARTICIPLES = getPrepared("participios-irregulares.pt");
const AMBIGUOUS_PARTICIPLES = getPrepared("participios-ambiguos.pt");
const NOMINAL_FALSE_POSITIVES = getPrepared("participios-falsos-nominais.pt");

const CONNECTOR_ADVERBS = new Set(["não", "já", "ainda", "também", "sempre", "nunca", "apenas", "logo"]);
const RE_MENTE_ADVERB = /^\p{L}+mente$/u;

const BARRIER_PUNCTUATION = new Set([",", ";", ":", "!", "?", "…", "(", ")", "[", "]", '"', "'", "—"]);

const BARRIER_CONJUNCTIONS = new Set(["que", "mas", "e", "porque", "quando"]);

const AGENT_MARKERS = new Set(["pelo", "pela", "pelos", "pelas"]);

const NON_AGENT_IDIOM_HEADS = new Set(["menos", "visto", "contrário"]);

const MAX_CONNECTOR_TOKENS = 2;

const MAX_AGENT_PHRASE_TOKENS = 6;

const RE_REGULAR_PARTICIPLE_SUFFIX = /^(.{2,}?)(ad|id|íd)[ao]s?$/u;

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
  return RE_REGULAR_PARTICIPLE_SUFFIX.test(token.lower);
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


function findAgentAfter(tokens: readonly Token[], startIndex: number): AgentSearchResult | null {
  let i = startIndex;
  let connectorsUsed = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.isWord && AGENT_MARKERS.has(token.lower)) {
      const next = tokens[i + 1];
      const isIdiom = next?.isWord && NON_AGENT_IDIOM_HEADS.has(next.lower);
      if (!isIdiom) return { markerIndex: i };
      return null;
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

function extendAgentPhraseEnd(tokens: readonly Token[], markerIndex: number): AgentPhraseExtent {
  let end = tokens[markerIndex].end;
  let consumed = 0;
  let j = markerIndex + 1;

  while (j < tokens.length && consumed < MAX_AGENT_PHRASE_TOKENS) {
    const token = tokens[j];
    if (isBarrier(token)) return { end, truncated: false };
    end = token.end;
    consumed++;
    j++;
  }

  const truncated = j < tokens.length && tokens[j].isWord;
  return { end, truncated };
}

function buildJustification(hasAgent: boolean, agentTruncated: boolean): string {
  if (hasAgent && !agentTruncated) {
    return (
      "Frase na voz passiva, com agente explícito — o texto já diz quem praticou a " +
      "ação. Considere reescrever na voz ativa para tornar a frase mais direta; a " +
      "ferramenta não reescreve automaticamente."
    );
  }
  if (agentTruncated) {
    return (
      "Frase na voz passiva com agente explícito, mas o agente é longo demais para a " +
      "ferramenta delimitar com segurança — reconhece só os primeiros " +
      `${MAX_AGENT_PHRASE_TOKENS} termos após o marcador. Indique o agente manualmente ou ` +
      "reescreva na voz ativa; converter automaticamente arriscaria cortar o agente no meio " +
      "e colar o resto da frase ao objeto, corrompendo o sentido."
    );
  }
  return (
    "Frase na voz passiva, sem agente que a ferramenta reconheça com segurança — o padrão " +
    'fechado que ela detecta é "pelo/pela/pelos/pelas"; se o texto nomear o agente de outra ' +
    'forma (ex.: "por fulano"), confira o trecho antes de decidir. Indique o agente ou ' +
    "reescreva na voz ativa; a ferramenta não reescreve automaticamente porque isso exigiria " +
    "adivinhar quem agiu."
  );
}

export const passiveVoicePass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  principle: PRINCIPLE,
  dataDeps: [
    "verbos-ser.pt",
    "participios-irregulares.pt",
    "participios-ambiguos.pt",
    "participios-falsos-nominais.pt",
  ],

  run(ctx) {
    if (!ctx.config.passiveVoice.enabled) return [];

    const findings: Finding[] = [];

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

        const agentExtent = hasAgent ? extendAgentPhraseEnd(tokens, agentMatch.markerIndex) : null;
        const agentTruncated = agentExtent?.truncated ?? false;

        const start = anchor.start;
        const end = agentExtent ? agentExtent.end : participle.end;

        const marker = hasAgent ? tokens[agentMatch.markerIndex] : null;
        const meta: Record<string, string | number | boolean> = {
          hasAgent,
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
          principle: PRINCIPLE,
          span: { start, end, text: ctx.doc.source.slice(start, end) },
          severity: "warning",
          requiresHuman: !hasAgent || agentTruncated,
          justification: buildJustification(hasAgent, agentTruncated),
          meta,
        });
      }
    }

    return findings;
  },
};
