/**
 * Pass "salto de nível de título" (`salto_de_nivel_titulo`) — `5.2`, fácil de localizar (Princípio 2).
 *
 * O PRIMEIRO detector que só existe porque um formato ESTRUTURADO (DOCX) fornece `heading` com
 * nível (ADR-038/039). Lê os blocos `kind === "heading"` em ordem de leitura e marca quando um título
 * PULA um nível para baixo (ex.: nível 1 → nível 3, sem passar pelo 2). Saltos quebram a leitura por
 * estrutura — varrer o texto, sumário, leitor de tela — porque a hierarquia deixa de ser previsível.
 *
 * Determinístico e conservador: só marca o salto DESCENDENTE de mais de um nível (subir de volta,
 * nível 3 → nível 1, é fechar seções, normal). Texto puro não tem `heading` → nunca dispara (correto:
 * não há hierarquia de título de verdade em texto sem marcação). NÃO reescreve — reorganizar a
 * hierarquia é decisão de autor (`requiresHuman`, sem `suggestion`).
 */
import type { Finding, Pass } from "@/lucid/core/types";

const CRITERION = "salto_de_nivel_titulo";
const PRINCIPLE = "5.2";

export const hierarquiaTitulosPass: Pass = {
  criterion: CRITERION,
  category: "structural",
  principle: PRINCIPLE,

  run(ctx) {
    if (!ctx.config.hierarquiaTitulos.enabled) return [];

    const findings: Finding[] = [];
    let prevLevel: number | null = null;

    for (const block of ctx.doc.blocks) {
      if (block.kind !== "heading") continue;

      if (prevLevel !== null && block.level > prevLevel + 1) {
        findings.push({
          criterion: CRITERION,
          category: "structural",
          principle: PRINCIPLE,
          span: { start: block.start, end: block.end, text: block.text },
          severity: "warning",
          requiresHuman: true,
          justification:
            `Este título pula do nível ${prevLevel} para o ${block.level}, sem passar pelo ${prevLevel + 1}. ` +
            "Saltos na hierarquia quebram a leitura por estrutura (sumário, varredura, leitor de tela). Ajuste o " +
            "nível deste título ou insira um intermediário; a ferramenta não reorganiza a hierarquia por você.",
          meta: { level: block.level, prevLevel },
        });
      }

      prevLevel = block.level;
    }

    return findings;
  },
};
