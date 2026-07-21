/**
 * Camada 2 · sonda-STUB determinística (docs/ARQUITETURA.md §5). É a implementação que os
 * testes usam: mesma entrada → mesma saída, sem rede. A sonda real (`llm-probe.ts`, atrás
 * de flag) não é dependência do build.
 *
 * O stub mapeia `trecho` → `ProbeResult` fixo por FIXTURE. Trecho não cadastrado cai no
 * default configurável — deliberadamente conservador: por padrão, "não consegue responder"
 * (piso pessimista). Nada aqui aprova nada: `ProbeResult` alimenta `interpret`, que só
 * emite `flag` ou `neutro`.
 */
import type { ComprehensionProbe, ProbeInput, ProbeResult } from "./types";

const DEFAULT_UNANSWERABLE: ProbeResult = {
  podeResponder: false,
  respostaExtraida: "o texto não diz",
  ondeTravou: [],
  operacoesDeLeitura: [],
  precisouInferir: false,
};

export class StubComprehensionProbe implements ComprehensionProbe {
  readonly id: string;
  private readonly fixtures: ReadonlyMap<string, ProbeResult>;
  private readonly fallback: ProbeResult;

  constructor(
    fixtures: Record<string, ProbeResult>,
    options: { id?: string; fallback?: ProbeResult } = {},
  ) {
    this.id = options.id ?? "stub-probe@1";
    this.fixtures = new Map(Object.entries(fixtures));
    this.fallback = options.fallback ?? DEFAULT_UNANSWERABLE;
  }

  async probe(input: ProbeInput): Promise<ProbeResult> {
    return this.fixtures.get(input.trecho) ?? this.fallback;
  }
}
