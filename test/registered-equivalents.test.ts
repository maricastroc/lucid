import { describe, expect, it } from "vitest";
import { analyzeWithLocale, type Finding } from "@/lucid";
import { localeEnUS } from "@/locales/en-US";
import { analyze } from "@/locales/pt-BR";
import type { JargonEntry, PhraseEntry } from "@/locales/pt-BR/datasets/types";
import jargaoData from "@/locales/pt-BR/datasets/jargao.pt.json";
import perifrasesData from "@/locales/pt-BR/datasets/perifrases.pt.json";
import redundanciasData from "@/locales/pt-BR/datasets/redundancias.pt.json";
import duplasNegacoesData from "@/locales/pt-BR/datasets/duplas-negacoes.pt.json";
import adverbiosVagosData from "@/locales/pt-BR/datasets/adverbios-vagos.pt.json";
import { matchLeadingCase } from "@/app/lib/text-edit";
import { isSafe } from "@/app/lib/criteria";

const JARGON = (jargaoData as { entries: JargonEntry[] }).entries;
const PHRASE_LEXICONS: Record<string, readonly PhraseEntry[]> = {
  perifrase_inflada: (perifrasesData as { entries: PhraseEntry[] }).entries,
  redundancia: (redundanciasData as { entries: PhraseEntry[] }).entries,
  dupla_negacao: (duplasNegacoesData as { entries: PhraseEntry[] }).entries,
};
const VAGUE = (adverbiosVagosData as { forms: string[] }).forms;

interface RecordedForm {
  readonly lexicon: string;
  readonly term: string;
  readonly form: string;
}

const RECORDED: readonly RecordedForm[] = [
  ...JARGON.filter((e) => e.plain !== null).map((e) => ({ lexicon: "jargon", term: e.term, form: e.plain! })),
  ...Object.entries(PHRASE_LEXICONS).flatMap(([lexicon, entries]) =>
    entries.filter((e) => e.plain !== null).map((e) => ({ lexicon, term: e.phrase, form: e.plain! })),
  ),
];

const TRIGGERS = new Map<string, string>([
  ...JARGON.map((e) => [e.term.toLowerCase(), "jargon"] as const),
  ...Object.entries(PHRASE_LEXICONS).flatMap(([lexicon, entries]) =>
    entries.map((e) => [e.phrase.toLowerCase(), lexicon] as const),
  ),
  ...VAGUE.map((form) => [form.toLowerCase(), "adverbios_vagos"] as const),
]);

const CARRIERS: readonly ((form: string) => string)[] = [
  (form) => `O servidor analisou o pedido ${form} a regra vigente.`,
  (form) => `A secretaria informa que ${form} o prazo foi mantido.`,
  (form) => `${form[0].toUpperCase()}${form.slice(1)}, a comissão decidiu o recurso.`,
];

function findingsOver(text: string, form: string): string[] {
  const start = text.toLowerCase().indexOf(form.toLowerCase());
  const end = start + form.length;
  return analyze(text)
    .findings.filter((f) => f.criterion !== "long_sentence" && f.span.start < end && f.span.end > start)
    .map((f) => `${f.criterion} «${f.span.text}»`);
}

describe("what the Lucid needs before it can present a form as an equivalent", () => {
  it("a withheld glossary entry carries its reason, no form and no suggestion flag", () => {
    for (const entry of JARGON) {
      if (entry.reason === "divergent_sense") {
        expect(entry.plain, entry.term).toBeNull();
        expect(entry.safeForSuggestion, entry.term).toBe(false);
        expect(entry.withheldBecause?.trim(), entry.term).toBeTruthy();
      } else {
        expect(entry.withheldBecause, entry.term).toBeUndefined();
      }
      if (entry.safeForSuggestion) {
        expect(entry.plain, entry.term).not.toBeNull();
        expect(entry.reason, entry.term).toBeNull();
      }
    }
  });

  it("a phrase entry either records a form or says why it withholds one, never both", () => {
    for (const [lexicon, entries] of Object.entries(PHRASE_LEXICONS)) {
      for (const entry of entries) {
        if (entry.withheldBecause !== undefined) {
          expect(entry.plain, `${lexicon}: ${entry.phrase}`).toBeNull();
          expect(entry.withheldBecause.trim(), `${lexicon}: ${entry.phrase}`).toBeTruthy();
        }
      }
    }
  });

  it("no recorded form is itself a trigger in any lexicon", () => {
    const clashes = RECORDED.filter((r) => TRIGGERS.has(r.form.toLowerCase())).map(
      (r) => `${r.lexicon}: «${r.term}» → «${r.form}» is a ${TRIGGERS.get(r.form.toLowerCase())} trigger`,
    );
    expect(clashes).toEqual([]);
  });

  it("no recorded form fires a criterion where it would stand", () => {
    const clashes: string[] = [];
    for (const recorded of RECORDED) {
      for (const carrier of CARRIERS) {
        const hits = findingsOver(carrier(recorded.form), recorded.form);
        if (hits.length > 0)
          clashes.push(`${recorded.lexicon}: «${recorded.term}» → «${recorded.form}»: ${hits.join(", ")}`);
      }
    }
    expect(clashes).toEqual([]);
  });
});

describe("the case that removed the one-click swap", () => {
  it("“em sede de” gets no equivalent, so nothing the Lucid shows can turn it into a perífrase", () => {
    const [jargon] = analyze("O pedido foi analisado em sede de procedimento administrativo.").findings.filter(
      (f) => f.criterion === "jargon",
    );
    expect(jargon.suggestion).toBeUndefined();
    expect(jargon.requiresHuman).toBe(true);
    expect(jargon.justification).not.toContain("no âmbito de");
  });

  it("a withheld phrase explains itself instead of quoting a form", () => {
    const [negation] = analyze("Não é incomum que o prazo seja prorrogado.").findings.filter(
      (f) => f.criterion === "dupla_negacao",
    );
    const entry = PHRASE_LEXICONS.dupla_negacao.find((e) => e.phrase === "não é incomum")!;
    expect(negation.justification).toContain(entry.withheldBecause!);
    expect(negation.justification).not.toContain("“é comum”");
  });
});

describe("en-US attested pairs keep the same bar", () => {
  const applied = (text: string, findings: readonly Finding[]) => {
    const target = findings.find((f) => f.criterion === "hidden_verb" && isSafe(f))!;
    const replacement = matchLeadingCase(target.span.text, target.suggestion!);
    return {
      next: text.slice(0, target.span.start) + replacement + text.slice(target.span.end),
      start: target.span.start,
      end: target.span.start + replacement.length,
    };
  };

  it.each([
    "Applicants must make an application for the permit today.",
    "Applicants must make the payment of the fee today.",
    "Staff must carry out a review of the file today.",
    "Readers must gain an understanding of the rules today.",
    "Offices must undertake a calculation of the benefit today.",
  ])("the attested verb fires no new criterion in '%s'", (text) => {
    const before = analyzeWithLocale(text, localeEnUS).findings;
    const { next, start, end } = applied(text, before);
    const created = analyzeWithLocale(next, localeEnUS).findings.filter(
      (f) =>
        f.span.start < end &&
        f.span.end > start &&
        !before.some((b) => b.criterion === f.criterion && b.span.text === f.span.text),
    );
    expect(created).toEqual([]);
  });
});
