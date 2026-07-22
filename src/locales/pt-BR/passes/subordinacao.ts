/**
 * Pass "densidade de subordinação" (`subordinacao_densa`) — `5.3.4`, frases concisas / uma ideia
 * por frase (docs/CLAUDE.md, Fase 2).
 *
 * Mede quantas ORAÇÕES SUBORDINADAS uma frase encadeia, usando a contagem de CONECTIVOS
 * subordinativos (léxico `subordinadores.pt`, matcher de frase contígua compartilhado) como proxy
 * determinístico — sem parser. Se a contagem atinge `config.subordinacao.minPorFrase`, emite UM
 * finding por frase (canal `passage`, como `long_sentence`): a frase inteira é o alvo, porque o
 * problema é ela empilhar ideias demais, não um conectivo isolado.
 *
 * Precisão > recall por construção (ver o `_comentario` do dataset): o léxico só conta conectivos
 * de sentido estável (conjunções-função + locuções auto-desambiguadas + relativos seguros) e
 * DEIXA DE FORA os polissêmicos ('que'/'se'/'como'/'caso'…) que exigiriam análise sintática. Logo
 * a contagem SUBESTIMA a subordinação real — é um piso honesto, nunca um exagero: uma frase que
 * atinge o limiar só com conectivos inequívocos é, comprovadamente, densa.
 *
 * NÃO reescreve: separar orações exige decidir o que vira frase própria e reconjugar — trabalho de
 * autor. `suggestion` nunca é preenchida; `requiresHuman` é sempre `true`.
 */
import type { Finding, Pass } from "@/lucid/core/types";
import type { PhrasePrepared } from "../datasets/types";
import { matchPhrasesInSentence } from "./phrase-match";

const CRITERION = "subordinacao_densa";
const PRINCIPLE = "5.3.4";

export const subordinacaoPass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  principle: PRINCIPLE,
  dataDeps: ["subordinadores.pt"],

  run(ctx) {
    if (!ctx.config.subordinacao.enabled) return [];

    const byFirstWord = ctx.data.get<PhrasePrepared>("subordinadores.pt");
    const threshold = ctx.config.subordinacao.minPorFrase;
    const findings: Finding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const hits = matchPhrasesInSentence(sentence, byFirstWord, ctx.doc.source);
      if (hits.length < threshold) continue;

      const connectives = hits.map((h) => `“${h.text.replace(/\s+/g, " ").trim()}”`).join(", ");
      findings.push({
        criterion: CRITERION,
        category: "syntactic",
        principle: PRINCIPLE,
        span: { start: sentence.start, end: sentence.end, text: sentence.text },
        severity: "warning",
        requiresHuman: true,
        justification:
          `Esta frase encadeia ${hits.length} orações subordinadas (${connectives}) — muitas ideias ` +
          "presas numa frase só pesam a leitura. Considere separar em frases mais curtas, uma ideia por " +
          "vez; a ferramenta não decide onde quebrar.",
        meta: { clauses: hits.length, threshold },
      });
    }

    return findings;
  },
};
