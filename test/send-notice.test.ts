import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { countPii } from "../src/lucid";
import { copyFor } from "../src/app/i18n/copy";

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const importersOf = (symbol: string, root: string): string[] =>
  filesUnder(root)
    .filter((path) => /\.tsx?$/.test(path))
    .filter((path) => new RegExp(`\\b${symbol}\\b`).test(readFileSync(path, "utf8")));

describe("the pre-flight lives only where content actually leaves the machine", () => {
  it("is mounted on the two surfaces that post to a provider, and nowhere else", () => {
    const mounted = importersOf("SendNotice", "src/app").filter((p) => !p.endsWith("send-notice.tsx"));
    expect(mounted.sort()).toEqual([
      "src/app/components/probe-panel.tsx",
      "src/app/components/revision-note/ai-rewrite-panel.tsx",
    ]);
  });

  it("never reaches the CLI, which has no Layer 2 at all", () => {
    expect(importersOf("countPii", "src/cli")).toEqual([]);
    expect(importersOf("SendNotice", "src/cli")).toEqual([]);
  });

  it("is not a criterion: it produces no Finding and cites no clause", () => {
    const source = readFileSync("src/locales/pt-BR/privacy/pii.ts", "utf8");
    expect(source).not.toContain("Finding");
    expect(source).not.toContain("criterion");
    expect(source).not.toContain("normativeReference");
    expect(source).not.toContain("24495");
  });

  it("stays in Layer 1: no network, no framework, no report", () => {
    const source = readFileSync("src/locales/pt-BR/privacy/pii.ts", "utf8");
    expect(source).not.toMatch(/\bfetch\b|\bimport .*(react|next|@\/llm|@\/report)/);
  });
});

describe("what the notice says, in both languages", () => {
  for (const lang of ["pt-BR", "en"] as const) {
    it(`warns that the whole document leaves, every time — ${lang}`, () => {
      const t = copyFor(lang).send;
      expect(t.always).toMatch(lang === "pt-BR" ? /documento/ : /document/);
      expect(t.always).not.toMatch(lang === "pt-BR" ? /\btrecho\b/ : /\bpassage\b|\bexcerpt\b/);
      expect(t.always).toMatch(lang === "pt-BR" ? /serviço externo/ : /external/);
    });

    it(`declares the check is partial, so silence is never read as safety — ${lang}`, () => {
      const t = copyFor(lang).send;
      expect(t.limit).toMatch(lang === "pt-BR" ? /podem não ser detectados/ : /may not be detected/);
      expect(t.limit).toMatch(lang === "pt-BR" ? /outros dados pessoais/ : /other personal data/);
    });

    it(`names each kind with its count — ${lang}`, () => {
      const t = copyFor(lang).send;
      expect(t.kinds.cpf(1)).toContain("1");
      expect(t.kinds.cpf(2)).not.toBe(t.kinds.cpf(1));
      expect(t.found(t.kinds.cnpj(3))).toContain(t.kinds.cnpj(3));
    });
  }
});

describe("what the notice would report on a real document", () => {
  it("stays quiet about kinds when the document has none, and the warning still shows", () => {
    expect(countPii("O prazo termina em 30/04/2025, conforme o item 3.2.1 do edital.")).toEqual([]);
  });

  it("names the categories when they are there", () => {
    const text = "O requerente (CPF 529.982.247-25) deve escrever para atendimento@exemplo.gov.br.";
    const named = countPii(text).map((entry) => copyFor("pt-BR").send.kinds[entry.kind](entry.count));
    expect(named).toEqual(["1 CPF", "1 e-mail"]);
  });
});
