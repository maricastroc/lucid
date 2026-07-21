/**
 * Tier 2 · ação estrutural assistida (determinística) — DIVISÃO DE CLÁUSULA.
 *
 * Localiza FRONTEIRAS DE CLÁUSULA defensáveis dentro de um `span` (tipicamente a frase de
 * um finding `long_sentence`) e produz um transform PURO que insere a quebra escolhida
 * pelo autor. A ferramenta NÃO decide onde cortar nem o que é supérfluo (isso é trabalho
 * de autor — Princípio 1); ela só aponta pontos possíveis e, quando o autor escolhe um,
 * devolve um RASCUNHO — ponto final + maiúscula, sem apagar palavra — que ele revisa e
 * re-analisa. Ver ADR-012 em docs/DECISOES.md.
 *
 * Determinístico e byte-idêntico: opera sobre o texto normalizado (mesma NFC que
 * `analyze`), reusa o `tokenize` do pipeline (nunca uma segmentação própria) e não toca em
 * rede nem LLM — por isso vive em `core/**` e é coberto pela cerca do depcheck.
 *
 * O que NÃO faz, de propósito: não remove conjunções ("É preciso X, e Y" vira "É preciso
 * X. E Y", com o "E" preservado — iniciar frase com conjunção é gramatical em PT e não
 * exige adivinhar), não reordena, não funde cláusulas. Fronteira insegura → simplesmente
 * não vira ponto de divisão.
 */
import type { Span } from "../types";
import { normalize } from "../document/normalize";
import { tokenize } from "../document/tokenize";

const RE_LETTER = /\p{L}/u;

/** Conjunções coordenativas cuja presença após vírgula marca fronteira de cláusula. */
const COORD_CONJUNCTIONS: ReadonlySet<string> = new Set([
  "e",
  "mas",
  "porém",
  "ou",
  "contudo",
  "todavia",
  "entretanto",
  "pois",
  "portanto",
  "logo",
]);

/** Pontuação forte que, sozinha, encerra uma cláusula. */
const STRONG_PUNCTUATION: Record<string, SplitKind> = {
  ";": "semicolon",
  "—": "dash",
};

export type SplitKind = "semicolon" | "dash" | "comma_conjunction";

export interface SplitPoint {
  /**
   * Offset (no texto normalizado) da pontuação de fronteira — âncora estável, serve de id
   * e é o único dado que `applySplitAt` precisa recomputar o resto.
   */
  offset: number;
  kind: SplitKind;
  /** o que marca a fronteira, para exibição: ";", "—" ou a conjunção ("e", "mas", …). */
  marker: string;
  /** prévia curta (flatten) do texto imediatamente antes da fronteira. */
  before: string;
  /** prévia curta (flatten) do texto a partir da próxima palavra (o início da 2ª frase). */
  after: string;
}

const PREVIEW_CHARS = 32;
const MAX_POINTS = 6;

function flat(s: string): string {
  return s.replace(/\s+/gu, " ").trim();
}

/** Primeira letra a partir de `from` (inclusive) dentro de `[from, limit)`, ou -1. */
function firstLetterFrom(source: string, from: number, limit: number): number {
  let i = from;
  while (i < limit && !RE_LETTER.test(source[i])) i++;
  return i < limit ? i : -1;
}

/**
 * Pontos de divisão candidatos dentro de `span`. `text` é o texto bruto do autor;
 * normalizamos internamente para que os offsets coincidam com os do `Diagnostic`
 * (findings e span vêm do `Document.source`, também NFC). Ordenados por offset.
 */
export function clauseSplitPoints(text: string, span: Span): SplitPoint[] {
  const source = normalize(text);
  const tokens = tokenize(source).filter((t) => t.start >= span.start && t.end <= span.end);

  const points: SplitPoint[] = [];
  const seen = new Set<number>();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.isWord) continue;

    let kind: SplitKind | null = null;
    let marker = "";

    if (token.text in STRONG_PUNCTUATION) {
      kind = STRONG_PUNCTUATION[token.text];
      marker = token.text;
    } else if (token.text === ",") {
      const next = tokens[i + 1];
      // A conjunção vira a 1ª palavra da nova frase, então a 2ª cláusula só tem conteúdo
      // se houver AINDA outra palavra depois dela — senão sobraria um "E." solto.
      const hasContentAfterConjunction = tokens.slice(i + 2).some((t) => t.isWord);
      if (next?.isWord && COORD_CONJUNCTIONS.has(next.lower) && hasContentAfterConjunction) {
        kind = "comma_conjunction";
        marker = next.text;
      }
    }

    if (!kind) continue;

    // Precisa de conteúdo dos dois lados: uma palavra antes (1ª cláusula) e a palavra a
    // capitalizar depois (2ª cláusula). Fronteira nas bordas da frase não divide nada.
    const hasWordBefore = tokens.slice(0, i).some((t) => t.isWord);
    const nextLetter = firstLetterFrom(source, token.start + 1, span.end);
    if (!hasWordBefore || nextLetter < 0) continue;

    const offset = token.start;
    if (seen.has(offset)) continue;
    seen.add(offset);

    points.push({
      offset,
      kind,
      marker,
      before: flat(source.slice(Math.max(span.start, offset - PREVIEW_CHARS), offset)),
      after: flat(source.slice(nextLetter, Math.min(span.end, nextLetter + PREVIEW_CHARS))),
    });

    if (points.length >= MAX_POINTS) break;
  }

  return points;
}

/**
 * Aplica a quebra no ponto escolhido e devolve o TEXTO INTEIRO com o rascunho. Transform
 * puro e byte-determinístico: apara o espaço à esquerda da fronteira, insere ". " e
 * capitaliza a primeira letra da 2ª cláusula — preservando toda palavra (inclusive a
 * conjunção, que passa a iniciar a nova frase). Fronteira sem letra à frente → no-op
 * seguro (devolve o texto normalizado inalterado).
 */
export function applySplitAt(text: string, point: SplitPoint): string {
  const source = normalize(text);
  const nextLetter = firstLetterFrom(source, point.offset + 1, source.length);
  if (nextLetter < 0) return source;

  const left = source.slice(0, point.offset).replace(/[ \t]+$/u, "");
  const right = source.slice(nextLetter);
  return `${left}. ${right.charAt(0).toUpperCase()}${right.slice(1)}`;
}
