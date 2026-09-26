export interface Mention {
  readonly key: string;
  readonly text: string;
}

const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";
const ORD = "[º°ᵒ]?";
const SEP = "(?:\\s*,\\s*|\\s+e\\s+|\\s+a\\s+|\\s+ou\\s+)";
const LIST_FOLLOW =
  "(?=\\s*(?:[,;.:)]|$)|\\s+(?:e|ou|a|de|do|da|dos|das|deste|desta|neste|nesta|no|na|nos|nas)(?![\\p{L}\\p{N}]))";
const listOf = (item: string): string => `${item}(?:${SEP}${item}${LIST_FOLLOW})*`;

const squash = (text: string): string => text.replace(/\s+/gu, " ").trim();
const plainNumber = (text: string): string => text.replace(/[.º°ᵒ]/gu, "").toLowerCase();

const NORM_TYPES =
  "Lei\\s+Complementar|Lei\\s+Delegada|Lei|Decreto-Lei|Decreto\\s+Legislativo|Decreto|Medida\\s+Provisória|" +
  "Emenda\\s+Constitucional|Instrução\\s+Normativa|Portaria|Resolução";

const RE_NORM = new RegExp(
  `${B}(${NORM_TYPES})(?:\\s+(?:Federal|Estadual|Municipal|Distrital))?(?:\\s*n[º°ᵒo]?\\.?)?\\s*(\\d[\\d.]*)(?:\\s*\\/\\s*\\d{2,4})?${E}`,
  "giu",
);

const ORDINAL_WORDS: Readonly<Record<string, string>> = {
  primeiro: "1",
  segundo: "2",
  terceiro: "3",
  quarto: "4",
  quinto: "5",
  sexto: "6",
  sétimo: "7",
  oitavo: "8",
  nono: "9",
  décimo: "10",
};
const ORDINAL = Object.keys(ORDINAL_WORDS).join("|");
const ARTICLE_NUMBER = `\\d+${ORD}(?:-[A-Z])?`;
const ITEM = `(?:${ARTICLE_NUMBER}|(?:${ORDINAL})${E})`;
const RE_ARTICLES = new RegExp(`${B}(?:art(?:igo)?s?\\.?)\\s*(${listOf(ITEM)})`, "giu");
const PARAGRAPH_ITEM = `(?:(?:§\\s*)?\\d+${ORD}|(?:${ORDINAL})${E})`;
const RE_PARAGRAPHS = new RegExp(`(?:§§?\\s*|${B}parágrafos?\\s+)(${listOf(PARAGRAPH_ITEM)})`, "giu");

const numberOf = (item: string): string => ORDINAL_WORDS[item.toLowerCase()] ?? plainNumber(item);
const ordinalText = (item: string): string => {
  const n = numberOf(item);
  return /^\d+$/u.test(n) && Number(n) < 10 ? `${n}º` : n;
};
const RE_SOLE_PARAGRAPH = new RegExp(`${B}parágrafo\\s+único${E}`, "giu");
const ROMAN = "[IVXLC]+";
const RE_INCISOS = new RegExp(`${B}[Ii]ncisos?\\s+(${listOf(`${ROMAN}${E}`)})`, "gu");
const LETTER = '["“]?[a-z]["”]?';
const RE_ALINEAS = new RegExp(`${B}[Aa]l[íi]neas?\\s+(${listOf(`${LETTER}${E}`)})`, "gu");
const RE_CAPUT = new RegExp(`${B}caput${E}`, "giu");

const RE_SEP = new RegExp(SEP, "iu");

function listed(list: string): string[] {
  return list
    .split(RE_SEP)
    .map((item) => item.replace(/[§"“”\s]/gu, ""))
    .filter((item) => item !== "");
}

export function legalReferences(text: string): Mention[] {
  const out: Mention[] = [];
  for (const m of text.matchAll(RE_NORM)) {
    out.push({ key: `${squash(m[1]).toLowerCase()} ${plainNumber(m[2])}`, text: squash(m[0]) });
  }
  for (const m of text.matchAll(RE_ARTICLES)) {
    for (const n of listed(m[1])) {
      out.push({ key: `art ${numberOf(n)}`, text: `art. ${ordinalText(n)}` });
    }
  }
  for (const m of text.matchAll(RE_PARAGRAPHS)) {
    for (const n of listed(m[1])) {
      out.push({ key: `§ ${numberOf(n)}`, text: `§ ${ordinalText(n)}` });
    }
  }
  for (const m of text.matchAll(RE_SOLE_PARAGRAPH)) out.push({ key: "parágrafo único", text: squash(m[0]) });
  for (const m of text.matchAll(RE_INCISOS)) {
    for (const n of listed(m[1])) out.push({ key: `inciso ${n}`, text: `inciso ${n}` });
  }
  for (const m of text.matchAll(RE_ALINEAS)) {
    for (const n of listed(m[1])) out.push({ key: `alínea ${n}`, text: `alínea ${n}` });
  }
  for (const m of text.matchAll(RE_CAPUT)) out.push({ key: "caput", text: m[0] });
  return out;
}

const RE_LABEL = new RegExp(
  `^\\s*([Aa]rt(?:igo)?\\.?\\s*\\d+${ORD}(?:-[A-Z])?|(?:§|[Pp]arágrafo)\\s*\\d+${ORD}|[Pp]arágrafo\\s+único|` +
    `${ROMAN}\\s*[-–]|[a-z]\\))`,
  "u",
);

export function deviceLabel(text: string): Mention | null {
  const m = RE_LABEL.exec(text);
  if (m === null) return null;
  const key = m[1]
    .toLowerCase()
    .replace(/^artigo/u, "art")
    .replace(/^parágrafo(?=\s*\d)/u, "§")
    .replace(/[º°ᵒ.\s]/gu, "")
    .replace(/–/gu, "-");
  return { key, text: squash(m[1]) };
}

const UNITS = "dias?|meses|mês|anos?|horas?|semanas?|minutos?";
const RE_MONEY = /R\$\s*(\d[\d.]*(?:,\d+)?)/gu;
const RE_PERCENT = /(\d+(?:[.,]\d+)?)\s*(%|por\s+cento)/gu;
const RE_PERIOD = new RegExp(`${B}(\\d+)\\s*(?:\\([^)]{1,40}\\)\\s*)?(${UNITS})${E}`, "giu");

const unitKey = (unit: string): string => {
  const u = unit.toLowerCase();
  if (u.startsWith("dia")) return "dia";
  if (u === "mês" || u === "meses") return "mês";
  if (u.startsWith("ano")) return "ano";
  if (u.startsWith("hora")) return "hora";
  if (u.startsWith("semana")) return "semana";
  return "minuto";
};

export function valuesWithUnit(text: string): Mention[] {
  const out: Mention[] = [];
  for (const m of text.matchAll(RE_MONEY)) {
    out.push({ key: `R$ ${m[1].replace(/\./gu, "").replace(/,0+$/u, "")}`, text: squash(m[0]) });
  }
  for (const m of text.matchAll(RE_PERCENT)) out.push({ key: `${m[1].replace(",", ".")} %`, text: squash(m[0]) });
  for (const m of text.matchAll(RE_PERIOD)) out.push({ key: `${m[1]} ${unitKey(m[2])}`, text: squash(m[0]) });
  return out;
}

const MONTHS = "janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro";
const RE_WRITTEN_DATE = new RegExp(`${B}(\\d{1,2})${ORD}\\s+de\\s+(${MONTHS})\\s+de\\s+(\\d{4})${E}`, "giu");

export function writtenDates(text: string): Mention[] {
  return [...text.matchAll(RE_WRITTEN_DATE)].map((m) => ({
    key: `${Number(m[1])} de ${m[2].toLowerCase()} de ${m[3]}`,
    text: squash(m[0]),
  }));
}
