import type { PassFinding, Pass } from "@/lucid/core/types";

const CRITERION = "salto_de_nivel_titulo";

export const hierarquiaTitulosPass: Pass = {
  criterion: CRITERION,
  category: "structural",

  run(ctx) {
    if (!ctx.config.hierarquiaTitulos.enabled) return [];

    const findings: PassFinding[] = [];
    let prevLevel: number | null = null;

    for (const block of ctx.doc.blocks) {
      if (block.kind !== "heading") continue;

      if (prevLevel !== null && block.level > prevLevel + 1) {
        findings.push({
          criterion: CRITERION,
          category: "structural",
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
