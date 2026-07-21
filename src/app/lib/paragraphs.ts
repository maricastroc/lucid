/**
 * Utilitário de PARÁGRAFO para a reescrita de Tier 3 (ADR-016).
 *
 * A geração recebe o documento inteiro como contexto, mas o ALVO reescrito/aplicado é o
 * parágrafo — bloco de texto entre linhas em branco. Assim a reorganização tem contexto amplo
 * e o diff/aplicação continuam localizados e auditáveis.
 *
 * Puro: opera sobre o mesmo texto normalizado (`Diagnostic.text`) de onde vêm os offsets dos
 * findings, então o `Span` devolvido é compatível com `applyProposal`/`verifyRewrite`.
 */
import type { Span } from "@/lucid";

/** Separador de parágrafo: uma linha em branco (dois `\n`, tolerando espaços entre eles). */
const RE_BLANK_LINE = /\n[ \t]*\n/g;

/**
 * O `Span` do parágrafo que contém `offset`. Encontra a linha em branco anterior e a próxima;
 * as bordas são aparadas para não incluir espaços/quebras nas pontas. Se não houver linhas em
 * branco, o parágrafo é o texto inteiro (aparado).
 */
export function paragraphSpanAt(text: string, offset: number): Span {
  let start = 0;
  let end = text.length;

  RE_BLANK_LINE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = RE_BLANK_LINE.exec(text)) !== null) {
    const gapStart = match.index;
    const gapEnd = match.index + match[0].length;
    if (gapStart >= offset) {
      end = gapStart; // primeira fronteira em branco depois do offset → fim do parágrafo
      break;
    }
    // fronteira antes do offset (ou contendo-o) → o parágrafo começa depois dela.
    start = gapEnd;
  }

  // apara espaços/quebras das pontas
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;

  return { start, end, text: text.slice(start, end) };
}
