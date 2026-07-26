import type { PassFinding, Pass } from "@/lucid/core/types";

const CRITERION = "passiva_sintetica";

const RE_ENCLITIC_SE = /^\p{L}{2,}-se$/u;

const PROCLISIS_ATTRACTORS: ReadonlySet<string> = new Set([
  "não", "nunca", "jamais", "ninguém", "nada", "tampouco",
  "que", "quem", "onde", "aonde", "quando", "quanto", "quantos", "quantas",
  "qual", "quais", "cujo", "cuja", "cujos", "cujas", "conforme", "porque", "embora", "enquanto",
  "tudo", "todos", "todas", "ambos", "alguém", "algo",
  "sempre", "talvez", "também", "já", "aqui", "ali", "assim", "hoje", "agora", "raramente",
]);

export const passivaSinteticaPass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  dataDeps: ["verbos-pronominais.pt", "stopwords.pt"],

  run(ctx) {
    if (!ctx.config.passivaSintetica.enabled) return [];

    const pronominais = ctx.data.get<ReadonlySet<string>>("verbos-pronominais.pt");
    const stopwords = ctx.data.get<ReadonlySet<string>>("stopwords.pt");
    const findings: PassFinding[] = [];

    for (const token of ctx.doc.tokens) {
      if (!token.isWord) continue;
      if (!RE_ENCLITIC_SE.test(token.lower)) continue;
      if (pronominais.has(token.lower)) continue;

      findings.push(finding({ start: token.start, end: token.end, text: token.text }, token.text, {
        position: "enclitic",
        form: token.lower,
      }));
    }

    // Proclitic arm: <attractor> "se" <verb>, inside one sentence, with nothing between.
    for (const sentence of ctx.doc.sentences) {
      const tokens = sentence.tokens;
      for (let i = 0; i + 2 < tokens.length; i++) {
        const attractor = tokens[i];
        const se = tokens[i + 1];
        const verb = tokens[i + 2];

        if (!attractor.isWord || !PROCLISIS_ATTRACTORS.has(attractor.lower)) continue;
        // Adjacency is structural: punctuation is a token, so it would take one of these slots.
        if (!se.isWord || se.lower !== "se") continue;
        if (!verb.isWord) continue;
        // A function word after the clitic means it is not attached to a verb here.
        if (stopwords.has(verb.lower)) continue;
        // Same suppression as the enclitic arm, read through the lexicon's enclitic key.
        if (pronominais.has(`${verb.lower}-se`)) continue;

        const text = ctx.doc.source.slice(se.start, verb.end);
        findings.push(finding({ start: se.start, end: verb.end, text }, text, {
          position: "proclitic",
          form: `${se.lower} ${verb.lower}`,
          attractor: attractor.lower,
        }));
      }
    }

    return findings;
  },
};

function finding(
  span: { start: number; end: number; text: string },
  quoted: string,
  meta: Record<string, string | number | boolean>,
): PassFinding {
  return {
    criterion: CRITERION,
    category: "syntactic",
    span,
    severity: "warning",
    requiresHuman: true,
    justification:
      `“${quoted}” usa o “se” que costuma esconder quem pratica a ação (passiva sintética ou ` +
      "indeterminação do sujeito: “aplica-se a multa” não diz quem aplica). Pode também ser reflexivo — a " +
      "ferramenta NÃO desfaz essa ambiguidade nem reescreve: aponta e devolve a decisão a você.",
    meta,
  };
}
