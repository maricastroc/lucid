import type { Finding, Pass, Token } from "@/lucid/core/types";
import type { LightVerbForm, NominalizationEntry } from "../datasets/types";
import { getPrepared } from "../datasets/registry";

const CRITERION = "nominalization";
const PRINCIPLE = "5.3.3";

const LIGHT_VERB_FORMS: ReadonlyMap<string, LightVerbForm> = getPrepared("verbos-leves.pt");
const NOMINALIZATIONS: ReadonlyMap<string, NominalizationEntry> = getPrepared("nominalizacoes.pt").entries;

const CONJUGATIONS = getPrepared("nominalizacoes.pt").conjugations;

function conjugatedVerb(nominalization: NominalizationEntry, verbForm: LightVerbForm): string | undefined {
  if (verbForm.infinitive) return nominalization.verb;
  return CONJUGATIONS[nominalization.verb]?.[verbForm.feature];
}

const DIRECT_DETERMINERS = new Set(["o", "a", "os", "as", "um", "uma"]);
const A_CONTRACTIONS = new Set(["à", "ao", "às", "aos"]);

const SENTENCE_FINAL_PUNCTUATION = new Set([".", "!", "?", "…"]);

const SOURCE_DE_FORMS = new Set(["de", "do", "da", "dos", "das"]);

const CONTRACTION_EXPANSION: ReadonlyMap<string, string> = new Map([
  ["do", "o"],
  ["da", "a"],
  ["dos", "os"],
  ["das", "as"],
]);

function connectorSetFor(pattern: "direct" | "a"): ReadonlySet<string> {
  return pattern === "direct" ? DIRECT_DETERMINERS : A_CONTRACTIONS;
}

interface SuggestionResult {
  text: string;
  spanEndIndex: number;
}

function buildSuggestion(
  tokens: readonly Token[],
  nominalizationIndex: number,
  verbForm: LightVerbForm,
  nominalization: NominalizationEntry,
): SuggestionResult | null {
  const verbText = conjugatedVerb(nominalization, verbForm);
  if (!verbText) return null;
  if (!nominalization.safeForSuggestion) return null;
  if (nominalization.targetPreposition !== null) return null;

  const afterNominalization = tokens[nominalizationIndex + 1];

  if (!afterNominalization || (!afterNominalization.isWord && SENTENCE_FINAL_PUNCTUATION.has(afterNominalization.text))) {
    return { text: verbText, spanEndIndex: nominalizationIndex };
  }

  if (afterNominalization.isWord && SOURCE_DE_FORMS.has(afterNominalization.lower)) {
    const complementWord = tokens[nominalizationIndex + 2];
    const afterComplement = tokens[nominalizationIndex + 3];
    const complementIsClean =
      complementWord?.isWord &&
      (!afterComplement || (!afterComplement.isWord && SENTENCE_FINAL_PUNCTUATION.has(afterComplement.text)));

    if (!complementIsClean) return null;

    const expandedArticle = CONTRACTION_EXPANSION.get(afterNominalization.lower);
    const complementText = expandedArticle ? `${expandedArticle} ${complementWord.text}` : complementWord.text;

    return {
      text: `${verbText} ${complementText}`,
      spanEndIndex: nominalizationIndex + 2,
    };
  }

  return null;
}

function buildJustification(hasSuggestion: boolean, baseVerb: string, reason: "finite" | "unsafeMapping" | "unsafeComplement" | null): string {
  if (hasSuggestion) {
    return (
      `Nominalização com verbo-suporte — o verbo "${baseVerb}" poderia substituir a ` +
      "construção diretamente, deixando a frase mais direta. A ferramenta não " +
      "reescreve automaticamente; veja a sugestão."
    );
  }

  const motivo =
    reason === "finite"
      ? "esta forma verbal não está na tabela fechada de conjugações seguras (só presente, pretérito, futuro e imperfeito do indicativo, na 3ª pessoa, são cobertos)"
      : reason === "unsafeMapping"
        ? "o mapeamento desta palavra para um único verbo não é seguro o bastante"
        : "o complemento da frase não está em um formato reconhecido com segurança";

  return (
    `Nominalização com verbo-suporte — o verbo "${baseVerb}" poderia substituir a ` +
    `construção diretamente, mas a ferramenta não gera uma sugestão automática porque ${motivo}.`
  );
}

export const nominalizationPass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  principle: PRINCIPLE,
  dataDeps: ["verbos-leves.pt", "nominalizacoes.pt"],

  run(ctx) {
    if (!ctx.config.nominalization.enabled) return [];

    const findings: Finding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const tokens = sentence.tokens;

      for (let i = 0; i < tokens.length; i++) {
        const verbToken = tokens[i];
        if (!verbToken.isWord) continue;

        const verbForm = LIGHT_VERB_FORMS.get(verbToken.lower);
        if (!verbForm) continue;

        const connectorToken = tokens[i + 1];
        if (!connectorToken?.isWord) continue;
        if (!connectorSetFor(verbForm.pattern).has(connectorToken.lower)) continue;

        const nominalizationToken = tokens[i + 2];
        if (!nominalizationToken?.isWord) continue;
        const nominalization = NOMINALIZATIONS.get(nominalizationToken.lower);
        if (!nominalization) continue;

        const suggestionAllowed = ctx.config.nominalization.suggest;
        const suggestionResult = suggestionAllowed ? buildSuggestion(tokens, i + 2, verbForm, nominalization) : null;

        const hasVerbText = conjugatedVerb(nominalization, verbForm) !== undefined;
        const reason: "finite" | "unsafeMapping" | "unsafeComplement" | null = suggestionResult
          ? null
          : !hasVerbText
            ? "finite"
            : !nominalization.safeForSuggestion
              ? "unsafeMapping"
              : "unsafeComplement";

        const spanEndIndex = suggestionResult ? suggestionResult.spanEndIndex : i + 2;
        const start = verbToken.start;
        const end = tokens[spanEndIndex].end;

        findings.push({
          criterion: CRITERION,
          category: "syntactic",
          principle: PRINCIPLE,
          span: { start, end, text: ctx.doc.source.slice(start, end) },
          severity: "warning",
          suggestion: suggestionResult?.text,
          requiresHuman: !suggestionResult,
          justification: buildJustification(!!suggestionResult, nominalization.verb, reason),
          meta: {
            lightVerb: verbForm.lemma,
            nominalization: nominalizationToken.lower,
            baseVerb: nominalization.verb,
            hasSuggestion: !!suggestionResult,
          },
        });
      }
    }

    return findings;
  },
};
