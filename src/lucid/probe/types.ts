/**
 * Tipos da Camada 2 (sonda de compreensão sintética). Contrato: docs/ARQUITETURA.md §5.
 *
 * REGRA DE FRONTEIRA (I1): nada em `src/lucid/core/**` pode importar deste arquivo ou
 * de qualquer outro em `src/lucid/probe/**`. Verificado por `.dependency-cruiser.cjs`
 * e `test/boundary.test.ts`.
 *
 * REGRA DE FUNDO (I5): a sonda nunca emite aprovação. `ProbeSignal` não tem — e não
 * pode ganhar — uma variante "aprovado". O melhor caso possível é "neutro".
 */

export type OperacaoLeitura =
  | "resolver_referente_a_distancia"
  | "integrar_entre_frases"
  | "decodificar_termo_tecnico"
  | "inferir_agente_omitido"
  | "segurar_sujeito_longo"
  | "desfazer_negacao_aninhada";

export interface ProbeInput {
  trecho: string;
  /** a pergunta que o leitor veio fazer */
  pergunta: string;
  /** persona de piso (leitor de baixa literacia) */
  persona?: string;
}

/** Espelha o JSON do prompt do leitor sintético (ver CLAUDE.md). */
export interface ProbeResult {
  podeResponder: boolean;
  respostaExtraida: string;
  ondeTravou: { frase: string; motivo: string }[];
  operacoesDeLeitura: OperacaoLeitura[];
  precisouInferir: boolean;
}

export interface ComprehensionProbe {
  /** "modelo@versão + prompt@versão" — proveniência para eval e anti-drift */
  readonly id: string;
  probe(input: ProbeInput): Promise<ProbeResult>;
}

/**
 * Saída de `interpret(ProbeResult)`. Deliberadamente sem variante de aprovação:
 * o único par possível é "flag" (falha detectada) ou "neutro" (ausência de falha,
 * nunca evidência positiva de compreensão).
 */
export type ProbeSignal =
  | {
      tipo: "flag";
      motivo: string;
      trecho?: import("../core/types").Span;
      operacoes: OperacaoLeitura[];
    }
  | {
      tipo: "neutro";
      nota: "sem violação de piso detectada (não é garantia de compreensão)";
      operacoes: OperacaoLeitura[];
    };
