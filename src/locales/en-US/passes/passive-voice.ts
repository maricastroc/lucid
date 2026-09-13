import type { Pass, PassFinding, Token } from "@/lucid/core/types";
import type { EnConfig } from "../config";
import type { PassiveLexiconEn } from "../datasets/registry";

const CRITERION = "passive_voice";
const MAX_INTERVENING = 2;
const AGENT_SEARCH = 3;
const AGENT_WINDOW = 8;

export type PassiveForm = "present" | "past" | "perfect" | "progressive" | "modal";

type BeKind = "present" | "past" | "base" | "participle" | "progressive";

function beKind(lower: string, lex: PassiveLexiconEn): BeKind | null {
  if (lex.bePresent.has(lower) || /['’](?:re|m)$/.test(lower)) return "present";
  if (lex.bePast.has(lower)) return "past";
  if (lex.beBase.has(lower)) return "base";
  if (lex.beParticiple.has(lower)) return "participle";
  if (lex.beProgressive.has(lower)) return "progressive";
  return null;
}

function isAdverb(lower: string, lex: PassiveLexiconEn): boolean {
  return lex.interveningAdverbs.has(lower) || (lower.length > 3 && lower.endsWith("ly"));
}

export function isParticiple(lower: string, lex: PassiveLexiconEn): boolean {
  if (lex.irregularParticiples.has(lower)) return true;
  if (lower.includes("-") || lower.length < 4 || !lower.endsWith("ed")) return false;
  if (!/^[a-z]+$/.test(lower)) return false;
  if (lex.nonParticipleEd.has(lower)) return false;
  if (lower.endsWith("eed") && !lex.eedParticiples.has(lower)) return false;
  return true;
}

function nextWord(tokens: readonly Token[], index: number): number | null {
  const next = index + 1;
  return next < tokens.length && tokens[next].isWord ? next : null;
}

function previousWord(tokens: readonly Token[], index: number): number | null {
  const prev = index - 1;
  return prev >= 0 && tokens[prev].isWord ? prev : null;
}

function auxiliaryStart(
  tokens: readonly Token[],
  index: number,
  accepts: (lower: string) => boolean,
  lex: PassiveLexiconEn,
): number | null {
  let cursor = previousWord(tokens, index);
  for (let hops = 0; cursor !== null && hops <= MAX_INTERVENING; hops++) {
    const lower = tokens[cursor].lower;
    if (accepts(lower)) return cursor;
    if (!isAdverb(lower, lex)) return null;
    cursor = previousWord(tokens, cursor);
  }
  return null;
}

interface Agent {
  readonly markerIndex: number;
  readonly end: number;
  readonly truncated: boolean;
}

function isNonAgentBy(tokens: readonly Token[], byIndex: number, lex: PassiveLexiconEn): boolean {
  const after = byIndex + 1;
  if (after >= tokens.length) return true;
  const first = tokens[after];
  if (!first.isWord) return /^\p{Nd}/u.test(first.text);
  if (lex.nonAgentByFirst.has(first.lower)) return true;
  const second = nextWord(tokens, after);
  return second !== null && lex.nonAgentByPhrases.has(`${first.lower} ${tokens[second].lower}`);
}

function agentAfter(tokens: readonly Token[], participle: number, lex: PassiveLexiconEn): Agent | null {
  let cursor = nextWord(tokens, participle);
  for (let hops = 0; cursor !== null && hops < AGENT_SEARCH; hops++) {
    const lower = tokens[cursor].lower;
    if (lower === "by") {
      if (isNonAgentBy(tokens, cursor, lex)) return null;
      let end = cursor;
      let words = 0;
      let next = nextWord(tokens, end);
      while (next !== null && words < AGENT_WINDOW && !lex.agentBoundaries.has(tokens[next].lower)) {
        end = next;
        words += 1;
        next = nextWord(tokens, end);
      }
      if (words === 0) return null;
      const truncated = words === AGENT_WINDOW && next !== null && !lex.agentBoundaries.has(tokens[next].lower);
      return { markerIndex: cursor, end: tokens[end].end, truncated };
    }
    if (lex.agentBoundaries.has(lower)) return null;
    cursor = nextWord(tokens, cursor);
  }
  return null;
}

function justification(form: PassiveForm, agent: Agent | null): string {
  if (agent !== null && !agent.truncated) {
    return (
      "Passive voice with the agent after the verb, introduced by “by”. The sentence says who acts, but only " +
      "after the action; making that agent the subject shows who does what (ISO 24495-1, 5.3.3). Whether to " +
      "change it is the author's decision."
    );
  }
  if (agent !== null) {
    return (
      "Passive voice with an agent introduced by “by”, but the agent runs past the window Lucid reads, so it " +
      "may be incomplete. Check who acts before deciding anything."
    );
  }
  const present =
    form === "present"
      ? " In the present tense without an agent, the construction can also describe a state (“the office is " +
        "closed”) rather than an action; only the context decides."
      : "";
  return (
    "Passive voice without an agent: the sentence does not say who performs the action (ISO 24495-1, 5.3.3). " +
    "Lucid does not supply the missing agent — only the author knows who acts." +
    present
  );
}

export const passiveVoicePass: Pass<EnConfig> = {
  criterion: CRITERION,
  category: "syntactic",
  dataDeps: ["passive.en"],

  run(ctx) {
    const lex = ctx.data.get<PassiveLexiconEn>("passive.en");
    const findings: PassFinding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const tokens = sentence.tokens;
      const consumed = new Set<number>();

      for (let i = 0; i < tokens.length; i++) {
        if (consumed.has(i) || !tokens[i].isWord) continue;
        const firstKind = beKind(tokens[i].lower, lex);
        if (firstKind === null) continue;

        const chain: BeKind[] = [firstKind];
        let cursor = nextWord(tokens, i);
        let intervening = 0;
        let participle: number | null = null;

        while (cursor !== null) {
          const lower = tokens[cursor].lower;
          const kind = beKind(lower, lex);
          if (kind === "participle" || kind === "progressive") {
            chain.push(kind);
            consumed.add(cursor);
          } else if (isParticiple(lower, lex)) {
            participle = cursor;
            break;
          } else if (isAdverb(lower, lex) && intervening < MAX_INTERVENING) {
            intervening += 1;
          } else {
            break;
          }
          cursor = nextWord(tokens, cursor);
        }

        if (participle === null) continue;
        const participleToken = tokens[participle];
        if (lex.stativeAfterBe.has(participleToken.lower)) continue;
        const after = nextWord(tokens, participle);
        if (participleToken.lower === "used" && after !== null && tokens[after].lower === "to") {
          const verb = nextWord(tokens, after);
          if (verb !== null && tokens[verb].lower.endsWith("ing")) continue;
        }

        let form: PassiveForm;
        let start = tokens[i].start;
        if (chain.includes("progressive")) {
          form = "progressive";
        } else if (chain.includes("participle")) {
          form = "perfect";
          const aux = auxiliaryStart(tokens, i, (l) => lex.perfectAuxiliaries.has(l) || /['’](?:ve|d)$/.test(l), lex);
          if (aux !== null) start = tokens[aux].start;
        } else if (firstKind === "base") {
          form = "modal";
          const aux = auxiliaryStart(tokens, i, (l) => lex.modals.has(l) || /['’]ll$/.test(l), lex);
          if (aux !== null) start = tokens[aux].start;
        } else {
          form = firstKind === "past" ? "past" : "present";
        }

        const agent = agentAfter(tokens, participle, lex);
        const end = agent !== null ? agent.end : participleToken.end;
        const meta: Record<string, string | number | boolean> = {
          hasAgent: agent !== null,
          form,
          participleStart: participleToken.start,
          participleEnd: participleToken.end,
        };
        if (agent !== null) {
          meta.agentMarkerStart = tokens[agent.markerIndex].start;
          meta.agentMarkerEnd = tokens[agent.markerIndex].end;
          meta.agentEnd = agent.end;
          meta.agentTruncated = agent.truncated;
        }

        findings.push({
          criterion: CRITERION,
          category: "syntactic",
          span: { start, end, text: ctx.doc.source.slice(start, end) },
          severity: "warning",
          requiresHuman: agent === null || agent.truncated,
          justification: justification(form, agent),
          meta,
        });
        i = participle;
      }
    }

    return findings;
  },
};
