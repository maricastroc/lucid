/**
 * Helpers de VIEW derivados do `Diagnostic` — puros, sem lógica de análise.
 *
 *  - `sentenceBoundsAt`: expande um span às fronteiras da frase, só para o "modo lupa"
 *    (escurecer tudo menos a frase do caso). Heurística de apresentação, não de engine.
 *  - `partitionFindings`: separa os achados em dois baldes de AÇÃO — os que a ferramenta
 *    resolve com segurança (têm `suggestion`) e os que exigem decisão humana (não têm).
 *  - `planSafeApplications`: ordena as substituições seguras da direita para a esquerda e
 *    descarta sobreposições, para aplicar todas de uma vez sem deslocar offsets.
 */
import type { Finding } from "@/lucid";

const TERMINATORS = new Set([".", "!", "?", "…", "\n"]);
const WS = /\s/;

export function sentenceBoundsAt(text: string, start: number, end: number): { start: number; end: number } {
  let s = start;
  while (s > 0 && !TERMINATORS.has(text[s - 1])) s--;
  while (s < start && WS.test(text[s])) s++;

  let e = end;
  while (e < text.length && !TERMINATORS.has(text[e])) e++;
  if (e < text.length) e++;

  return { start: s, end: e };
}

export interface Buckets {
  /** têm sugestão mecanicamente segura → aplicáveis com um clique */
  resolvable: Finding[];
  /** sem sugestão aplicável → a decisão é do autor */
  human: Finding[];
}

export function partitionFindings(findings: readonly Finding[]): Buckets {
  const resolvable: Finding[] = [];
  const human: Finding[] = [];
  for (const f of findings) {
    if (f.suggestion !== undefined) resolvable.push(f);
    else human.push(f);
  }
  return { resolvable, human };
}

/**
 * Aplica todas as sugestões seguras a um texto, da direita para a esquerda (para não
 * invalidar offsets) e pulando qualquer finding que se sobreponha a um já aplicado. Puro:
 * devolve o novo texto sem tocar em nada mais.
 */
export function applySafeSuggestions(text: string, findings: readonly Finding[]): string {
  const safe = findings
    .filter((f) => f.suggestion !== undefined)
    .sort((a, b) => b.span.start - a.span.start);

  let result = text;
  let boundary = Infinity;
  for (const f of safe) {
    if (f.span.end > boundary) continue; // sobrepõe um já aplicado → pula
    result = result.slice(0, f.span.start) + f.suggestion + result.slice(f.span.end);
    boundary = f.span.start;
  }
  return result;
}
