import type { Finding, Pass, Token } from "../types";
import type { JargonEntry, CompiledEntry, JargonDomain } from "../data/types";
import { getPrepared } from "../data/registry";

export { compileJargonEntries } from "../data/prepare";
export type { JargonEntry, CompiledEntry } from "../data/types";

const CRITERION = "jargon";
const PRINCIPLE = "5.3.2";

const BY_FIRST_WORD: ReadonlyMap<string, readonly CompiledEntry[]> = getPrepared("jargao.pt").byFirstWord;

const RE_UPPERCASE_START = /^\p{Lu}/u;

const QUOTE_OPENERS = new Set(['"', "“", "«"]);

function matchingCloser(opener: string, candidate: string): boolean {
  if (opener === '"') return candidate === '"';
  if (opener === "“") return candidate === "”";
  if (opener === "«") return candidate === "»";
  return false;
}

function computeQuoteRanges(tokens: readonly Token[]): Array<readonly [number, number]> {
  const ranges: Array<readonly [number, number]> = [];
  let openIndex: number | null = null;
  let openChar: string | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.isWord) continue;

    if (openIndex === null) {
      if (QUOTE_OPENERS.has(token.text)) {
        openIndex = i;
        openChar = token.text;
      }
      continue;
    }

    if (openChar !== null && matchingCloser(openChar, token.text)) {
      ranges.push([openIndex, i]);
      openIndex = null;
      openChar = null;
    }
  }

  return ranges;
}

function overlapsQuotes(ranges: readonly (readonly [number, number])[], start: number, end: number): boolean {
  return ranges.some(([open, close]) => start <= close && end >= open);
}

function looksLikeProperNoun(token: Token, tokens: readonly Token[], index: number): boolean {
  if (!RE_UPPERCASE_START.test(token.text)) return false;

  for (let i = 0; i < index; i++) {
    if (tokens[i].isWord) return true;
  }
  return false;
}

function matchAt(tokens: readonly Token[], index: number): CompiledEntry | null {
  const first = tokens[index];
  if (!first.isWord) return null;

  const candidates = BY_FIRST_WORD.get(first.lower);
  if (!candidates) return null;

  for (const candidate of candidates) {
    const { words } = candidate;
    if (index + words.length > tokens.length) continue;

    let matches = true;
    for (let k = 0; k < words.length; k++) {
      const token = tokens[index + k];
      if (!token.isWord || token.lower !== words[k]) {
        matches = false;
        break;
      }
    }
    if (matches) return candidate;
  }

  return null;
}

function domainLabel(domain: JargonDomain): string {
  if (domain === "legal") return "jurídico";
  if (domain === "administrative") return "administrativo";
  return "técnico";
}

function buildJustification(entry: JargonEntry, hasSuggestion: boolean): string {
  const base = `Este termo pode não ser familiar para leitores fora do domínio ${domainLabel(entry.domain)}.`;

  if (hasSuggestion) {
    return (
      `${base} Poderia ser substituído por "${entry.plain}"; a ferramenta não reescreve ` +
      "automaticamente — veja a sugestão."
    );
  }

  if (entry.plain) {
    const motivo =
      entry.reason === "context_dependent"
        ? "a troca depende do que vem depois na frase, e substituir sem ajustar o resto " +
          "poderia gerar um erro gramatical"
        : entry.reason === "polysemous"
          ? "esta palavra tem mais de um sentido possível, e trocar sem confirmar o " +
            "sentido aqui seria arriscado"
          : "a ferramenta não tem, aqui, uma troca segura o bastante para sugerir automaticamente";

    return `${base} Um equivalente possível é "${entry.plain}", mas ${motivo}; a decisão de trocar é do autor.`;
  }

  return `${base} A ferramenta não tem, no glossário, um equivalente simples e seguro para sugerir aqui.`;
}

export const jargonPass: Pass = {
  criterion: CRITERION,
  category: "lexical",
  principle: PRINCIPLE,
  dataDeps: ["jargao.pt"],

  run(ctx) {
    if (!ctx.config.jargon.enabled) return [];

    const findings: Finding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const tokens = sentence.tokens;
      const quoteRanges = computeQuoteRanges(tokens);

      let i = 0;
      while (i < tokens.length) {
        const token = tokens[i];
        if (!token.isWord) {
          i++;
          continue;
        }

        const match = matchAt(tokens, i);
        if (!match) {
          i++;
          continue;
        }

        const endIndex = i + match.words.length - 1;

        const suppressedByQuotes = overlapsQuotes(quoteRanges, i, endIndex);
        const suppressedByProperNoun = match.words.length === 1 && looksLikeProperNoun(token, tokens, i);

        if (suppressedByQuotes || suppressedByProperNoun) {
          i++;
          continue;
        }

        const start = token.start;
        const end = tokens[endIndex].end;
        const suggestionAllowed =
          ctx.config.jargon.suggestFromGlossary && match.entry.safeForSuggestion && match.entry.plain !== null;

        findings.push({
          criterion: CRITERION,
          category: "lexical",
          principle: PRINCIPLE,
          span: { start, end, text: ctx.doc.source.slice(start, end) },
          severity: "warning",
          suggestion: suggestionAllowed ? match.entry.plain! : undefined,
          requiresHuman: !suggestionAllowed,
          justification: buildJustification(match.entry, suggestionAllowed),
          meta: { term: match.entry.term, domain: match.entry.domain, kind: match.entry.kind },
        });

        i = endIndex + 1;
      }
    }

    return findings;
  },
};
