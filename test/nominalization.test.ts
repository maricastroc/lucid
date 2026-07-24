import { describe, expect, it } from "vitest";
import { createDataView } from "../src/locales/pt-BR/datasets/registry";
import { nominalizationPass } from "../src/locales/pt-BR/passes/nominalization";
import { sentenceLengthPass } from "../src/locales/pt-BR/passes/sentence-length";
import { passiveVoicePass } from "../src/locales/pt-BR/passes/passive-voice";
import { PASSES } from "../src/locales/pt-BR/passes/registry";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";
import { buildDocument } from "./support/pt";
import type { Config } from "../src/lucid/core/config";
import type { PassContext } from "../src/lucid/core/types";

function ctxFor(text: string, config: Config = DEFAULT_CONFIG): PassContext {
  return { doc: buildDocument(text), config, data: createDataView([]) };
}

function nomFindings(text: string, config: Config = DEFAULT_CONFIG) {
  return nominalizationPass.run(ctxFor(text, config));
}

describe("nominalizationPass — cada verbo leve cadastrado", () => {
  it.each([
    "É preciso fazer a análise de documentos.",
    "É preciso realizar o pagamento da taxa.",
    "É preciso efetuar a solicitação de acesso.",
    "É preciso promover a avaliação de riscos.",
    "É preciso proceder à verificação dos dados.",
  ])("detecta a construção em '%s' — sem compor troca (ADR-054)", (text) => {
    const findings = nomFindings(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBeUndefined();
  });
});

describe("nominalizationPass — a engine nunca compõe a troca (ADR-054)", () => {
  it.each([
    "É preciso fazer a análise de documentos.",
    "O comitê fez a análise de documentos.",
    "O comitê fez a análise ontem.",
    "É preciso promover a revisão dos autos.",
  ])("'%s': nenhum finding carrega suggestion", (text) => {
    for (const f of nomFindings(text)) expect(f.suggestion).toBeUndefined();
  });

  it("o verbo-base curado é informado via meta e justification — informação, não texto pronto", () => {
    const [f] = nomFindings("É preciso fazer a análise de documentos.");
    expect(f.meta).toMatchObject({ lightVerb: "fazer", nominalization: "análise", baseVerb: "analisar" });
    expect(f.justification).toContain('"analisar"');
    expect(f.justification).toContain("não reescreve");
  });
});

describe("nominalizationPass — requiresHuman classifica a ambiguidade do mapeamento", () => {
  it.each([
    "É preciso fazer a análise de documentos.",
    "O comitê fez a análise ontem.",
    "Eles fazem a análise semanalmente.",
    "É bom que façam a análise.",
  ])("mapeamento único ('%s' → analisar): requiresHuman=false — qualquer reescritor resolve sem informação nova", (text) => {
    const findings = nomFindings(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].requiresHuman).toBe(false);
  });

  it.each([
    "É preciso promover a revisão dos autos.",
    "É preciso fazer a revisão de documentos.",
  ])("mapeamento ambíguo ('%s' → revisão): requiresHuman=true — a escolha do verbo é do autor", (text) => {
    const findings = nomFindings(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].requiresHuman).toBe(true);
    expect(findings[0].meta).toMatchObject({ nominalization: expect.stringContaining("revis") });
  });
});

describe("nominalizationPass — artigos definidos e indefinidos", () => {
  it.each([
    ["fazer a análise", "a"],
    ["fazer o pagamento", "o"],
    ["fazer as análises", "as"],
    ["fazer os pagamentos", "os"],
    ["fazer uma análise", "uma"],
  ])("aceita determinante '%s'", (fragmento) => {
    const findings = nomFindings(`É preciso ${fragmento}.`);
    expect(findings).toHaveLength(1);
  });

  it("'um pagamento' também é aceito", () => {
    const findings = nomFindings("É preciso fazer um pagamento.");
    expect(findings).toHaveLength(1);
  });
});

describe("nominalizationPass — contrações à/ao/às/aos", () => {
  it.each([
    "É preciso proceder à verificação dos dados.",
    "É preciso proceder ao pagamento imediatamente.",
  ])("'%s' casa com o padrão 'a' de 'proceder'", (text) => {
    const findings = nomFindings(text);
    expect(findings).toHaveLength(1);
  });

  it("determinante 'direct' (o/a/os/as/um/uma) não casa com verbo de padrão 'a'", () => {
    expect(nomFindings("É preciso proceder a verificação.")).toEqual([]);
  });
});

describe("nominalizationPass — nominalizações cadastradas", () => {
  it.each(["análise", "pagamento", "solicitação", "verificação", "avaliação", "aprovação", "correção", "atualização", "publicação", "cancelamento", "agendamento"])(
    "'%s' é reconhecida",
    (nominalizacao) => {
      const findings = nomFindings(`É preciso fazer a ${nominalizacao}.`);
      expect(findings).toHaveLength(1);
    },
  );
});

describe("nominalizationPass — palavras não cadastradas", () => {
  it.each(["formação", "administração", "operação", "edição", "condução", "bolo", "presente", "tempo"])(
    "'%s' não é reconhecida (fora do dataset)",
    (palavra) => {
      expect(nomFindings(`É preciso fazer a ${palavra}.`)).toEqual([]);
    },
  );
});

describe("nominalizationPass — verbo leve usado lexicalmente", () => {
  it.each(["Fazer o bolo é fácil.", "Dar um presente é gentil.", "É preciso ter tempo."])(
    "'%s' não gera finding (objeto não é nominalização cadastrada)",
    (text) => {
      expect(nomFindings(text)).toEqual([]);
    },
  );

  it("nominalização sem determinante não casa (nenhuma exceção documentada nesta etapa)", () => {
    expect(nomFindings("É preciso fazer análise de documentos.")).toEqual([]);
  });
});

describe("nominalizationPass — nominalização sem verbo leve", () => {
  it.each(["A análise foi publicada ontem.", "O pagamento venceu ontem."])(
    "'%s' não gera finding",
    (text) => {
      expect(nomFindings(text)).toEqual([]);
    },
  );
});

describe("nominalizationPass — modificador entre determinante e nominalização", () => {
  it("adjetivo entre determinante e nominalização impede o casamento do núcleo", () => {
    expect(nomFindings("É preciso fazer a boa análise.")).toEqual([]);
  });

  it("possessivo entre determinante e nominalização impede o casamento do núcleo", () => {
    expect(nomFindings("É preciso fazer a nossa análise.")).toEqual([]);
  });
});

describe("nominalizationPass — span cobre sempre o núcleo de 3 tokens", () => {
  it.each([
    ["É preciso fazer a análise de documentos.", "fazer a análise"],
    ["O comitê fez a análise ontem.", "fez a análise"],
    ["É preciso fazer a análise e a revisão dos dados.", "fazer a análise"],
    ["É preciso realizar uma análise cuidadosa dos documentos.", "realizar uma análise"],
  ])("'%s' → span '%s' (o complemento é do autor, não do finding)", (text, esperado) => {
    const doc = buildDocument(text);
    const findings = nominalizationPass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });

    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe(esperado);
    expect(doc.source.slice(findings[0].span.start, findings[0].span.end)).toBe(findings[0].span.text);
  });
});

describe("nominalizationPass — múltiplos findings", () => {
  it("detecta construções em frases diferentes", () => {
    const text = "É preciso fazer a análise de documentos. Depois, realizar o pagamento da taxa.";
    const findings = nomFindings(text);
    expect(findings).toHaveLength(2);
    expect(findings[0].meta).toMatchObject({ baseVerb: "analisar" });
    expect(findings[1].meta).toMatchObject({ baseVerb: "pagar" });
  });

  it("detecta duas construções na mesma frase", () => {
    const text = "Convém fazer a análise, mas também realizar a verificação.";
    const findings = nomFindings(text);
    expect(findings).toHaveLength(2);
  });
});

describe("nominalizationPass — config.nominalization", () => {
  it("enabled:false desliga o pass inteiro", () => {
    const config: Config = { ...DEFAULT_CONFIG, nominalization: { enabled: false } };
    expect(nomFindings("É preciso fazer a análise de documentos.", config)).toEqual([]);
  });
});

describe("nominalizationPass — determinismo byte-idêntico", () => {
  it("mesma entrada produz sempre o mesmo JSON", () => {
    const text =
      "É preciso fazer a análise de documentos. O comitê fez a análise ontem. " +
      "Convém promover a revisão dos autos, mas também realizar o pagamento da taxa.";

    const r1 = JSON.stringify(nomFindings(text));
    const r2 = JSON.stringify(nomFindings(text));
    const r3 = JSON.stringify(nominalizationPass.run(ctxFor(text)));

    expect(r2).toBe(r1);
    expect(r3).toBe(r1);
  });
});

describe("nominalizationPass — integração pelo registry e por analyze()", () => {
  it("o pass está registrado em PASSES", () => {
    expect(PASSES).toContain(nominalizationPass);
    expect(PASSES).toContain(sentenceLengthPass);
    expect(PASSES).toContain(passiveVoicePass);
  });

  it("analyze() inclui findings de nominalização, corretamente ordenados", () => {
    const text = "É preciso fazer a análise de documentos. O comitê fez a análise ontem.";
    const diagnostic = analyze(text);

    const nominalizations = diagnostic.findings.filter((f) => f.criterion === "nominalization");
    expect(nominalizations).toHaveLength(2);
    expect(nominalizations[0].normativeReference?.section).toBe("5.3.3");
    expect(nominalizations[0].category).toBe("syntactic");
  });

  it("analyze().score.byCriterion inclui uma entrada para nominalization", () => {
    const diagnostic = analyze("É preciso fazer a análise de documentos.");
    const entry = diagnostic.score.byCriterion.find((c) => c.criterion === "nominalization");

    expect(entry).toBeDefined();
    expect(entry?.count.warning).toBe(1);
  });
});
