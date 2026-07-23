import type { Finding } from "@/lucid/core/types";
import { sentenceSpanAt } from "@/lucid/core/document/locate";
import { getPrepared } from "../datasets/registry";
import { infinitiveFromRegularParticiple } from "./regular-morphology";

const PARTICIPLE_TO_INFINITIVE: Readonly<Record<string, string>> = getPrepared("participios-infinitivo.pt");
const ABBREVIATIONS = getPrepared("abreviacoes.pt");

export interface PassiveScaffold {
  agent: string;
  action: { participle: string; baseVerb: string | null };
  object: string | null;
}

function metaNum(finding: Finding, key: string): number | null {
  const value = finding.meta?.[key];
  return typeof value === "number" ? value : null;
}

function trimRole(text: string): string {
  return text.replace(/^[\s.,;:!?…]+/u, "").replace(/[\s.,;:!?…]+$/u, "");
}

function toMasculineSingular(participleLower: string): string {
  let s = participleLower;
  if (s.endsWith("s")) s = s.slice(0, -1);
  if (s.endsWith("a")) s = `${s.slice(0, -1)}o`;
  return s;
}

function baseVerbOf(participle: string): string | null {
  const mascSing = toMasculineSingular(participle.toLowerCase());
  return PARTICIPLE_TO_INFINITIVE[mascSing] ?? infinitiveFromRegularParticiple(mascSing);
}

export function passiveScaffold(finding: Finding, source: string): PassiveScaffold | null {
  if (finding.criterion !== "passive_voice") return null;
  if (finding.meta?.hasAgent !== true) return null;

  const participleStart = metaNum(finding, "participleStart");
  const participleEnd = metaNum(finding, "participleEnd");
  const agentMarkerEnd = metaNum(finding, "agentMarkerEnd");
  const agentEnd = metaNum(finding, "agentEnd");
  if (participleStart === null || participleEnd === null || agentMarkerEnd === null || agentEnd === null) return null;

  const agent = trimRole(source.slice(agentMarkerEnd, agentEnd));
  if (agent.length === 0) return null;

  const participle = source.slice(participleStart, participleEnd);
  const subjectStart = sentenceSpanAt(source, finding.span.start, ABBREVIATIONS).start;
  const objectRaw = trimRole(source.slice(subjectStart, finding.span.start));

  return {
    agent,
    action: { participle, baseVerb: baseVerbOf(participle) },
    object: objectRaw.length > 0 ? objectRaw : null,
  };
}
