/**
 * Tier 3 · o gerador de propostas (Camada 2) atrás da interface `RewriteProposer`.
 *
 * Este arquivo traz APENAS o stub determinístico — o que os testes usam e o que mantém a
 * CI byte-idêntica. A implementação real (LLM: `temperature 0`, modelo fixado, prompt
 * versionado) fica atrás de flag num módulo separado e NÃO é dependência do build, exatamente
 * como a sonda (`llm-probe.ts`). Ver ADR-014 e docs/ARQUITETURA.md §5.
 *
 * O contrato do produto (CLAUDE.md/HANDOFF §3): o proposer só PROPÕE; a aceitação depende
 * da verificação determinística (`verify.ts`) e, no fim, do autor. Nada aqui aplica texto.
 */
import type { RewriteProposal, RewriteProposer, RewriteRequest } from "./types";

/**
 * Stub determinístico guiado por FIXTURES: mapeia o trecho original → proposta fixa. É o
 * seam de teste do Tier 3 — permite exercitar o verificador com propostas controladas
 * (que passam ou falham cada checagem de propósito), sem rede nem não-determinismo. Se o
 * trecho não está no mapa, devolve o próprio original (proposta nula: o verificador então
 * mostrará que a violação-alvo não foi resolvida — honesto).
 */
export class StubRewriteProposer implements RewriteProposer {
  readonly id: string;
  private readonly fixtures: ReadonlyMap<string, string>;

  constructor(fixtures: Record<string, string>, id = "stub@1+fixtures@1") {
    this.id = id;
    this.fixtures = new Map(Object.entries(fixtures));
  }

  async propose(request: RewriteRequest): Promise<RewriteProposal> {
    const original = request.finding.span.text;
    const proposed = this.fixtures.get(original) ?? original;
    return { proposerId: this.id, original, proposed };
  }
}
