import type { ClauseStatus, CoverageReport, Severity } from "@/lucid";
import type { AuditedFile, ImportNotes } from "./audit";
import { SEVERITY_ORDER } from "./audit";

const SEVERITY_LABEL: Record<Severity, string> = {
  info: "observação",
  warning: "atenção",
  error: "prioritário",
};

const CAVEAT_MEASURES = "A auditoria mede, não aprova: ausência de achados não é atestado de clareza.";
const CAVEAT_CURATED =
  "Critérios de léxico consultam listas curadas — contagem zero significa que nada da lista casou, não que o fenômeno não existe.";

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function summaryLine(file: AuditedFile): string {
  const total = file.findings.length;
  if (total === 0) return `${file.name}: nenhum achado`;
  const parts = SEVERITY_ORDER.filter((s) => file.counts[s] > 0)
    .reverse()
    .map((s) => `${file.counts[s]} ${SEVERITY_LABEL[s]}`);
  return `${file.name}: ${total} ${plural(total, "achado", "achados")} (${parts.join(", ")})`;
}

function importLines(file: AuditedFile): string[] {
  const notes = file.importNotes;
  if (notes === null) return [];

  if (notes.format === "pdf") return pdfImportLines(file.name, notes);

  const out: string[] = [];
  if (notes.headingStylesRecovered.length > 0) {
    out.push(
      `${file.name}: títulos reconstruídos a partir do nível de estrutura que o próprio arquivo declara — ` +
        `${notes.headingStylesRecovered.join(", ")}.`,
    );
  }
  const flattened: string[] = [];
  if (notes.tablesFlattened > 0) {
    flattened.push(`${notes.tablesFlattened} ${plural(notes.tablesFlattened, "tabela", "tabelas")}`);
  }
  if (notes.textBoxesInlined > 0) {
    flattened.push(`${notes.textBoxesInlined} ${plural(notes.textBoxesInlined, "caixa de texto", "caixas de texto")}`);
  }
  if (flattened.length > 0) {
    out.push(
      `${file.name}: ${flattened.join(" e ")} ${plural(flattened.length, "foi achatada", "foram achatadas")} em parágrafos — ` +
        "o conteúdo entra na auditoria, a disposição não. Célula e prosa são medidas com a mesma régua.",
    );
  }
  return out;
}

function pdfImportLines(name: string, notes: Extract<ImportNotes, { format: "pdf" }>): string[] {
  const out: string[] = [];
  const did: string[] = [];

  if (notes.ruledRegions > 0) {
    did.push(
      `${notes.ruledRegions} ${plural(notes.ruledRegions, "região desenhada como grade foi lida", "regiões desenhadas como grade foram lidas")} como texto corrido`,
    );
  }
  const furniture = notes.removedHeaders + notes.removedFooters + notes.removedPageNumbers;
  if (furniture > 0) {
    did.push(
      `${furniture} ${plural(furniture, "linha repetida de cabeçalho, rodapé ou número de página ficou", "linhas repetidas de cabeçalho, rodapé ou número de página ficaram")} fora da auditoria`,
    );
  }
  if (notes.dehyphenated > 0) {
    did.push(
      `${notes.dehyphenated} ${plural(notes.dehyphenated, "palavra foi remontada", "palavras foram remontadas")} de quebra de linha`,
    );
  }

  out.push(`${name}: ${notes.pages} ${plural(notes.pages, "página lida", "páginas lidas")}.`);
  if (did.length > 0) out.push(`${name}: ${did.join("; ")}.`);
  out.push(
    `${name}: um PDF não declara título nem lista — tudo entra como parágrafo, e os critérios de ` +
      "estrutura ficam sem objeto.",
  );

  return out;
}

const MISSING_LABEL: Record<string, string> = { heading: "títulos", list: "listas" };

export function missingPhrase(kinds: readonly string[]): string {
  const labels = kinds.map((kind) => MISSING_LABEL[kind] ?? kind);
  return labels.length <= 1 ? (labels[0] ?? "") : `${labels.slice(0, -1).join(", ")} nem ${labels[labels.length - 1]}`;
}

function silenceLines(file: AuditedFile): string[] {
  if (file.silent.length === 0) return [];
  const n = file.silent.length;
  return [
    `${file.name}: não encontramos ${missingPhrase(file.missingBlockKinds)} neste documento. Por isso, ${n} ` +
      `${plural(n, "critério não pôde", "critérios não puderam")} ser ${plural(n, "avaliado", "avaliados")}.`,
    `  ${file.silent.join(", ")}`,
    "  Para incluí-los na auditoria, use um .docx com essa estrutura ou marcadores no texto (# título, - item).",
  ];
}

export function renderText(files: readonly AuditedFile[], quiet: boolean): string {
  const out: string[] = [];

  for (const file of files) {
    out.push(...importLines(file));
    out.push(...silenceLines(file));
    out.push(summaryLine(file));

    if (!quiet) {
      file.findings.forEach((finding, i) => {
        const { line, column } = file.positions[i];
        const section = finding.normativeReference ? ` · ISO ${finding.normativeReference.section}` : "";
        const human = finding.requiresHuman ? " · exige decisão humana" : "";
        out.push(`  ${line}:${column}  ${SEVERITY_LABEL[finding.severity]}  ${finding.criterion}${section}${human}`);
        out.push(`      "${truncate(collapse(finding.span.text), 72)}"`);
        out.push(`      ${collapse(finding.justification)}`);
        if (finding.suggestion !== undefined) out.push(`      equivalente curado: "${finding.suggestion}"`);
      });
      const flesch = file.diagnostic.metrics.fleschPt;
      out.push(
        `  ${file.diagnostic.metrics.words} palavras · ${file.diagnostic.metrics.sentences} frases · Flesch-PT ${
          flesch === null ? "não medido" : flesch.toFixed(1)
        }`,
      );
    }
    out.push("");
  }

  if (files.length > 1) {
    const total = files.reduce((n, f) => n + f.findings.length, 0);
    out.push(`${files.length} arquivos · ${total} ${plural(total, "achado", "achados")}`);
    out.push("");
  }

  out.push(CAVEAT_MEASURES);
  out.push(CAVEAT_CURATED);
  return out.join("\n");
}

export function renderJson(files: readonly AuditedFile[]): string {
  const first = files[0]?.diagnostic.meta;
  const payload = {
    tool: "lucid",
    schemaVersion: 1,
    engine: first === undefined ? null : first,
    caveats: [CAVEAT_MEASURES, CAVEAT_CURATED],
    files: files.map((file) => ({
      name: file.name,
      counts: file.counts,
      totalFindings: file.findings.length,
      criteriaWithoutObject: file.silent,
      import: file.importNotes,
      metrics: file.diagnostic.metrics,
      score: file.diagnostic.score,
      findings: file.findings.map((finding, i) => ({
        criterion: finding.criterion,
        category: finding.category,
        severity: finding.severity,
        source: finding.source,
        principleGroup: finding.principleGroup,
        normativeReference: finding.normativeReference ?? null,
        requiresHuman: finding.requiresHuman,
        suggestion: finding.suggestion ?? null,
        justification: finding.justification,
        span: { start: finding.span.start, end: finding.span.end, text: finding.span.text },
        position: file.positions[i],
      })),
    })),
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

const STATUS_LABEL: Record<ClauseStatus, string> = {
  detected: "com detector",
  partial: "parcial",
  unbuilt: "não construído",
  out_of_reach: "fora de alcance",
  unreachable: "sem objeto aqui",
};

const CAVEAT_NO_SHARE =
  "Nenhum percentual de cobertura é publicado — sem árvore completa não há denominador, e um percentual sobre denominador desconhecido seria número inventado.";
const CAVEAT_OUT_OF_REACH =
  "«fora de alcance» não é pendência: é cláusula que nenhum detector futuro resolve, porque não se verifica a partir do texto.";

export function renderCoverage(report: CoverageReport, quiet: boolean): string {
  const out: string[] = [];
  out.push(`Cobertura por cláusula — ${report.standard}`);
  out.push("");

  for (const clause of report.clauses) {
    const depth = clause.parent === null ? 0 : 2;
    const derived = clause.derived ? " (derivada das subcláusulas)" : "";
    const provisional = clause.provisional ? " · título provisório" : "";
    out.push(
      `${" ".repeat(depth)}${clause.section.padEnd(7 - depth)} ${STATUS_LABEL[clause.status].padEnd(15)} ${clause.title}${derived}${provisional}`,
    );

    if (quiet) continue;

    if (clause.criteria.length > 0) {
      out.push(`${" ".repeat(depth + 8)}detectores: ${clause.criteria.join(", ")}`);
    }
    if (clause.instruments.length > 0) {
      out.push(`${" ".repeat(depth + 8)}instrumentos: ${clause.instruments.join(", ")}`);
    }
    if (clause.reason) {
      out.push(`${" ".repeat(depth + 8)}${collapse(clause.reason)}`);
    }
  }

  out.push("");
  out.push(
    `${report.byStatus.detected} com detector · ${report.byStatus.partial} parcial · ` +
      `${report.byStatus.unbuilt} não construído · ${report.byStatus.out_of_reach} fora de alcance`,
  );

  if (report.outsideStandard.length > 0) {
    out.push("");
    out.push(`Fora da norma (${report.outsideStandard.length}) — nenhum recebe número de cláusula:`);
    for (const entry of report.outsideStandard) {
      out.push(`  ${entry.criterion.padEnd(28)} ${entry.source}`);
    }
  }

  out.push("");
  out.push(`  ${collapse(report.transcription)}`);
  out.push(`  ${CAVEAT_NO_SHARE}`);
  out.push(`  ${CAVEAT_OUT_OF_REACH}`);

  return out.join("\n");
}
