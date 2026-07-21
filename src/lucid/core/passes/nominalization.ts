/**
 * Pass "nominalização por construção com verbo leve" (docs/ARQUITETURA.md §6, critério 3
 * · CLAUDE.md, critério 3 do MVP) — âncora em `5.3.3` (frases claras); o critério
 * também se relaciona a `5.3.4` (frases concisas — "fazer a análise de" é mais longo
 * que "analisar"), mas `Finding.principle` é um campo único, então `5.3.3` é o
 * princípio reportado (ver docs/DECISOES.md, ADR-007).
 *
 * MATCHER LOCAL POR TOKENS, ADJACÊNCIA ESTRITA, SEM PARSER (ADR-007). Duas evidências
 * locais obrigatórias: uma forma cadastrada de verbo leve (`verbos-leves.pt.json`) e
 * uma nominalização cadastrada (`nominalizacoes.pt.json`) — nunca "qualquer palavra
 * terminada em -ção/-mento". As duas precisam estar a exatamente 3 tokens de distância
 * uma da outra: `[verbo leve][determinante][nominalização]`, sem nada entre elas — essa
 * única regra de adjacência já elimina adjetivo, possessivo, coordenação, oração
 * encaixada e pontuação intermediária entre determinante e nominalização, sem precisar
 * de uma checagem por categoria proibida.
 *
 * Detecção e sugestão são decisões separadas. Todo núcleo casado vira `Finding`; a
 * `suggestion` só é preenchida quando TODAS as condições de segurança valem (ver
 * `buildSuggestion`) — nunca se reconjuga o verbo-base, nunca se assume complemento
 * seguro na dúvida.
 */
import type { Finding, Pass, Token } from "../types";
import type { LightVerbForm, NominalizationEntry } from "../data/types";
import { getPrepared } from "../data/registry";

const CRITERION = "nominalization";
const PRINCIPLE = "5.3.3";

// Dados vêm do registry (fonte única + fingerprint no dataHash). Preparados uma vez lá.
const LIGHT_VERB_FORMS: ReadonlyMap<string, LightVerbForm> = getPrepared("verbos-leves.pt");
const NOMINALIZATIONS: ReadonlyMap<string, NominalizationEntry> = getPrepared("nominalizacoes.pt").entries;

/**
 * Tabela FECHADA verbo-base → traço morfológico → forma finita (ADR-011). Não é um
 * conjugador: é dado curado, cada forma verificada à mão, só os 8 traços indicativos
 * comuns. `undefined` para qualquer par não cadastrado — nunca gera palpite.
 */
const CONJUGATIONS = getPrepared("nominalizacoes.pt").conjugations;

/** Forma verbal a usar na sugestão: infinitivo direto, ou a conjugação do traço; senão nada. */
function conjugatedVerb(nominalization: NominalizationEntry, verbForm: LightVerbForm): string | undefined {
  if (verbForm.infinitive) return nominalization.verb;
  return CONJUGATIONS[nominalization.verb]?.[verbForm.feature];
}

const DIRECT_DETERMINERS = new Set(["o", "a", "os", "as", "um", "uma"]);
const A_CONTRACTIONS = new Set(["à", "ao", "às", "aos"]);

/** Pontuação que fecha a frase — sinal de "nada mais segue", nunca "pule e continue". */
const SENTENCE_FINAL_PUNCTUATION = new Set([".", "!", "?", "…"]);

const SOURCE_DE_FORMS = new Set(["de", "do", "da", "dos", "das"]);

/** Expansão determinística da contração — só os 4 pares cadastrados, nada genérico. */
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

/**
 * Decide se uma sugestão mecânica é segura e, se for, o texto exato e até qual índice
 * de token o span deve se estender. Retorna `null` sempre que qualquer condição de
 * segurança falhar — nunca um palpite. As 6 condições (ver plano/ADR-007, revisto por
 * ADR-011):
 *   1. há forma verbal segura: infinitivo (verbo-base direto) OU forma finita com
 *      conjugação cadastrada na tabela fechada para o traço do verbo leve;
 *   2. mapeamento marcado `safeForSuggestion`;
 *   3. adjacência estrita (já garantida pelo chamador antes de invocar esta função);
 *   4. complemento em formato reconhecido (ausente, ou "de"-forma + 1 palavra, seguido
 *      de fim de frase/pontuação final — qualquer outra coisa é inseguro);
 *   5. `targetPreposition === null` (única transformação implementada);
 *   6. `config.nominalization.suggest` (checado pelo chamador, kill-switch global).
 */
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

  // complemento ausente: fim da frase, ou pontuação final logo em seguida.
  if (!afterNominalization || (!afterNominalization.isWord && SENTENCE_FINAL_PUNCTUATION.has(afterNominalization.text))) {
    return { text: verbText, spanEndIndex: nominalizationIndex };
  }

  // complemento com preposição "de"-forma: exige exatamente 1 palavra depois, e então
  // fim de frase ou pontuação final — qualquer coisa a mais é inseguro.
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

  // qualquer outro token (vírgula, conjunção, complemento maior, material não
  // reconhecido) — inseguro por design. Na dúvida, mantém o finding, remove a sugestão.
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
