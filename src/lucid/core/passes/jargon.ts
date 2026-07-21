/**
 * Pass "jargão / termo administrativo-jurídico pouco familiar" (docs/ARQUITETURA.md §6.4,
 * CLAUDE.md critério 4 do MVP) — `5.3.2` (palavras familiares).
 *
 * AUTORIDADE DE RUNTIME É EXCLUSIVAMENTE O GLOSSÁRIO CURADO (`jargao.pt.json`) — ver
 * ADR-008 em docs/DECISOES.md para o porquê. Nenhuma inferência de raridade por
 * frequência, nenhum stemming, nenhuma flexão automática: cada forma cadastrada é uma
 * entrada explícita, mesmo espírito de `verbos-leves.pt.json`/`nominalizacoes.pt.json`.
 *
 * MATCHER LOCAL POR TOKENS, LONGEST-MATCH-FIRST, SEM PARSER. Entradas são agrupadas por
 * primeira palavra e ordenadas por comprimento decrescente; no primeiro token de uma
 * frase candidata, tenta a entrada mais longa primeiro. Contiguidade estrita (token a
 * token, `isWord && lower === esperado`) é a única regra de "barreira" necessária —
 * qualquer pontuação ou palavra diferente no meio já quebra o match, sem precisar de
 * lista própria de conjunções/pontuação proibida (diferente de `passive-voice.ts`, que
 * lida com uma janela variável). Ao aceitar um match, o cursor pula para o token
 * seguinte ao fim do match — garante zero sobreposição por construção.
 *
 * Detecção e sugestão são decisões separadas (mesmo princípio de `nominalization.ts`).
 * Todo match aceito vira `Finding`; `suggestion` só aparece quando a entrada declara
 * `safeForSuggestion: true` E `config.jargon.suggestFromGlossary` está ligado E nenhuma
 * guarda de contexto suprimiu o match (nesse caso o match inteiro já não vira finding).
 *
 * `config.jargon.frequencyRankCutoff` existe na `Config` mas NÃO é consultado por este
 * pass — frequência lexical é ferramenta de curadoria offline, nunca autoridade de
 * runtime (ADR-008); mesmo padrão de `Config.passiveVoice.treatEstarAsPassive`
 * documentado como no-op deliberado em ADR-006.
 */
import type { Finding, Pass, Token } from "../types";
import jargonData from "../../data/jargao.pt.json";

const CRITERION = "jargon";
const PRINCIPLE = "5.3.2";

type JargonKind = "word" | "phrase";
type JargonDomain = "administrative" | "legal" | "general";
type JargonReason = "polysemous" | "context_dependent" | "institutional" | null;

export interface JargonEntry {
  term: string;
  kind: JargonKind;
  domain: JargonDomain;
  plain: string | null;
  safeForSuggestion: boolean;
  reason: JargonReason;
}

export interface CompiledEntry {
  words: readonly string[];
  entry: JargonEntry;
}

const ENTRIES: readonly JargonEntry[] = jargonData.entries as JargonEntry[];

/**
 * Agrupa as entradas pela primeira palavra e ordena cada lista por comprimento (nº de
 * tokens) DECRESCENTE — a ordem que implementa "longest-match-first" sem reordenar em
 * runtime a cada busca. A ordenação por comprimento é o que torna o resultado
 * INDEPENDENTE da ordem das entradas no JSON de origem: entradas com a mesma primeira
 * palavra e comprimentos diferentes são sempre tentadas da mais longa para a mais curta,
 * qualquer que seja a ordem de entrada; entradas de mesmo comprimento e mesma primeira
 * palavra que diferem em algum token interno nunca casam a MESMA sequência de tokens, então
 * a ordem relativa entre elas não é observável. Exportada como seam de teste (ver
 * `test/determinism.test.ts`, ADR-009) — NÃO reexportada pelo barrel.
 */
export function compileJargonEntries(entries: readonly JargonEntry[]): Map<string, CompiledEntry[]> {
  const map = new Map<string, CompiledEntry[]>();

  for (const entry of entries) {
    const words = entry.term.split(" ");
    const list = map.get(words[0]);
    const compiled: CompiledEntry = { words, entry };
    if (list) {
      list.push(compiled);
    } else {
      map.set(words[0], [compiled]);
    }
  }

  for (const list of map.values()) {
    list.sort((a, b) => b.words.length - a.words.length);
  }

  return map;
}

const BY_FIRST_WORD: ReadonlyMap<string, readonly CompiledEntry[]> = compileJargonEntries(ENTRIES);

const RE_UPPERCASE_START = /^\p{Lu}/u;

/** Pares de aspas reconhecidos: caractere de abertura -> caractere de fechamento esperado. */
const QUOTE_OPENERS = new Set(['"', "“", "«"]);

function matchingCloser(opener: string, candidate: string): boolean {
  if (opener === '"') return candidate === '"';
  if (opener === "“") return candidate === "”";
  if (opener === "«") return candidate === "»";
  return false;
}

/**
 * Encontra, dentro de uma frase, pares de aspas fechados (abre-fecha sem aninhamento).
 * Só reconhece os 3 pares acima; qualquer abertura sem fechamento correspondente na
 * mesma frase não gera par (limitação documentada — ver `src/lucid/data/README.md`).
 * Aspas simples retas (`'`) não são tratadas aqui: colidiriam com o apóstrofo de
 * elisão já absorvido dentro da palavra por `tokenize.ts`.
 */
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
    // qualquer outra pontuação enquanto uma aspa está aberta é ignorada — sem suporte a
    // aninhamento; um abridor sem fechador correspondente na frase não vira par.
  }

  return ranges;
}

function overlapsQuotes(ranges: readonly (readonly [number, number])[], start: number, end: number): boolean {
  return ranges.some(([open, close]) => start <= close && end >= open);
}

/**
 * true se o token, EM MEIO À FRASE (não a primeira palavra), começa com maiúscula —
 * heurística conservadora de "provável nome próprio/institucional": suprime o match por
 * padrão em vez de afirmar que identificou um nome. Só se aplica a unigramas — uma
 * expressão multipalavra cadastrada não é suprimida por maiúscula interna, já que
 * nenhuma entrada atual espera capitalização própria (ver README).
 */
function looksLikeProperNoun(token: Token, tokens: readonly Token[], index: number): boolean {
  if (!RE_UPPERCASE_START.test(token.text)) return false;

  for (let i = 0; i < index; i++) {
    if (tokens[i].isWord) return true; // já existe palavra antes -> não é início de frase
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
