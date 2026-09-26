import { isCriterionId, type CriterionId } from "@/locales/pt-BR";

export type OutputFormat = "text" | "json";
export type FailOn = "never" | "info" | "warning" | "error";

export interface CliOptions {
  readonly paths: readonly string[];
  readonly format: OutputFormat;
  readonly failOn: FailOn;
  readonly criteria: readonly CriterionId[];
  readonly quiet: boolean;
  readonly coverage: boolean;
  readonly help: boolean;
  readonly version: boolean;
}

export type ParseResult =
  { readonly ok: true; readonly options: CliOptions } | { readonly ok: false; readonly error: string };

const FORMATS: readonly OutputFormat[] = ["text", "json"];
const FAIL_ON: readonly FailOn[] = ["never", "info", "warning", "error"];

export function parseArgs(argv: readonly string[]): ParseResult {
  const paths: string[] = [];
  const criteria: CriterionId[] = [];
  let format: OutputFormat = "text";
  let failOn: FailOn = "never";
  let quiet = false;
  let coverage = false;
  let help = false;
  let version = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg === "--version" || arg === "-v") {
      version = true;
      continue;
    }
    if (arg === "--quiet" || arg === "-q") {
      quiet = true;
      continue;
    }
    if (arg === "--coverage") {
      coverage = true;
      continue;
    }
    if (arg === "--format" || arg === "--fail-on" || arg === "--criterion") {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("-")) return { ok: false, error: `${arg} exige um valor` };
      i++;
      if (arg === "--format") {
        if (!(FORMATS as readonly string[]).includes(value)) {
          return { ok: false, error: `formato desconhecido: ${value} (use ${FORMATS.join(" ou ")})` };
        }
        format = value as OutputFormat;
        continue;
      }
      if (arg === "--fail-on") {
        if (!(FAIL_ON as readonly string[]).includes(value)) {
          return { ok: false, error: `gravidade desconhecida: ${value} (use ${FAIL_ON.join(", ")})` };
        }
        failOn = value as FailOn;
        continue;
      }
      if (!isCriterionId(value)) return { ok: false, error: `critério desconhecido: ${value}` };
      if (!criteria.includes(value)) criteria.push(value);
      continue;
    }
    if (arg.startsWith("-") && arg !== "-")
      return { ok: false, error: `opção desconhecida: ${arg} (veja lucid --help)` };

    paths.push(arg);
  }

  return { ok: true, options: { paths, format, failOn, criteria, quiet, coverage, help, version } };
}

export const HELP = `Lucid · auditor textual determinístico
  Cada apontamento cita o critério e a fonte que o fundamenta (ex.: ABNT NBR ISO 24495-1).

USO
  lucid <arquivo...> [opções]
  cat documento.txt | lucid -

  Aceita .txt, .md, .docx e .pdf. Um PDF não declara títulos nem listas: eles
  são inferidos pela numeração e pelo desenho da página. Confira o resultado
  antes de confiar nos critérios de estrutura.

  Analisa em pt-BR. O catálogo en-US é experimental e existe só no Studio;
  esta CLI não tem opção de idioma.

OPÇÕES
  --format text|json     formato da saída (padrão: text)
  --fail-on <gravidade>  never|info|warning|error. Sai com código 2 se houver
                         achado dessa gravidade ou mais grave (padrão: never)
  --criterion <id>       audita só este critério; pode repetir
  -q, --quiet            mostra só o resumo por arquivo
  --coverage             mostra o mapa de cobertura por cláusula da norma e
                         sai, sem auditar arquivos
  -v, --version          versão do Lucid, do perfil e dos dados
  -h, --help             mostra esta ajuda

CÓDIGOS DE SAÍDA
  0  a auditoria terminou
  1  nada foi auditado: opção inválida, arquivo ilegível ou arquivo recusado
     (.docx com alterações rastreadas pendentes; PDF digitalizado, em colunas,
     com palavras grudadas ou que perdeu um número na leitura; arquivo sem
     conteúdo legível)
  2  houve achado na gravidade declarada em --fail-on ou acima

  Sair com 0 significa que a medição terminou, NÃO que o texto foi aprovado.
  O Lucid mede; não atesta clareza. O código 2 só existe quando você declara
  um limite: o corte é seu, nunca do Lucid.

FORMATOS ACEITOS
  .txt  .md  .docx  .pdf  e entrada padrão (-)

A auditoria é determinística e offline: não usa rede nem IA.
A mesma entrada produz sempre a mesma saída, byte a byte.`;
