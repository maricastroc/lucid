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
