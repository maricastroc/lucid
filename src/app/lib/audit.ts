/**
 * Helpers de VIEW derivados do `Diagnostic` — puros, sem lógica de análise.
 *
 *  - `applySafeSuggestions`: ordena as substituições seguras da direita para a esquerda e
 *    descarta sobreposições, para aplicar todas de uma vez sem deslocar offsets.
 */
import type { Finding } from "@/lucid";

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
