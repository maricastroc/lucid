import type { OrgTerm } from "@/lucid/core/config";
import type { PassFinding, Pass, Token } from "@/lucid/core/types";

const CRITERION = "vocabulario_da_organizacao";

interface Compiled {
  readonly words: readonly string[];
  readonly entry: OrgTerm;
}

const WORD = /[\p{L}\p{N}]+/gu;

export function compileOrgTerms(terms: readonly OrgTerm[]): ReadonlyMap<string, readonly Compiled[]> {
  const byFirst = new Map<string, Compiled[]>();

  for (const entry of terms) {
    const words = (entry.term.toLocaleLowerCase("pt-BR").match(WORD) ?? []).filter((w) => w !== "");
    if (words.length === 0) continue;

    const open = byFirst.get(words[0]);
    const compiled: Compiled = { words, entry };
    if (open === undefined) byFirst.set(words[0], [compiled]);
    else open.push(compiled);
  }

  for (const list of byFirst.values()) list.sort((a, b) => b.words.length - a.words.length);

  return byFirst;
}

function matchAt(tokens: readonly Token[], index: number, byFirst: ReadonlyMap<string, readonly Compiled[]>) {
  const first = tokens[index];
  if (!first.isWord) return null;

  for (const candidate of byFirst.get(first.lower) ?? []) {
    if (index + candidate.words.length > tokens.length) continue;

    let matches = true;
    for (let k = 0; k < candidate.words.length; k += 1) {
      const token = tokens[index + k];
      if (!token.isWord || token.lower !== candidate.words[k]) {
        matches = false;
        break;
      }
    }
    if (matches) return candidate;
  }

  return null;
}

function justify(entry: OrgTerm, hasSuggestion: boolean): string {
  const declared = entry.reason.trim();
  const why = declared === "" ? "" : ` Motivo declarado: ${declared}`;

  if (hasSuggestion) {
    return (
      `Termo do vocabulário da organização: ela declarou que este termo não é familiar ao leitor ` +
      `dela e registrou "${entry.plain}" como equivalente. A troca é decisão sua — a ferramenta não ` +
      `reescreve.${why}`
    );
  }

  return (
    `Termo do vocabulário da organização: ela declarou que este termo não é familiar ao leitor ` +
    `dela, e NÃO registrou um equivalente simples. Aqui isto é sinalização, não proposta: sem um ` +
    `equivalente atestado, sugerir uma troca seria a ferramenta inventando o que a organização não ` +
    `disse.${why}`
  );
}

export const vocabularioOrganizacaoPass: Pass = {
  criterion: CRITERION,
  category: "lexical",

  run(ctx) {
    const { enabled, terms } = ctx.config.vocabulario;
    if (!enabled || terms.length === 0) return [];

    const byFirst = compileOrgTerms(terms);
    if (byFirst.size === 0) return [];

    const findings: PassFinding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const tokens = sentence.tokens;

      let i = 0;
      while (i < tokens.length) {
        if (!tokens[i].isWord) {
          i += 1;
          continue;
        }

        const match = matchAt(tokens, i, byFirst);
        if (match === null) {
          i += 1;
          continue;
        }

        const endIndex = i + match.words.length - 1;
        const start = tokens[i].start;
        const end = tokens[endIndex].end;
        const plain = match.entry.plain;
        const suggest = plain !== null && plain.trim() !== "";

        findings.push({
          criterion: CRITERION,
          category: "lexical",
          span: { start, end, text: ctx.doc.source.slice(start, end) },
          severity: "warning",
          suggestion: suggest ? plain.trim() : undefined,
          requiresHuman: !suggest,
          justification: justify(match.entry, suggest),
          meta: { term: match.entry.term, declared: true },
        });

        i = endIndex + 1;
      }
    }

    return findings;
  },
};
