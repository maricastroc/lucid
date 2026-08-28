const collapse = (s: string): string => s.replace(/\s+/gu, " ").trim();

const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";
const W = "[\\p{L}]*";

const NORM_TYPES =
  "Lei\\s+Complementar|Lei\\s+Delegada|Lei\\s+Ordinária|Lei|Decreto-Lei|Decreto\\s+Legislativo|" +
  "Decreto|Medida\\s+Provisória|Emenda\\s+Constitucional|Instrução\\s+Normativa|Portaria|Resolução|" +
  "Ato|Constituição";

const RE_NORM = new RegExp(
  `${B}(${NORM_TYPES})(\\s+(?:Federal|Estadual|Municipal|Distrital))?(?:\\s*n[º°ᵒo]?\\.?)?\\s*(\\d[\\d.]*(?:\\/\\d{2,4})?)`,
  "giu",
);

const RE_ARTICLE = new RegExp(`${B}art(?:igo)?s?\\.?\\s*(\\d+[º°ᵒ]?(?:-[A-Z])?)`, "giu");
const RE_PARAGRAPH_REF = /§+\s*(\d+[º°ᵒ]?)/gu;
const RE_INCISO = new RegExp(`${B}inciso\\s+([IVXLC]+)${E}`, "giu");

export interface NormRef {
  readonly key: string;
  readonly start: number;
  readonly end: number;
}

function normKey(type: string, qualifier: string | undefined, number: string): string {
  const t = collapse(type).toLowerCase();
  const q = qualifier ? collapse(qualifier).toLowerCase() : "";
  const n = number.replace(/\./gu, "");
  return q ? `${t} ${q} ${n}` : `${t} ${n}`;
}

export function normRefs(text: string): NormRef[] {
  const out: NormRef[] = [];
  const re = new RegExp(RE_NORM.source, RE_NORM.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ key: normKey(m[1], m[2], m[3]), start: m.index, end: m.index + m[0].length });
  }
  return out;
}

function simpleRefs(text: string, re: RegExp, prefix: string): string[] {
  const r = new RegExp(re.source, re.flags);
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = r.exec(text)) !== null) out.push(`${prefix}:${m[1].toLowerCase().replace(/[º°ᵒ]/gu, "")}`);
  return out;
}

export function legalRefs(text: string): string[] {
  return [
    ...normRefs(text).map((r) => r.key),
    ...simpleRefs(text, RE_ARTICLE, "art"),
    ...simpleRefs(text, RE_PARAGRAPH_REF, "§"),
    ...simpleRefs(text, RE_INCISO, "inc"),
  ].sort();
}

const rx = (body: string): RegExp => new RegExp(`${B}(?:${body})${E}`, "giu");

const RELATIONS: ReadonlyArray<{ family: string; re: RegExp }> = [
  { family: "alteracao", re: rx("alterad[ao]s?\\s+pel[ao]s?|alterou|alteram?") },
  { family: "regulamentacao", re: rx("regulamentad[ao]s?\\s+(?:por|pel[ao]s?)|regulamenta") },
  { family: "revogacao", re: rx("revogad[ao]s?\\s+pel[ao]s?|revoga(?:m|-se)?") },
  { family: "redacao", re: rx("(?:com\\s+a\\s+)?redação\\s+dada\\s+pel[ao]s?|na\\s+redação\\s+d[ao]s?") },
  { family: "acrescimo", re: rx("(?:acrescid[ao]s?|incluíd[ao]s?|inserid[ao]s?)\\s+pel[ao]s?") },
  {
    family: "fundamento",
    re: rx(
      "nos\\s+termos\\s+d[aeo]s?|na\\s+forma\\s+d[aeo]s?|com\\s+(?:fundamento|base)\\s+n[ao]s?|" +
        "previst[ao]s?\\s+n[ao]s?|de\\s+que\\s+trata|constante\\s+d[ao]s?",
    ),
  },
  { family: "combinacao", re: rx("combinad[ao]s?\\s+com|c\\/c") },
];

const RELATION_WINDOW = 140;

export interface NormRelation {
  readonly key: string;
  readonly family: string;
}

export function normRelations(text: string): NormRelation[] {
  const refs = normRefs(text);
  if (refs.length < 2) return [];
  const out: NormRelation[] = [];
  for (const { family, re } of RELATIONS) {
    const r = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = r.exec(text)) !== null) {
      const at = m.index;
      const end = at + m[0].length;
      const left = [...refs].reverse().find((ref) => ref.end <= at && at - ref.end <= RELATION_WINDOW);
      const right = refs.find((ref) => ref.start >= end && ref.start - end <= RELATION_WINDOW);
      if (left && right && left.key !== right.key) out.push({ key: `${left.key} -[${family}]-> ${right.key}`, family });
    }
  }
  return out;
}

export const MARKER_FAMILIES: ReadonlyArray<{ family: string; re: RegExp }> = [
  {
    family: "obrigacao",
    re: rx(
      `dever[áãeíi]${W}|devem|deve|fica${W}\\s+obrigad${W}|é\\s+obrigatóri${W}|compete\\s+a|caberá|` +
        `ter[áã]o?\\s+de|tem\\s+de|preci[sz]a${W}|obriga${W}`,
    ),
  },
  {
    family: "permissao",
    re: rx(`poder[áã]${W}|podem|pode|é\\s+facultad${W}|faculta-se|fica\\s+autorizad${W}`),
  },
  {
    family: "proibicao",
    re: rx(
      `é\\s+vedad${W}|fica\\s+vedad${W}|veda-se|é\\s+proibid${W}|fica\\s+proibid${W}|` +
        `não\\s+poder[áã]${W}|não\\s+pode|não\\s+se\\s+aplica`,
    ),
  },
  {
    family: "condicao",
    re: rx(`se|caso|desde\\s+que|quando|enquanto|na\\s+hipótese\\s+de|sempre\\s+que|condicionad${W}`),
  },
  {
    family: "excecao",
    re: rx(`salvo|exceto|ressalvad${W}|sem\\s+prejuízo|à\\s+exceção|excluíd${W}|ressalva`),
  },
  { family: "negacao", re: rx(`não|nenhum${W}|nem|jamais`) },
];

export function markerCounts(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const { family, re } of MARKER_FAMILIES) {
    out[family] = (text.match(new RegExp(re.source, re.flags)) ?? []).length;
  }
  return out;
}

export function familiesLost(original: string, proposed: string): string[] {
  const a = markerCounts(original);
  const b = markerCounts(proposed);
  return MARKER_FAMILIES.map((f) => f.family).filter((f) => a[f] > 0 && b[f] === 0);
}

const RE_MONEY = /R\$\s*[\d.]+(?:,\d{2})?/gu;
const RE_PERCENT = /\d+(?:[.,]\d+)?\s*%/gu;
const RE_PERIOD = new RegExp(`${B}\\d+\\s*(?:dias?|meses?|anos?|horas?|semanas?)${E}`, "giu");

const normalizeMoney = (s: string): string => s.replace(/\s+/gu, "").replace(/\.(?=\d{3})/gu, "");

export function values(text: string): string[] {
  return [
    ...(text.match(RE_MONEY) ?? []).map((v) => `R$${normalizeMoney(v).replace(/^R\$/u, "")}`),
    ...(text.match(RE_PERCENT) ?? []).map((v) => v.replace(/\s+/gu, "")),
    ...(text.match(RE_PERIOD) ?? []).map((v) => collapse(v).toLowerCase()),
  ].sort();
}

export function missingFrom(before: readonly string[], after: readonly string[]): string[] {
  const pool = [...after];
  const missing: string[] = [];
  for (const item of before) {
    const at = pool.indexOf(item);
    if (at === -1) missing.push(item);
    else pool.splice(at, 1);
  }
  return missing;
}

export interface FidelityReport {
  readonly legalRefsBefore: number;
  readonly legalRefsLost: readonly string[];
  readonly relationsBefore: number;
  readonly relationsLost: readonly string[];
  readonly valuesBefore: number;
  readonly valuesLost: readonly string[];
  readonly markerFamiliesLost: readonly string[];
}

export function fidelityOf(original: string, proposed: string): FidelityReport {
  const refsBefore = legalRefs(original);
  const relBefore = normRelations(original).map((r) => r.key).sort();
  const valBefore = values(original);
  return {
    legalRefsBefore: refsBefore.length,
    legalRefsLost: missingFrom(refsBefore, legalRefs(proposed)),
    relationsBefore: relBefore.length,
    relationsLost: missingFrom(relBefore, normRelations(proposed).map((r) => r.key).sort()),
    valuesBefore: valBefore.length,
    valuesLost: missingFrom(valBefore, values(proposed)),
    markerFamiliesLost: familiesLost(original, proposed),
  };
}

const RE_MARKUP = /[*_#`[\]]|^\s*>/mu;

export interface StyleReport {
  readonly wordsBefore: number;
  readonly wordsAfter: number;
  readonly growth: number;
  readonly inflated: boolean;
  readonly paragraphsBefore: number;
  readonly paragraphsAfter: number;
  readonly paragraphsLost: boolean;
  readonly sentencesOver20Before: number;
  readonly sentencesOver20After: number;
  readonly shortSentencesAdded: number;
  readonly parentheticalsAdded: number;
  readonly markupLeaked: boolean;
  readonly producedList: boolean;
}

const INFLATION_LIMIT = 0.4;
const LONG_SENTENCE_WORDS = 20;
const SHORT_SENTENCE_WORDS = 15;

function sentenceWordCounts(text: string, segment: (t: string) => number[]): number[] {
  return segment(text);
}

export function styleOf(
  original: string,
  proposed: string,
  segment: (text: string) => number[],
): StyleReport {
  const wordsOf = (t: string): number => (t.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
  const paragraphsOf = (t: string): number => t.split(/\n{2,}/u).filter((p) => p.trim() !== "").length;
  const openParens = (t: string): number => (t.match(/\(/gu) ?? []).length;

  const before = sentenceWordCounts(original, segment);
  const after = sentenceWordCounts(proposed, segment);
  const wordsBefore = wordsOf(original);
  const wordsAfter = wordsOf(proposed);
  const listLines = proposed.split("\n").filter((line) => /^\s*-\s+\S/u.test(line)).length;

  const withoutListMarkers = proposed
    .split("\n")
    .map((line) => line.replace(/^\s*-\s+/u, ""))
    .join("\n");

  return {
    wordsBefore,
    wordsAfter,
    growth: wordsBefore === 0 ? 0 : wordsAfter / wordsBefore - 1,
    inflated: wordsBefore > 0 && wordsAfter / wordsBefore - 1 > INFLATION_LIMIT,
    paragraphsBefore: paragraphsOf(original),
    paragraphsAfter: paragraphsOf(proposed),
    paragraphsLost: paragraphsOf(proposed) < paragraphsOf(original),
    sentencesOver20Before: before.filter((n) => n > LONG_SENTENCE_WORDS).length,
    sentencesOver20After: after.filter((n) => n > LONG_SENTENCE_WORDS).length,
    shortSentencesAdded: Math.max(
      0,
      after.filter((n) => n < SHORT_SENTENCE_WORDS).length - before.filter((n) => n < SHORT_SENTENCE_WORDS).length,
    ),
    parentheticalsAdded: Math.max(0, openParens(proposed) - openParens(original)),
    markupLeaked: RE_MARKUP.test(withoutListMarkers),
    producedList: listLines > 0,
  };
}
