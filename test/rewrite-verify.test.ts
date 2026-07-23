import { describe, expect, it, vi } from "vitest";
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
import type { ComprehensionProbe, ProbeInput, ProbeResult } from "../src/lucid/probe/types";

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
    const text =
      "A equipe da secretaria revisou com muita atenção todos os documentos que chegaram durante a semana " +
      "passada, para garantir que o relatório final destinado ao diretor ficasse realmente completo, bem claro e correto.";
    const finding = analyze(text).findings.find((f) => f.criterion === "long_sentence")!;
    expect(finding.severity).toBe("error");

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

    const p = proposal(finding, finding.span.text + " Ainda mais palavras foram acrescentadas sem necessidade alguma aqui.");

    const v = await verify(text, finding, p);

    expect(proofPassed(v, "target_resolved")).toBe(false);
    expect(v.hasBlockingFailure).toBe(true);
  });
});

describe("verifyRewrite — PROVA: briefing dirigido (múltiplos critérios) resolvido", () => {
  const PARAGRAPH =
    "Foi realizada a análise do documento pela comissão competente em sede de procedimento " +
    "administrativo destinado à verificação das condições supracitadas exigidas para a concessão do " +
    "benefício, e a decisão foi comunicada ao interessado no processo.";

  it("verificação empírica: nenhuma passiva do parágrafo é mecanicamente pedível (ambas requiresHuman)", () => {
    const passives = analyze(PARAGRAPH).findings.filter((f) => f.criterion === "passive_voice");
    expect(passives.length).toBeGreaterThan(0);
    expect(passives.every((f) => f.requiresHuman)).toBe(true);
  });

  it("Groq 70B (ao vivo): resolveu jargão/frase longa; a voz passiva nunca era pedível aqui — PASSA (correção do achado original)", async () => {
    const findings = analyze(PARAGRAPH).findings;
    const proposed =
      "Foi feita uma análise do documento. Isso foi feito para verificar as condições necessárias " +
      "para conceder o benefício. A decisão foi comunicada ao interessado no processo.";
    const target = { start: 0, end: PARAGRAPH.length, text: PARAGRAPH };
    const v = await verifyRewrite(PARAGRAPH, target, { proposerId: "groq-70b-live", original: PARAGRAPH, proposed }, {
      findings,
    });

    expect(proofPassed(v, "directed_findings_resolved")).toBe(true);
  });

  it("Gemini Flash (ao vivo): mesma conclusão — PASSA", async () => {
    const findings = analyze(PARAGRAPH).findings;
    const proposed =
      "A comissão analisou o documento. Ela verificou as condições necessárias para dar o benefício. " +
      "A decisão foi informada à pessoa interessada no processo.";
    const target = { start: 0, end: PARAGRAPH.length, text: PARAGRAPH };
    const v = await verifyRewrite(PARAGRAPH, target, { proposerId: "gemini-flash-live", original: PARAGRAPH, proposed }, {
      findings,
    });

    expect(proofPassed(v, "directed_findings_resolved")).toBe(true);
  });

  it("uma reescrita que resolve TODOS os critérios PEDÍVEIS do briefing passa", async () => {
    const findings = analyze(PARAGRAPH).findings;
    const proposed =
      "A comissão competente analisou o documento no procedimento administrativo. Ela verificou as " +
      "condições citadas acima exigidas para conceder o benefício. Depois, comunicou a decisão ao interessado.";
    const target = { start: 0, end: PARAGRAPH.length, text: PARAGRAPH };
    const v = await verifyRewrite(PARAGRAPH, target, { proposerId: "ideal", original: PARAGRAPH, proposed }, {
      findings,
    });

    expect(proofPassed(v, "directed_findings_resolved")).toBe(true);
  });

  const RESOLVABLE_PASSIVE = "O documento foi analisado pela comissão.";

  it("achado com AGENTE (mecanicamente resolvível) que a IA IGNORA — REPROVA, mesmo com jargão corrigido", async () => {
    const text = `${RESOLVABLE_PASSIVE} O pagamento ocorre em sede de acordo prévio.`;
    const findings = analyze(text).findings.filter((f) => f.criterion === "passive_voice" || f.criterion === "jargon");
    expect(findings.some((f) => f.criterion === "passive_voice" && !f.requiresHuman)).toBe(true);

    const proposed = `${RESOLVABLE_PASSIVE} O pagamento ocorre conforme acordo prévio.`;
    const target = { start: 0, end: text.length, text };
    const v = await verifyRewrite(text, target, { proposerId: "ignorou-pedivel", original: text, proposed }, {
      findings,
    });

    expect(proofPassed(v, "directed_findings_resolved")).toBe(false);
    const detail = v.proofs.find((p) => p.check === "directed_findings_resolved")!.detail;
    expect(detail).toContain("passive_voice");
  });

  it("mistura: passiva COM agente é corrigida, passiva SEM agente (requiresHuman) é tolerada — PASSA", async () => {
    const text = `${RESOLVABLE_PASSIVE} A decisão foi comunicada ao interessado.`;
    const findings = analyze(text).findings.filter((f) => f.criterion === "passive_voice");
    const resolvableCount = findings.filter((f) => !f.requiresHuman).length;
    const tolerableCount = findings.filter((f) => f.requiresHuman).length;
    expect(resolvableCount).toBeGreaterThan(0);
    expect(tolerableCount).toBeGreaterThan(0);

    const proposed = "A comissão analisou o documento. A decisão foi comunicada ao interessado.";
    const target = { start: 0, end: text.length, text };
    const v = await verifyRewrite(text, target, { proposerId: "correto", original: text, proposed }, { findings });

    expect(proofPassed(v, "directed_findings_resolved")).toBe(true);
  });

  it("sem findings dirigidos, a prova é OMITIDA (não inventa uma checagem que ninguém pediu)", async () => {
    const finding = spanFinding("Um texto qualquer aqui.", "Um texto qualquer aqui.", "long_sentence");
    const v = await verify("Um texto qualquer aqui.", finding, proposal(finding, "Outro texto."));
    expect(v.proofs.find((p) => p.check === "directed_findings_resolved")).toBeUndefined();
  });

  it("achados 100% requiresHuman (nada pedível) — a prova é OMITIDA, não vira um 'passou' vazio", async () => {
    const passives = analyze(PARAGRAPH).findings.filter((f) => f.criterion === "passive_voice");
    const target = { start: 0, end: PARAGRAPH.length, text: PARAGRAPH };
    const v = await verifyRewrite(PARAGRAPH, target, { proposerId: "x", original: PARAGRAPH, proposed: PARAGRAPH }, {
      findings: passives,
    });
    expect(v.proofs.find((p) => p.check === "directed_findings_resolved")).toBeUndefined();
  });
});

describe("verifyRewrite — PROVA: preservação mecânica", () => {
  it("números perdidos reprovam numbers_preserved", async () => {
    const text = "O pagamento de R$ 1.500,00 deve ocorrer em 30 dias após o deferimento do pedido formal.";
    const finding = spanFinding(text, "O pagamento de R$ 1.500,00 deve ocorrer em 30 dias");
    const p = proposal(finding, "O pagamento de R$ 1.500,00 deve ocorrer em alguns dias");

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
    const p = proposal(finding, "A audiência foi marcada para 18/11/2025 no fórum central");

    const v = await verify(text, finding, p);
    expect(proofPassed(v, "dates_preserved")).toBe(false);
  });

  it("jargão novo introduzido reprova no_new_jargon", async () => {
    const text = "As regras foram aplicadas ao caso concreto sem qualquer margem para dúvida entre as partes.";
    const finding = spanFinding(text, "As regras foram aplicadas ao caso concreto");
    const p = proposal(finding, "As regras supracitadas foram aplicadas ao caso concreto");

    const v = await verify(text, finding, p);
    expect(proofPassed(v, "no_new_jargon")).toBe(false);
    expect(v.proofs.find((pr) => pr.check === "no_new_jargon")!.detail).toContain("supracitadas");
  });
});

describe("verifyRewrite — PROVA: 1ª pessoa fabricada (ADR-019)", () => {
  it("texto impessoal reescrito com 'nós' inventado reprova (veto mecânico)", async () => {
    const text = "Foi realizada a análise do documento pela comissão competente antes da decisão final do processo.";
    const finding = spanFinding(text, "Foi realizada a análise do documento pela comissão competente");
    const p = proposal(finding, "Nós analisamos o documento com a nossa comissão competente");
    const v = await verify(text, finding, p);
    expect(proofPassed(v, "no_invented_first_person")).toBe(false);
    expect(v.proofs.find((pr) => pr.check === "no_invented_first_person")!.detail).toMatch(/nós|nossa/i);
    expect(v.hasBlockingFailure).toBe(true);
  });

  it("proposta sem 1ª pessoa passa", async () => {
    const text = "Foi realizada a análise do documento pela comissão competente antes da decisão final do processo.";
    const finding = spanFinding(text, "Foi realizada a análise do documento pela comissão competente");
    const p = proposal(finding, "A comissão competente analisou o documento");
    const v = await verify(text, finding, p);
    expect(proofPassed(v, "no_invented_first_person")).toBe(true);
  });

  it("1ª pessoa que JÁ existe no documento não é considerada fabricada", async () => {
    const text = "Nós recebemos o seu pedido. Foi realizada a análise do documento pela comissão antes da decisão.";
    const finding = spanFinding(text, "Foi realizada a análise do documento pela comissão");
    const p = proposal(finding, "Nós analisamos o documento na comissão");
    const v = await verify(text, finding, p);
    expect(proofPassed(v, "no_invented_first_person")).toBe(true);
  });

  it("veta 'nós' pro-drop escondido no verbo (sem escrever o pronome)", async () => {
    const text = "Foi verificado se a documentação está em ordem. Os documentos serão examinados na decisão final.";
    const finding = spanFinding(text, "Foi verificado se a documentação está em ordem");
    const p = proposal(finding, "Verificamos a documentação. Vamos analisar mais e decidir depois.");
    const v = await verify(text, finding, p);
    expect(proofPassed(v, "no_invented_first_person")).toBe(false);
    expect(v.proofs.find((pr) => pr.check === "no_invented_first_person")!.detail).toMatch(/verificamos|vamos/i);
    expect(v.hasBlockingFailure).toBe(true);
  });

  it("reformulação impessoal (sem inventar agente) continua passando", async () => {
    const text = "Foi verificado se a documentação está em ordem. Os documentos serão examinados na decisão final.";
    const finding = spanFinding(text, "Foi verificado se a documentação está em ordem");
    const p = proposal(finding, "A documentação está em ordem");
    const v = await verify(text, finding, p);
    expect(proofPassed(v, "no_invented_first_person")).toBe(true);
  });
});

describe("verifyRewrite — SINAL: entidades (heurística, não prova)", () => {
  it("nome próprio ausente na proposta levanta bandeira", async () => {
    const text = "O parecer foi assinado pela Comissão de Ética do órgão responsável pela decisão final.";
    const finding = spanFinding(text, "O parecer foi assinado pela Comissão de Ética");
    const p = proposal(finding, "O parecer foi assinado pela comissão");

    const v = await verify(text, finding, p);
    expect(signalFlagged(v, "entities_preserved")).toBe(true);
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

describe("verifyRewrite — LUCID-013: sonda opcional degrada graciosamente", () => {
  const readable: ProbeResult = {
    podeResponder: true,
    respostaExtraida: "o fato",
    ondeTravou: [],
    operacoesDeLeitura: [],
    precisouInferir: false,
  };

  class FailingProbe implements ComprehensionProbe {
    readonly id = "failing-probe@1";
    constructor(private readonly failOn: string) {}
    async probe(input: ProbeInput): Promise<ProbeResult> {
      if (input.trecho === this.failOn) throw new Error("sonda indisponível (timeout simulado)");
      return readable;
    }
  }

  it("sonda funcionando: meaning_preserved é emitido normalmente (comportamento inalterado)", async () => {
    const text = "O prazo começa a contar da data da publicação do ato no diário oficial do estado.";
    const finding = spanFinding(text, "O prazo começa a contar da data da publicação");
    const p = proposal(finding, "O prazo começa depois");
    const probe = new StubComprehensionProbe({ [p.original]: readable, [p.proposed]: readable });

    const v = await verify(text, finding, p, { probe, question: "quando o prazo começa?" });
    expect(v.signals.some((s) => s.check === "meaning_preserved")).toBe(true);
  });

  it("sonda falha no ORIGINAL: verifyRewrite resolve, provas e métricas seguem presentes, sem meaning_preserved, sem exceção", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const text = "O prazo começa a contar da data da publicação do ato no diário oficial do estado.";
    const finding = spanFinding(text, "O prazo começa a contar da data da publicação");
    const p = proposal(finding, "O prazo começa depois");
    const probe = new FailingProbe(p.original);

    const v = await verify(text, finding, p, { probe, question: "quando o prazo começa?" });

    expect(v.proofs.length).toBeGreaterThan(0);
    expect(v.metrics).toBeDefined();
    expect(v.signals.some((s) => s.check === "meaning_preserved")).toBe(false);
    expect(v.hasBlockingFailure).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("sonda");
    warnSpy.mockRestore();
  });

  it("sonda falha na PROPOSTA: mesma degradação graciosa", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const text = "O prazo começa a contar da data da publicação do ato no diário oficial do estado.";
    const finding = spanFinding(text, "O prazo começa a contar da data da publicação");
    const p = proposal(finding, "O prazo começa depois");
    const probe = new FailingProbe(p.proposed);

    const v = await verify(text, finding, p, { probe, question: "quando o prazo começa?" });

    expect(v.proofs.length).toBeGreaterThan(0);
    expect(v.metrics).toBeDefined();
    expect(v.signals.some((s) => s.check === "meaning_preserved")).toBe(false);
    expect(v.hasBlockingFailure).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it("sem sonda: comportamento permanece inalterado (nenhum warning, nenhum signal)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const text = "O prazo começa a contar da data da publicação do ato no diário oficial do estado.";
    const finding = spanFinding(text, "O prazo começa a contar da data da publicação");
    const p = proposal(finding, "O prazo começa depois");

    const v = await verify(text, finding, p);

    expect(v.signals.some((s) => s.check === "meaning_preserved")).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("falha determinística real (fora da sonda) continua propagando — o catch não engole erros alheios", async () => {
    const text = "O documento foi arquivado pelo setor competente.";
    const finding = spanFinding(text, "O documento foi arquivado pelo setor competente", "passive_voice");
    const p: RewriteProposal = { ...proposal(finding, "O setor arquivou o documento."), localeId: "en-US" };

    await expect(verify(text, finding, p)).rejects.toThrow(/locale/);
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
    expect(analyze(text).text).toBe(text);
  });

  it("trecho fora do fixture: proposta = original → o verificador mostra o alvo não resolvido", async () => {
    const text = "O relatório foi entregue pelos servidores designados para a tarefa específica do mês.";
    const finding = analyze(text).findings.find((f) => f.criterion === "passive_voice" && f.meta?.hasAgent)!;
    const proposer = new StubRewriteProposer({});

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

describe("verifyRewrite — identidade de locale (anti-mistura, ADR-031)", () => {
  const text = "O documento foi arquivado pelo setor competente.";
  const finding = spanFinding(text, "O documento foi arquivado pelo setor competente", "passive_voice");

  it("recusa verificar uma proposta de outro locale sob o locale default (pt-BR)", async () => {
    const p: RewriteProposal = { ...proposal(finding, "O setor arquivou o documento."), localeId: "en-US" };
    await expect(verify(text, finding, p)).rejects.toThrow(/locale/);
  });

  it("aceita uma proposta sem localeId (compat) e uma com o localeId do locale", async () => {
    const semLocale: RewriteProposal = proposal(finding, "O setor arquivou o documento.");
    await expect(verify(text, finding, semLocale)).resolves.toBeDefined();

    const ptBR: RewriteProposal = { ...semLocale, localeId: "pt-BR" };
    await expect(verify(text, finding, ptBR)).resolves.toBeDefined();
  });
});
