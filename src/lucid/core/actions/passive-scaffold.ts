import type { Finding } from "../types";
import { getPrepared } from "../data/registry";

const PARTICIPLE_TO_INFINITIVE: Readonly<Record<string, string>> = getPrepared("participios-infinitivo.pt");

export interface PassiveScaffold {
  agent: string;
  action: { participle: string; baseVerb: string | null };
  object: string | null;
}

function metaNum(finding: Finding, key: string): number | null {
  const value = finding.meta?.[key];
  return typeof value === "number" ? value : null;
}

function toMasculineSingular(participleLower: string): string {
  let s = participleLower;
  if (s.endsWith("s")) s = s.slice(0, -1);
  if (s.endsWith("a")) s = `${s.slice(0, -1)}o`;
  return s;
}

function baseVerbOf(participle: string): string | null {
  return PARTICIPLE_TO_INFINITIVE[toMasculineSingular(participle.toLowerCase())] ?? null;
}

function trimRole(text: string): string {
  return text.replace(/^[\s.,;:!?…]+/u, "").replace(/[\s.,;:!?…]+$/u, "");
}

export function passiveScaffold(finding: Finding, source: string): PassiveScaffold | null {
  if (finding.criterion !== "passive_voice" || finding.meta?.hasAgent !== true) return null;

  const participleStart = metaNum(finding, "participleStart");
  const participleEnd = metaNum(finding, "participleEnd");
  const agentMarkerEnd = metaNum(finding, "agentMarkerEnd");
  const agentEnd = metaNum(finding, "agentEnd");
  const subjectStart = metaNum(finding, "subjectStart");
  if (
    participleStart === null ||
    participleEnd === null ||
    agentMarkerEnd === null ||
    agentEnd === null ||
    subjectStart === null
  ) {
    return null;
  }

  const participle = source.slice(participleStart, participleEnd);
  const agent = trimRole(source.slice(agentMarkerEnd, agentEnd));

  const objectRegion = trimRole(source.slice(subjectStart, finding.span.start));

  return {
    agent,
    action: { participle, baseVerb: baseVerbOf(participle) },
    object: objectRegion.length > 0 ? objectRegion : null,
  };
}
