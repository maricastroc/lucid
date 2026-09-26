import type { PassFinding, Pass, Token } from "@/lucid/core/types";
import type { JargonEntry, CompiledEntry, JargonDomain } from "../datasets/types";
import { getPrepared } from "../datasets/registry";
import type { PtConfig } from "../config";

export { compileJargonEntries } from "../datasets/prepare";
export type { JargonEntry, CompiledEntry } from "../datasets/types";

const CRITERION = "jargon";

const BY_FIRST_WORD: ReadonlyMap<string, readonly CompiledEntry[]> = getPrepared("jargao.pt").byFirstWord;

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
  const base = `Termo ${domainLabel(entry.domain)} que pode não ser familiar a leitores de fora dessa área.`;

  if (hasSuggestion) {
    return (
      `${base} O glossário do Lucid registra “${entry.plain}” como equivalente; confira se ele mantém ` +
      "o sentido nesta frase antes de usá-lo."
    );
  }

  if (entry.reason === "polysemous") {
    return (
      `${base} Esta palavra tem mais de um sentido, e só o contexto diz qual vale aqui; por isso o Lucid ` +
      "não indica equivalente. Confirme o sentido e escolha uma palavra comum que o expresse."
    );
  }

  if (entry.reason === "divergent_sense") {
    return (
      `${base} O Lucid não registra equivalente para ele. ${entry.withheldBecause} Escolha a forma que diga ` +
      "o que você quer nesta frase."
    );
  }

  if (entry.plain) {
    if (entry.reason === "context_dependent") {
      return (
        `${base} A forma mais simples registrada é “${entry.plain}”, mas ela exige ajustar o que vem ` +
        "depois na frase. Se usá-la, reescreva o trecho seguinte para manter a concordância e a regência."
      );
    }
    return (
      `${base} O glossário registra “${entry.plain}” como forma mais simples; confira se ela mantém o ` +
      "sentido nesta frase antes de usá-la."
    );
  }

  return (
    `${base} O glossário do Lucid não registra equivalente para ele. Troque por uma palavra comum que ` +
    "diga o mesmo ou explique o termo na primeira vez que ele aparecer."
  );
}

export const jargonPass: Pass<PtConfig> = {
  criterion: CRITERION,
  category: "lexical",
  dataDeps: ["jargao.pt"],

  run(ctx) {
    if (!ctx.config.jargon.enabled) return [];

    const findings: PassFinding[] = [];

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

        if (overlapsQuotes(quoteRanges, i, endIndex)) {
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
