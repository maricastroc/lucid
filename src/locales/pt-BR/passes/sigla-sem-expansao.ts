import type { PassFinding, Pass, Token } from "@/lucid/core/types";

const CRITERION = "sigla_sem_expansao";

const RE_ACRONYM = /^\p{Lu}{2,6}$/u;

const RE_COMPOUND_ACRONYM = /^\p{Lu}{2,6}(?:-\p{Lu}{2,6}){1,2}$/u;

const RE_ROMAN = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

function isRomanNumeral(text: string): boolean {
  return text.length > 0 && RE_ROMAN.test(text);
}

function isAcronymShape(token: Token): boolean {
  if (!token.isWord) return false;
  if (RE_COMPOUND_ACRONYM.test(token.text)) return true;
  return RE_ACRONYM.test(token.text) && !isRomanNumeral(token.text);
}

const segmentsOf = (acronym: string): readonly string[] => acronym.split("-");

function lowercaseFormsIn(tokens: readonly Token[]): ReadonlySet<string> {
  const forms = new Set<string>();
  for (const token of tokens) {
    if (token.isWord && token.text === token.lower) forms.add(token.lower);
  }
  return forms;
}

function isAllCapsWord(token: Token | undefined): boolean {
  if (!token || !token.isWord || token.text.length < 2) return false;
  return token.text === token.text.toUpperCase() && token.text !== token.text.toLowerCase();
}

const RE_STARTS_WITH_DIGIT = /^\p{Nd}/u;

function isDigitRun(token: Token | undefined): boolean {
  return token !== undefined && !token.isWord && RE_STARTS_WITH_DIGIT.test(token.text);
}

function isWeldedToDigits(tokens: readonly Token[], index: number): boolean {
  const tok = tokens[index];

  const after = tokens[index + 1];
  if (after?.start === tok.end) {
    if (isDigitRun(after)) return true;
    const afterHyphen = tokens[index + 2];
    if (after.text === "-" && afterHyphen?.start === after.end && isDigitRun(afterHyphen)) return true;
  }

  const before = tokens[index - 1];
  if (before?.end === tok.start) {
    if (isDigitRun(before)) return true;
    const beforeHyphen = tokens[index - 2];
    if (before.text === "-" && beforeHyphen?.end === before.start && isDigitRun(beforeHyphen)) return true;
  }

  return false;
}

export const siglaSemExpansaoPass: Pass = {
  criterion: CRITERION,
  category: "lexical",
  dataDeps: ["siglas-conhecidas.pt"],

  run(ctx) {
    if (!ctx.config.siglaSemExpansao.enabled) return [];

    const known = ctx.data.get<ReadonlySet<string>>("siglas-conhecidas.pt");
    const tokens = ctx.doc.tokens;
    const writtenInLowercase = lowercaseFormsIn(tokens);
    const defined = new Set<string>();
    const flagged = new Set<string>();
    const findings: PassFinding[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (!isAcronymShape(tok)) continue;
      const key = tok.text;
      if (known.has(key)) continue;
      if (writtenInLowercase.has(tok.lower)) continue;

      const prev = tokens[i - 1];
      const next = tokens[i + 1];

      const definedHere = (prev?.text === "(" && next?.text === ")") || next?.text === "(";
      if (definedHere) {
        defined.add(key);
        continue;
      }

      if (isAllCapsWord(prev) || isAllCapsWord(next)) continue;
      if (isWeldedToDigits(tokens, i)) continue;

      if (segmentsOf(key).every((part) => defined.has(part) || known.has(part))) continue;
      if (defined.has(key) || flagged.has(key)) continue;
      flagged.add(key);

      findings.push({
        criterion: CRITERION,
        category: "lexical",
        span: { start: tok.start, end: tok.end, text: tok.text },
        severity: "warning",
        requiresHuman: true,
        justification:
          `A sigla “${key}” aparece sem ter sido apresentada por extenso antes. Na primeira vez, escreva o ` +
          "nome completo seguido da sigla entre parênteses — “Nome Por Extenso (SIGLA)” — para o leitor que " +
          "não a conhece. A ferramenta aponta a primeira ocorrência não definida; a redação é sua.",
        meta: { acronym: key },
      });
    }

    return findings;
  },
};
