import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { RawBlock } from "@/lucid";
import { blocksToDocx } from "../src/exporters/docx";

const BIN = path.resolve("dist/cli/lucid.mjs");
const JURIDIQUES =
  "Foi realizada a análise do documento pela comissão competente em sede de procedimento administrativo.\n";

let workspace: string;

interface Run {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

function lucid(args: readonly string[], input?: string): Run {
  const result = spawnSync(process.execPath, [BIN, ...args], { input, encoding: "utf8" });
  return { status: result.status ?? -1, stdout: result.stdout, stderr: result.stderr };
}

beforeAll(() => {
  execFileSync("npm", ["run", "build:cli", "--silent"], { stdio: "pipe" });
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), "lucid-cli-"));
  fs.writeFileSync(path.join(workspace, "juridiques.txt"), JURIDIQUES);
  fs.writeFileSync(path.join(workspace, "limpo.md"), "O prazo acaba hoje.\n");
  const blocks: RawBlock[] = [
    { kind: "heading", level: 1, text: "Prazos" },
    { kind: "paragraph", text: JURIDIQUES.trim() },
  ];
  fs.writeFileSync(path.join(workspace, "oficio.docx"), blocksToDocx(blocks));
}, 120_000);

describe("lucid CLI — the built binary", () => {
  it("audits a text file and exits 0", () => {
    const run = lucid([path.join(workspace, "juridiques.txt"), "--quiet"]);
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("achados");
    expect(run.stdout).toContain("mede, não aprova");
  });

  it("reads the document from standard input", () => {
    const run = lucid(["-", "--quiet"], JURIDIQUES);
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("<stdin>");
  });

  it("audits a .docx through the project's own importer", () => {
    const run = lucid([path.join(workspace, "oficio.docx"), "--format", "json"]);
    expect(run.status).toBe(0);
    const payload = JSON.parse(run.stdout);
    expect(payload.files[0].totalFindings).toBeGreaterThan(0);
  });

  it("audits several files in one run", () => {
    const run = lucid([path.join(workspace, "juridiques.txt"), path.join(workspace, "limpo.md"), "--quiet"]);
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("2 arquivos");
  });

  it("emits JSON with no timestamp and a stable schema", () => {
    const run = lucid([path.join(workspace, "juridiques.txt"), "--format", "json"]);
    const payload = JSON.parse(run.stdout);
    expect(payload).toMatchObject({ tool: "lucid", schemaVersion: 1 });
    expect(run.stdout).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("is byte-identical across runs", () => {
    const args = [path.join(workspace, "juridiques.txt"), "--format", "json"];
    expect(lucid(args).stdout).toBe(lucid(args).stdout);
  });
});

describe("lucid CLI — exit codes", () => {
  it("exits 0 when no threshold was declared, however many findings there are", () => {
    expect(lucid([path.join(workspace, "juridiques.txt"), "--quiet"]).status).toBe(0);
  });

  it("exits 2 only when the declared threshold is crossed", () => {
    const file = path.join(workspace, "juridiques.txt");
    expect(lucid([file, "--quiet", "--fail-on", "warning"]).status).toBe(2);
    expect(lucid([file, "--quiet", "--fail-on", "error"]).status).toBe(0);
  });

  it("exits 0 on a clean file even with the strictest threshold", () => {
    expect(lucid([path.join(workspace, "limpo.md"), "--quiet", "--fail-on", "info"]).status).toBe(0);
  });

  it("exits 1 when the file cannot be read", () => {
    const run = lucid([path.join(workspace, "nao-existe.txt")]);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("não foi possível auditar");
  });

  it("exits 1 on an invalid option and says which", () => {
    const run = lucid(["--format", "xml", "a.txt"]);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("formato desconhecido");
  });

  it("exits 1 with the help text when no file is given", () => {
    const run = lucid([]);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("nenhum arquivo informado");
  });

  it("rejects an unsupported extension instead of guessing", () => {
    const rtf = path.join(workspace, "documento.rtf");
    fs.writeFileSync(rtf, "nao importa");
    expect(lucid([rtf]).status).toBe(1);
    expect(lucid([rtf]).stderr).toContain("extensão não suportada");
  });

  it("refuses a .pdf it cannot open, rather than auditing the bytes as text", () => {
    const broken = path.join(workspace, "quebrado.pdf");
    fs.writeFileSync(broken, "isto não é um PDF");
    expect(lucid([broken]).status).toBe(1);
    expect(lucid([broken]).stderr).toContain("não foi possível ler o arquivo");
  });
});

describe("lucid CLI — help and version", () => {
  it("prints the help and exits 0", () => {
    const run = lucid(["--help"]);
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("CÓDIGOS DE SAÍDA");
    expect(run.stdout).toContain("NÃO que o texto foi aprovado");
  });

  it("stamps engine, locale, standard and data hashes", () => {
    const run = lucid(["--version"]);
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("ABNT NBR ISO 24495-1");
    expect(run.stdout).toMatch(/config [0-9a-f]{8}/);
  });
});
