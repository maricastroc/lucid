export type OperacaoLeitura =
  | "resolver_referente_a_distancia"
  | "integrar_entre_frases"
  | "decodificar_termo_tecnico"
  | "inferir_agente_omitido"
  | "segurar_sujeito_longo"
  | "desfazer_negacao_aninhada";

export interface ProbeInput {
  trecho: string;
  pergunta: string;
  persona?: string;
}

export interface ProbeResult {
  podeResponder: boolean;
  respostaExtraida: string;
  ondeTravou: { frase: string; motivo: string }[];
  operacoesDeLeitura: OperacaoLeitura[];
  precisouInferir: boolean;
}

export interface ProbeOptions {
  /** Cancela a chamada (ex.: o usuário fechou o painel, ou o texto mudou de novo). */
  signal?: AbortSignal;
}

export interface ComprehensionProbe {
  /** "modelo@versão + prompt@versão" — proveniência para eval e anti-drift */
  readonly id: string;
  probe(input: ProbeInput, options?: ProbeOptions): Promise<ProbeResult>;
}

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
