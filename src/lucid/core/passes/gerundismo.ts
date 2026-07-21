/**
 * Pass "gerundismo" — `5.3.4` (frases concisas).
 *
 * "vou estar enviando", "vai estar fazendo": a perífrase [ir + estar + gerúndio] alonga sem
 * necessidade — a forma simples ("vou enviar" / "enviarei") é mais direta. É um padrão
 * MORFOSSINTÁTICO puro (não precisa de léxico grande): âncora numa forma finita de "ir" (lista
 * fechada), seguida do infinitivo "estar", seguida de um gerúndio.
 *
 * O gerúndio é confirmado por sufixo (-ando/-endo/-indo) — seguro NESTE contexto ([ir][estar]…),
 * com um stoplist curto dos poucos não-gerúndios que caberiam depois de "estar" (adjetivos como
 * "lindo"). Adjacência de tokens-palavra; nunca sugere reescrita (→ `requiresHuman`).
 */
import type { Finding, Pass, Token } from "../types";

const CRITERION = "gerundismo";
const PRINCIPLE = "5.3.4";

/** Formas finitas de "ir" que disparam o gerundismo (presente + futuro). Lista fechada. */
const IR_FORMS = new Set(["vou", "vais", "vai", "vamos", "ides", "vão", "irei", "irás", "irá", "iremos", "ireis", "irão"]);

/** Sufixos de gerúndio. */
const GERUND_SUFFIXES = ["ando", "endo", "indo"];

/**
 * Palavras terminadas em -ando/-endo/-indo que NÃO são gerúndio e poderiam seguir "estar"
 * (adjetivos, sobretudo). Stoplist curado — na dúvida, não marca (precisão > recall).
 */
const NON_GERUND = new Set([
  "lindo", "brando", "tremendo", "horrendo", "estupendo", "nefando", "infando", "reverendo", "venerando", "orando",
]);

function isGerund(token: Token): boolean {
  if (!token.isWord || token.lower.length < 5) return false;
  if (NON_GERUND.has(token.lower)) return false;
  return GERUND_SUFFIXES.some((suffix) => token.lower.endsWith(suffix));
}

export const gerundismoPass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  principle: PRINCIPLE,

  run(ctx) {
    if (!ctx.config.gerundismo.enabled) return [];

    const findings: Finding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const words = sentence.tokens.filter((t) => t.isWord);
      for (let i = 0; i + 2 < words.length; i++) {
        if (!IR_FORMS.has(words[i].lower)) continue;
        if (words[i + 1].lower !== "estar") continue;
        if (!isGerund(words[i + 2])) continue;

        const start = words[i].start;
        const end = words[i + 2].end;
        findings.push({
          criterion: CRITERION,
          category: "syntactic",
          principle: PRINCIPLE,
          span: { start, end, text: ctx.doc.source.slice(start, end) },
          severity: "warning",
          requiresHuman: true,
          justification:
            "Gerundismo ('vou estar enviando') — perífrase que alonga a frase sem necessidade. " +
            "Prefira a forma simples ('vou enviar' / 'enviarei'); a ferramenta não reescreve automaticamente.",
        });
      }
    }

    return findings;
  },
};
