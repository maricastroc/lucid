import { describe, expect, it } from "vitest";

import { buildPrompt, locate, parseResponse } from "../../scripts/corpus/lib/labeler";
import { criterionById } from "../../scripts/corpus/lib/criteria";
import { parseRobots, pathAllowed } from "../../scripts/corpus/lib/http";
import { decodeEntities, htmlToText } from "../../scripts/corpus/lib/extract";

describe("prompt do rotulador", () => {
  const prompt = buildPrompt(criterionById("sigla_sem_expansao"), "O ofício foi enviado à SEFAZ ontem.");

  it("carrega o trecho e a definição", () => {
    expect(prompt).toContain("O ofício foi enviado à SEFAZ ontem.");
    expect(prompt).toContain("NÃO marque");
  });

  it("pede substring literal, não deslocamento", () => {
    expect(prompt).toContain("substring EXATA");
    expect(prompt).not.toMatch(/\bstart\b|\bindice\b|\bíndice\b/i);
  });

  it("ensina que confiança baixa é o resultado desejado na dúvida", () => {
    expect(prompt).toContain("não é erro seu");
  });
});

describe("parseResponse", () => {
  it("lê a forma pedida", () => {
    expect(parseResponse('{"ocorrencias":[{"trecho":"SEFAZ"}],"confianca":"alta"}')).toEqual({
      trechos: ["SEFAZ"],
      confidence: "alta",
    });
  });

  it("tolera cerca de código", () => {
    const parsed = parseResponse('```json\n{"ocorrencias":[],"confianca":"baixa"}\n```');
    expect(parsed).toEqual({ trechos: [], confidence: "baixa" });
  });

  it("aceita lista de strings simples", () => {
    expect(parseResponse('{"ocorrencias":["CGU"],"confianca":"alta"}')?.trechos).toEqual(["CGU"]);
  });

  it("trata confiança ausente como alta e desconhecida como alta", () => {
    expect(parseResponse('{"ocorrencias":[]}')?.confidence).toBe("alta");
  });

  it("devolve null quando não é JSON", () => {
    expect(parseResponse("não sei responder")).toBeNull();
    expect(parseResponse('{"ocorrencias": "não é lista"}')).toBeNull();
  });
});

describe("locate", () => {
  const passage = "O ofício da SEFAZ foi enviado à SEFAZ e à CGU.";

  it("localiza ocorrência única", () => {
    expect(locate(passage, ["CGU"]).occurrences).toEqual([{ start: 42, end: 45, text: "CGU" }]);
  });

  it("atribui repetição em sequência, sem sobrepor", () => {
    const { occurrences } = locate(passage, ["SEFAZ", "SEFAZ"]);
    expect(occurrences.map((occurrence) => occurrence.start)).toEqual([12, 32]);
  });

  it("reprova trecho que o modelo inventou", () => {
    const { unresolved } = locate(passage, ["MINISTÉRIO"]);
    expect(unresolved).toEqual(["MINISTÉRIO"]);
  });

  it("devolve as ocorrências ordenadas por posição", () => {
    const { occurrences } = locate(passage, ["CGU", "SEFAZ"]);
    expect(occurrences[0].text).toBe("SEFAZ");
  });
});

describe("robots.txt", () => {
  const body = ["User-agent: *", "Disallow: /privado", "Allow: /privado/publico", "", "User-agent: outro", "Disallow: /"].join("\n");

  it("usa o grupo do agente ou o coringa", () => {
    const rules = parseRobots(body, "lucid-corpus/1.0");
    expect(rules.disallow).toContain("/privado");
  });

  it("bloqueia caminho proibido", () => {
    expect(pathAllowed("/privado/x", parseRobots(body, "lucid-corpus/1.0"))).toBe(false);
  });

  it("allow mais específico vence o disallow", () => {
    expect(pathAllowed("/privado/publico/a", parseRobots(body, "lucid-corpus/1.0"))).toBe(true);
  });

  it("libera caminho não mencionado", () => {
    expect(pathAllowed("/ccivil_03/leis/L123.htm", parseRobots(body, "lucid-corpus/1.0"))).toBe(true);
  });

  it("respeita o grupo específico de outro agente sem herdá-lo", () => {
    const rules = parseRobots(body, "outro/1.0");
    expect(rules.disallow).toEqual(["/"]);
  });
});

describe("extração de HTML", () => {
  it("vira texto com um bloco por parágrafo", () => {
    expect(htmlToText("<p>Art. 1º</p><p>Art. 2º</p>")).toBe("Art. 1º\n\nArt. 2º");
  });

  it("descarta script e style", () => {
    expect(htmlToText("<style>p{color:red}</style><p>texto</p>")).toBe("texto");
  });

  it("decodifica entidades comuns em ato oficial", () => {
    expect(decodeEntities("Art. 5&ordm; &amp; par&#225;grafo")).toBe("Art. 5º & parágrafo");
  });

  it("colapsa espaço sem colar palavras", () => {
    expect(htmlToText("<p>a    b</p>")).toBe("a b");
  });
});
