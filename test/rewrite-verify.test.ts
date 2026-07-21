import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import type { Finding } from "../src/lucid/core/types";
import {
  applyProposal,
  proposeAndVerify,
  StubRewriteProposer,
  verifyRewrite,
  type RewriteProposal,
  type VerifyOptions,
} from "../src/report/rewrite";
import { StubComprehensionProbe } from "../src/lucid/probe/stub-probe";
import type { ProbeResult } from "../src/lucid/probe/types";

/** Finding sintético apontando para um trecho literal — controla o span sem depender do detector. */
function spanFinding(text: string, sub: string, criterion = "long_sentence"): Finding {
  const start = text.indexOf(sub);
  if (start < 0) throw new Error(`trecho não encontrado: ${sub}`);
  return {
    criterion,
    category: "syntactic",
    principle: "5.3.4",
    span: { start, end: start + sub.length, text: sub },
    severity: "warning",
    requiresHuman: true,
    justification: "",
  };
}

function proposal(finding: Finding, proposed: string): RewriteProposal {
  return { proposerId: "test", original: finding.span.text, proposed };
}

function proofPassed(v: { proofs: { check: string; passed: boolean }[] }, check: string): boolean {
  return v.proofs.find((p) => p.check === check)!.passed;
}
function signalFlagged(v: { signals: { check: string; flagged: boolean }[] }, check: string): boolean | undefined {
  return v.signals.find((s) => s.check === check)?.flagged;
}

// Adaptadores: os testes usam `Finding` por conveniência; a API agora recebe `Span` + criterion
// (o critério habilita `target_resolved`; o alvo é o `finding.span`).
function verify(text: string, finding: Finding, p: RewriteProposal, opts: VerifyOptions = {}) {
  return verifyRewrite(text, finding.span, p, { criterion: finding.criterion, ...opts });
}
function propose(text: string, finding: Finding, proposer: StubRewriteProposer) {
  return proposeAndVerify(text, finding.span, proposer, { criterion: finding.criterion });
}

describe("verifyRewrite — PROVA: violação-alvo resolvida", () => {
  it("dividir uma frase longa resolve o alvo e não aumenta o total de findings", async () => {
    const text =
      "O documento apresentado foi analisado com muito cuidado pela comissão competente responsável, " +
      "e o resultado final desse exame minucioso foi comunicado ao interessado dentro do prazo regular.";
    const finding = analyze(text).findings.find((f) => f.criterion === "long_sentence")!;
    const p = proposal(
      finding,
      "O documento apresentado foi analisado pela comissão. O resultado foi comunicado ao interessado no prazo.",
    );

    const v = await verify(text, finding, p);

    expect(proofPassed(v, "target_resolved")).toBe(true);
    expect(proofPassed(v, "no_new_findings")).toBe(true);
    expect(v.hasBlockingFailure).toBe(false);
    expect(v.metrics.wordsAfter).toBeLessThan(v.metrics.wordsBefore);
  });

  it("peso por severidade: trocar 1 erro por 2 avisos PASSA region_improved (contagem subiria)", async () => {
    // Uma frase-monstro (>30 palavras = error). Modo parágrafo (sem criterion).
    const text =
      "A equipe da secretaria revisou com muita atenção todos os documentos que chegaram durante a semana " +
      "passada, para garantir que o relatório final destinado ao diretor ficasse realmente completo, bem claro e correto.";
    const finding = analyze(text).findings.find((f) => f.criterion === "long_sentence")!;
    expect(finding.severity).toBe("error"); // setup: 1 erro na região

    // duas frases ~23 palavras cada = 2 avisos: a CONTAGEM sobe 1→2, mas o PESO cai 3→2.
    const proposed =
      "A equipe da secretaria revisou com bastante atenção todos os documentos que chegaram na semana passada para " +
      "deixar o relatório final bem completo. Depois disso, o setor enviou uma cópia para cada pessoa que participou " +
      "do processo e pediu que todos confirmassem o retorno até sexta.";
    const v = await verifyRewrite(text, finding.span, { proposerId: "test", original: finding.span.text, proposed });

    expect(proofPassed(v, "region_improved")).toBe(true);
    expect(v.hasBlockingFailure).toBe(false);
    expect(v.proofs.find((p) => p.check === "region_improved")!.detail).toMatch(/peso/);
  });

  it("proposta que NÃO resolve o alvo falha em target_resolved (veto mecânico)", async () => {
    const text =
      "O documento apresentado foi analisado com muito cuidado pela comissão competente responsável, " +
      "e o resultado final desse exame minucioso foi comunicado ao interessado dentro do prazo regular.";
    const finding = analyze(text).findings.find((f) => f.criterion === "long_sentence")!;
    // "reescrita" que continua sendo uma única frase longa: o alvo persiste.
    const p = proposal(finding, finding.span.text + " Ainda mais palavras foram acrescentadas sem necessidade alguma aqui.");

    const v = await verify(text, finding, p);

    expect(proofPassed(v, "target_resolved")).toBe(false);
    expect(v.hasBlockingFailure).toBe(true);
  });
});

describe("verifyRewrite — PROVA: preservação mecânica", () => {
  it("números perdidos reprovam numbers_preserved", async () => {
    const text = "O pagamento de R$ 1.500,00 deve ocorrer em 30 dias após o deferimento do pedido formal.";
    const finding = spanFinding(text, "O pagamento de R$ 1.500,00 deve ocorrer em 30 dias");
    const p = proposal(finding, "O pagamento de R$ 1.500,00 deve ocorrer em alguns dias"); // perdeu "30"

    const v = await verify(text, finding, p);
    expect(proofPassed(v, "numbers_preserved")).toBe(false);
    expect(v.hasBlockingFailure).toBe(true);
  });

  it("números mantidos passam numbers_preserved", async () => {
    const text = "O pagamento de R$ 1.500,00 deve ocorrer em 30 dias após o deferimento do pedido formal.";
    const finding = spanFinding(text, "O pagamento de R$ 1.500,00 deve ocorrer em 30 dias");
    const p = proposal(finding, "Pague R$ 1.500,00 em 30 dias");

    const v = await verify(text, finding, p);
    expect(proofPassed(v, "numbers_preserved")).toBe(true);
  });

  it("datas alteradas reprovam dates_preserved", async () => {
    const text = "A audiência foi marcada para 17/11/2025 no fórum central da comarca da capital do estado.";
    const finding = spanFinding(text, "A audiência foi marcada para 17/11/2025 no fórum central");
    const p = proposal(finding, "A audiência foi marcada para 18/11/2025 no fórum central"); // data trocada

    const v = await verify(text, finding, p);
    expect(proofPassed(v, "dates_preserved")).toBe(false);
  });

  it("jargão novo introduzido reprova no_new_jargon", async () => {
    const text = "As regras foram aplicadas ao caso concreto sem qualquer margem para dúvida entre as partes.";
    const finding = spanFinding(text, "As regras foram aplicadas ao caso concreto");
    const p = proposal(finding, "As regras supracitadas foram aplicadas ao caso concreto"); // "supracitadas" = jargão

    const v = await verify(text, finding, p);
    expect(proofPassed(v, "no_new_jargon")).toBe(false);
    expect(v.proofs.find((pr) => pr.check === "no_new_jargon")!.detail).toContain("supracitadas");
  });
});

describe("verifyRewrite — SINAL: entidades (heurística, não prova)", () => {
  it("nome próprio ausente na proposta levanta bandeira", async () => {
    const text = "O parecer foi assinado pela Comissão de Ética do órgão responsável pela decisão final.";
    const finding = spanFinding(text, "O parecer foi assinado pela Comissão de Ética");
    const p = proposal(finding, "O parecer foi assinado pela comissão"); // perdeu "Comissão"/"Ética"

    const v = await verify(text, finding, p);
    expect(signalFlagged(v, "entities_preserved")).toBe(true);
    // é SINAL, não PROVA: nunca aparece na lista de provas (nem vira veto mecânico sozinho)
    expect(v.proofs.map((pr) => pr.check as string)).not.toContain("entities_preserved");
  });

  it("nomes preservados não levantam bandeira", async () => {
    const text = "O parecer foi assinado pela Comissão de Ética do órgão responsável pela decisão final.";
    const finding = spanFinding(text, "O parecer foi assinado pela Comissão de Ética");
    const p = proposal(finding, "A Comissão de Ética assinou o parecer");

    const v = await verify(text, finding, p);
    expect(signalFlagged(v, "entities_preserved")).toBe(false);
  });
});

describe("verifyRewrite — SINAL: sonda como teste NEGATIVO", () => {
  const readable: ProbeResult = {
    podeResponder: true,
    respostaExtraida: "o fato",
    ondeTravou: [],
    operacoesDeLeitura: [],
    precisouInferir: false,
  };
  const stuck: ProbeResult = {
    podeResponder: false,
    respostaExtraida: "o texto não diz",
    ondeTravou: [{ frase: "trecho", motivo: "ambíguo" }],
    operacoesDeLeitura: ["integrar_entre_frases"],
    precisouInferir: false,
  };

  it("original legível + proposta que trava → bandeira de perda de sentido", async () => {
    const text = "O prazo começa a contar da data da publicação do ato no diário oficial do estado.";
    const finding = spanFinding(text, "O prazo começa a contar da data da publicação");
    const p = proposal(finding, "O prazo começa depois");
    const probe = new StubComprehensionProbe({ [p.original]: readable, [p.proposed]: stuck });

    const v = await verify(text, finding, p, { probe, question: "quando o prazo começa?" });
    expect(signalFlagged(v, "meaning_preserved")).toBe(true);
  });

  it("proposta que trava mas original também travava → SEM conclusão de perda (não bandeira)", async () => {
    const text = "O prazo começa a contar da data da publicação do ato no diário oficial do estado.";
    const finding = spanFinding(text, "O prazo começa a contar da data da publicação");
    const p = proposal(finding, "O prazo começa depois");
    const probe = new StubComprehensionProbe({ [p.original]: stuck, [p.proposed]: stuck });

    const v = await verify(text, finding, p, { probe, question: "quando o prazo começa?" });
    expect(signalFlagged(v, "meaning_preserved")).toBe(false);
  });

  it("sem sonda, o sinal de sentido é omitido (não inventado)", async () => {
    const text = "O prazo começa a contar da data da publicação do ato no diário oficial do estado.";
    const finding = spanFinding(text, "O prazo começa a contar da data da publicação");
    const p = proposal(finding, "O prazo começa depois");

    const v = await verify(text, finding, p);
    expect(v.signals.some((s) => s.check === "meaning_preserved")).toBe(false);
  });
});

describe("honestidade (I5): sem selo verde", () => {
  it("a verificação não tem campo 'aprovado'/'ok'; tudo passar é ausência de falha, não aprovação", async () => {
    const text = "As contas do setor foram conferidas com atenção pela equipe antes do fechamento mensal regular.";
    const finding = spanFinding(text, "As contas do setor foram conferidas");
    const p = proposal(finding, "A equipe conferiu as contas do setor");

    const v = await verify(text, finding, p);
    const keys = Object.keys(v);
    expect(keys).not.toContain("approved");
    expect(keys).not.toContain("ok");
    expect(keys).not.toContain("passed");
    expect(keys.sort()).toEqual(["hasBlockingFailure", "metrics", "proofs", "signals"]);
  });

  it("determinismo: mesma entrada → mesmo JSON", async () => {
    const text = "O documento foi arquivado pelo setor competente após a conclusão do trâmite administrativo.";
    const finding = spanFinding(text, "O documento foi arquivado pelo setor competente");
    const p = proposal(finding, "O setor arquivou o documento");

    const a = JSON.stringify(await verify(text, finding, p));
    const b = JSON.stringify(await verify(text, finding, p));
    expect(b).toBe(a);
  });
});

describe("proposeAndVerify — orquestrador com stub proposer", () => {
  it("propõe (via fixture) e verifica num passo; nunca aplica sozinho", async () => {
    const text =
      "O documento apresentado foi analisado com muito cuidado pela comissão competente responsável, " +
      "e o resultado final desse exame minucioso foi comunicado ao interessado dentro do prazo regular.";
    const finding = analyze(text).findings.find((f) => f.criterion === "long_sentence")!;
    const proposer = new StubRewriteProposer({
      [finding.span.text]:
        "O documento foi analisado pela comissão. O resultado foi comunicado ao interessado no prazo.",
    });

    const result = await propose(text, finding, proposer);

    expect(result.proposal.proposerId).toBe("stub@1+fixtures@1");
    expect(result.verification.hasBlockingFailure).toBe(false);
    // o texto original permanece intacto — proposeAndVerify não aplica nada
    expect(analyze(text).text).toBe(text);
  });

  it("trecho fora do fixture: proposta = original → o verificador mostra o alvo não resolvido", async () => {
    const text = "O relatório foi entregue pelos servidores designados para a tarefa específica do mês.";
    const finding = analyze(text).findings.find((f) => f.criterion === "passive_voice" && f.meta?.hasAgent)!;
    const proposer = new StubRewriteProposer({}); // sem fixture → devolve o original

    const result = await propose(text, finding, proposer);
    expect(result.proposal.proposed).toBe(finding.span.text);
    expect(proofPassed(result.verification, "target_resolved")).toBe(false);
  });
});

describe("applyProposal — substituição pura do trecho", () => {
  it("troca só o span do finding, preservando o resto do texto", () => {
    const text = "Início. O documento foi arquivado pelo setor. Fim.";
    const finding = spanFinding(text, "O documento foi arquivado pelo setor", "passive_voice");
    expect(applyProposal(text, finding.span, proposal(finding, "O setor arquivou o documento"))).toBe(
      "Início. O setor arquivou o documento. Fim.",
    );
  });
});
