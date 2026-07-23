import type { Finding } from "@/lucid/core/types";
import { extractPassiveRoles } from "./passive-roles";

export interface PassiveScaffold {
  agent: string;
  action: { participle: string; baseVerb: string | null };
  object: string | null;
}

export function passiveScaffold(finding: Finding, source: string): PassiveScaffold | null {
  const roles = extractPassiveRoles(finding, source);
  if (!roles || !roles.hasAgent || roles.agentBody === null) return null;

  return {
    agent: roles.agentBody,
    action: { participle: roles.participle, baseVerb: roles.baseVerbLemma },
    object: roles.objectRegion,
  };
}
