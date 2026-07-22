/**
 * Operações PURAS de edição de texto por span — compartilhadas pela mesa de revisão. Isoladas aqui
 * (sem React) para serem testáveis como lógica, no mesmo estilo do resto da suíte. São a base das
 * TRÊS origens de "novo texto" no Tier 2/3: ação mecânica, proposta da LLM e a EDIÇÃO À MÃO do autor.
 */
import type { Span } from "@/lucid";

/** Substitui o intervalo `[target.start, target.end)` de `text` por `replacement`. */
export function spliceSpan(text: string, target: Span, replacement: string): string {
  return text.slice(0, target.start) + replacement + text.slice(target.end);
}

/**
 * A string que a edição à mão de fato aplica: apara as pontas para não injetar espaço/quebra na
 * fronteira do span (o alvo já vem sem espaços nas bordas, então o resultado fica limpo).
 */
export function manualEditReplacement(draft: string): string {
  return draft.trim();
}

/**
 * A edição só pode ser aplicada quando o autor escreveu ALGO e esse algo é DIFERENTE do original —
 * evita aplicar um no-op ou esvaziar o trecho. Comparação em conteúdo aparado.
 */
export function isManualEditDirty(original: string, draft: string): boolean {
  const next = manualEditReplacement(draft);
  return next.length > 0 && next !== original.trim();
}
