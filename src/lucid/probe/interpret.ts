/**
 * Camada 2 · `interpret` — PURO e determinístico: `ProbeResult` → `ProbeSignal`
 * (docs/ARQUITETURA.md §5; CLAUDE.md).
 *
 * REGRA DE FUNDO (I5): a saída nunca é aprovação. `podeResponder=false` OU
 * `precisouInferir=true` → `flag` (falha de piso detectada). Caso contrário → `neutro`
 * ("sem violação de piso detectada (não é garantia de compreensão)"). Não existe — e não
 * pode existir — um terceiro valor "aprovado".
 */
import type { ProbeResult, ProbeSignal } from "./types";

export function interpret(result: ProbeResult): ProbeSignal {
  const failedFloor = !result.podeResponder || result.precisouInferir;

  if (failedFloor) {
    const motivo = !result.podeResponder
      ? "o leitor de piso não conseguiu extrair o fato só do trecho"
      : "o leitor de piso precisou inferir algo que o texto não diz";
    return {
      tipo: "flag",
      motivo,
      operacoes: result.operacoesDeLeitura,
    };
  }

  return {
    tipo: "neutro",
    nota: "sem violação de piso detectada (não é garantia de compreensão)",
    operacoes: result.operacoesDeLeitura,
  };
}
