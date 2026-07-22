import type { Finding } from "@/lucid/core/types";
import { extractPassiveRoles } from "./passive-roles";

export interface PassiveScaffold {
  agent: string;
  action: { participle: string; baseVerb: string | null };
  object: string | null;
}

/**
 * Andaime READ-ONLY da voz passiva com agente (ADR-013): devolve os papéis (agente / ação /
 * objeto) rotulados "confira", nunca uma reescrita. Consome a extração compartilhada
 * (`passive-roles.ts`, ADR-032) — sem duplicar a lógica de offsets.
 */
export function passiveScaffold(finding: Finding, source: string): PassiveScaffold | null {
  const roles = extractPassiveRoles(finding, source);
  if (!roles || !roles.hasAgent || roles.agentBody === null) return null;

  return {
    agent: roles.agentBody,
    action: { participle: roles.participle, baseVerb: roles.baseVerbLemma },
    object: roles.objectRegion,
  };
}
