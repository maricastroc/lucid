import { describe, expect, it } from "vitest";
import { countPii, isValidCnpj, isValidCpf } from "../src/locales/pt-BR/privacy/pii";

const kinds = (text: string) => countPii(text).map((entry) => entry.kind);
const countOf = (text: string, kind: string) => countPii(text).find((e) => e.kind === kind)?.count ?? 0;

describe("CPF and CNPJ are accepted by their check digits, never by their shape", () => {
  it("accepts valid numbers, punctuated or bare", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11222333000181")).toBe(true);
  });

  it("rejects a number with the right shape and the wrong check digits", () => {
    expect(isValidCpf("529.982.247-26")).toBe(false);
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
  });

  it("rejects repeated digits, which pass the arithmetic but are not documents", () => {
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCnpj("11.111.111/1111-11")).toBe(false);
  });

  it("rejects the wrong length", () => {
    expect(isValidCpf("5299822472")).toBe(false);
    expect(isValidCnpj("1122233300018")).toBe(false);
  });
});

describe("counting over the kind of document Lucid actually audits", () => {
  it("finds nothing in an administrative text without personal data", () => {
    expect(countPii("O prazo termina em 30/04/2025. O valor é de R$ 1.234,56, conforme o item 3.2.1.")).toEqual([]);
  });

  it("does not mistake a process number for a document", () => {
    expect(kinds("Processo 0801234-56.2025.8.06.0001, protocolo 123.456.789-00 inválido.")).toEqual([]);
  });

  it("does not mistake a date or an amount for a document", () => {
    expect(countPii("Pagamento de R$ 529.982.247,25 em 12/03/2025.")).toEqual([]);
  });

  it("names each kind it found, with a count", () => {
    const text =
      "O requerente, CPF 529.982.247-25, e a empresa 11.222.333/0001-81 devem escrever para " +
      "atendimento@exemplo.gov.br ou ouvidoria@exemplo.gov.br.";

    expect(countPii(text)).toEqual([
      { kind: "cpf", count: 1 },
      { kind: "cnpj", count: 1 },
      { kind: "email", count: 2 },
    ]);
  });

  it("counts a repeated document once per occurrence", () => {
    expect(countOf("CPF 529.982.247-25 e novamente 529.982.247-25.", "cpf")).toBe(2);
  });

  it("finds a document that ends the sentence — the period is not part of the number", () => {
    expect(countOf("O requerente informou o CPF 529.982.247-25.", "cpf")).toBe(1);
    expect(countOf("Inscrição da empresa: 11.222.333/0001-81.", "cnpj")).toBe(1);
  });

  it("still refuses to read a document out of a longer number", () => {
    expect(countPii("Código 9529.982.247-250 do sistema.")).toEqual([]);
  });

  it("does not read a CPF out of the middle of a CNPJ", () => {
    expect(countPii("Inscrição 11.222.333/0001-81 apenas.")).toEqual([{ kind: "cnpj", count: 1 }]);
  });

  it("never returns the value it matched — only the kind and how many", () => {
    const result = countPii("CPF 529.982.247-25 e e-mail alguem@exemplo.gov.br.");
    expect(JSON.stringify(result)).not.toContain("529");
    expect(JSON.stringify(result)).not.toContain("alguem");
  });
});

describe("e-mail", () => {
  it("accepts an ordinary address and a subdomain", () => {
    expect(kinds("escreva para maria.alves+auxilio@sub.exemplo.gov.br")).toEqual(["email"]);
  });

  it("does not fire on an at-sign that is not an address", () => {
    expect(countPii("cite @fulano na rede, ou pague R$ 10 @ unidade")).toEqual([]);
  });
});
