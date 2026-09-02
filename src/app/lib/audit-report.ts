import {
  configDeviations,
  type BriefingCheck,
  type Config,
  type Diagnostic,
  type Finding,
  type ReaderBriefing,
  type Severity,
} from "@/lucid";
import { describeDeviation, disabledCriteria } from "./profile";
import {
  CRITERION_ORDER,
  coverageLabel,
  coverageOf,
  isSafe,
  metaFor,
  principleGroupLabel,
  provenanceLabel,
  severityRank,
  SEVERITY_LABEL,
} from "./criteria";
import { revisionBalance } from "./attribution";
import { adjustmentsOver, PROFILE_VERSION, profileHash, type ProfileId } from "./profiles";
import { renderLedgerMarkdown, type LedgerEntry } from "./ledger";
import { keptPoints, type ReviewMarks } from "./review-marks";
import type { BaselineComparison, StampField } from "./baseline";
import { readabilityOf } from "./readability";

export interface AuditReportMeta {
  generatedAt: string;
  documentTitle?: string;
}

export interface BriefingReport {
  briefing: ReaderBriefing;
  check: BriefingCheck;
}

const fmtNum = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);
const collapse = (text: string): string => text.replace(/\s+/g, " ").trim();

function bySeverityThenPosition(a: Finding, b: Finding): number {
  const s = severityRank(b.severity) - severityRank(a.severity);
  return s !== 0 ? s : a.span.start - b.span.start;
}

function renderBriefingMarkdown(briefing: BriefingReport | null): string {
  if (briefing === null || !briefing.check.declared) {
    return [
      "## Princípio 1 — Relevante (5.1)",
      "",
      "**Não declarado.** A norma pede que o autor modele o leitor antes de escrever: quem lê, o que precisa fazer, " +
        "o que entra e o que sai. Nenhuma regra automática decide o que é relevante para um leitor específico — por " +
        "isso este princípio **não tem critério no placar** e **não é dado por cumprido**. A ausência aqui é ausência " +
        "de declaração, não conformidade.",
      "",
    ].join("\n");
  }

  const { briefing: declared, check } = briefing;
  const out: string[] = ["## Princípio 1 — Relevante (5.1)", ""];
  out.push("_Briefing declarado pelo autor. É registro de decisão humana, não medição da ferramenta._");
  out.push("");
  if (declared.audience.trim() !== "") out.push(`- **Quem é o leitor:** ${collapse(declared.audience)}`);
  if (declared.purpose.trim() !== "")
    out.push(`- **O que precisa fazer depois de ler:** ${collapse(declared.purpose)}`);
  if (declared.priorKnowledge.trim() !== "") out.push(`- **O que já sabe:** ${collapse(declared.priorKnowledge)}`);
  out.push("");

  if (check.coverage.length > 0) {
    out.push("### O que o leitor precisa encontrar");
    out.push("");
    for (const item of check.coverage) {
      const found = item.occurrences.length > 0;
      out.push(
        `- ${found ? "✓" : "✗"} “${item.expression}” — ${found ? `aparece ${item.occurrences.length}×` : "não aparece com essas palavras"}`,
      );
    }
    out.push("");
    out.push(
      "_Busca literal, sensível a acento. Encontrar não prova que o leitor vai entender; não encontrar não prova que o " +
        "assunto está ausente — pode estar dito com outras palavras. Esta lista é do autor e não entra no placar._",
    );
    out.push("");
  }

  return out.join("\n");
}

const PRESET_PT: Record<ProfileId, string> = {
  base: "Padrão",
  normativo: "Normativo ou contratual",
  publico: "Cartilha e comunicado ao cidadão",
  digital: "Página de serviço e conteúdo web",
};

const PRESET_LIMIT_PT: Record<ProfileId, string> = {
  base: "Comparável a qualquer outro placar padrão.",
  normativo:
    "Um placar deste perfil não é comparável a um padrão nem aos demais: o mesmo texto tem menos frases longas aqui porque o limite é outro.",
  publico:
    "Aplicado a texto jurídico, este perfil aponta quase toda frase — é o perfil errado para aquele documento, não um defeito do texto.",
  digital: "Aplicado a texto sem títulos nem listas, quatro critérios ficam sem objeto e o placar cala sobre eles.",
};

function renderProfileMarkdown(config: Config | null, profileId: ProfileId | null): string {
  if (config === null) return "";
  const preset = profileId ?? "base";
  const adjustments = adjustmentsOver(config, preset);
  const deviations = configDeviations(config);
  if (adjustments.length === 0 && preset === "base") return "";

  const off = disabledCriteria(config);
  const out: string[] = ["## Perfil editorial", ""];
  out.push(`**Finalidade declarada:** ${PRESET_PT[preset]} · versão ${PROFILE_VERSION} · \`${profileHash(preset)}\``);
  out.push("");
  out.push(PRESET_LIMIT_PT[preset]);
  out.push("");
  if (adjustments.length === 0) {
    out.push("_Os limiares são exatamente os do perfil, sem ajuste manual._");
    out.push("");
    return out.join("\n");
  }
  out.push(
    `Esta auditoria **não** rodou com os limiares padrão do Lucid. ${deviations.length} ` +
      `${deviations.length === 1 ? "ajuste foi declarado" : "ajustes foram declarados"} por quem auditou:`,
  );
  out.push("");
  for (const deviation of deviations) out.push(`- ${describeDeviation(deviation)}`);
  out.push("");
  if (off.length > 0) {
    out.push(
      `> **${off.length} ${off.length === 1 ? "critério foi desligado" : "critérios foram desligados"}** ` +
        `(${off.join(", ")}). Onde eles calam, o silêncio significa **"não procurei"**, não "não encontrei". ` +
        "Um placar produzido com critérios desligados não é comparável a um placar padrão.",
    );
    out.push("");
  }
  out.push(
    "_A norma não fixa números; o limiar é escolha editorial. O perfil carimbado no cabeçalho identifica " +
      "exatamente estes ajustes._",
  );
  out.push("");
  return out.join("\n");
}

const DIRECTION_PT: Record<string, string> = {
  improved: "melhorou",
  regressed: "piorou",
  unchanged: "sem mudança",
};

function renderBalanceMarkdown(before: readonly Finding[] | null, after: readonly Finding[]): string {
  if (before === null) return "";
  const summary = revisionBalance(before, after);
  const moved = summary.byCriterion.filter((row) => row.direction !== "unchanged");
  if (moved.length === 0 && summary.countBefore === summary.countAfter) return "";

  const out: string[] = ["## Antes e depois", ""];
  out.push(
    "Comparação entre o texto de entrada e o texto atual, critério a critério. Diz o que os critérios " +
      "encontram nos dois momentos — não diz se o leitor entendeu, e peso menor não é aprovação.",
  );
  out.push("");
  out.push(
    `**Peso da auditoria:** ${fmtNum(summary.weightBefore)} → ${fmtNum(summary.weightAfter)} · ` +
      `${summary.countBefore} → ${summary.countAfter} ${plural(summary.countAfter, "anotação", "anotações")}.`,
  );
  out.push("");
  out.push("| Critério | Antes | Depois | Peso | |");
  out.push("|---|--:|--:|---|---|");
  for (const row of moved) {
    out.push(
      `| ${metaFor(row.criterion).label} | ${row.before} | ${row.after} | ` +
        `${fmtNum(row.weightBefore)} → ${fmtNum(row.weightAfter)} | ${DIRECTION_PT[row.direction]} |`,
    );
  }
  out.push("");
  return out.join("\n");
}

function renderEntryTextMarkdown(originalText: string | null, hasChanges: boolean): string {
  const out: string[] = ["## Anexo — Texto de entrada", ""];

  if (originalText === null || originalText === "") {
    if (!hasChanges) return "";
    out.push(
      originalText === null
        ? "**Não registrado.** Esta sessão foi salva antes de o Lucid guardar uma cópia do texto de entrada, " +
            "portanto o peso inicial informado acima não pode ser conferido contra o texto de partida."
        : "O documento foi escrito dentro do Lucid: não houve texto de entrada, e o peso inicial informado acima " +
            "corresponde ao primeiro estado analisado.",
    );
    out.push("");
    return out.join("\n");
  }

  out.push(
    hasChanges
      ? "Cópia do documento como ele entrou nesta sessão, para que a variação de peso informada acima possa ser " +
          "conferida contra o ponto de partida. É registro, não proposta: o Lucid não restaura nem aplica nada a " +
          "partir deste anexo."
      : "Cópia do documento como ele entrou nesta sessão. Nenhuma alteração foi registrada, o que não quer dizer " +
          "que o texto atual seja igual a este: edição feita à mão não gera registro. É registro, não proposta — " +
          "o Lucid não restaura nem aplica nada a partir deste anexo.",
  );
  out.push("");
  const fence = "`".repeat(Math.max(3, longestBacktickRun(originalText) + 1));
  out.push(fence);
  out.push(originalText);
  out.push(fence);
  out.push("");
  return out.join("\n");
}

function longestBacktickRun(text: string): number {
  let longest = 0;
  for (const run of text.match(/`+/g) ?? []) longest = Math.max(longest, run.length);
  return longest;
}

const STAMP_PT: Record<StampField, string> = {
  lucidVersion: "versão do Lucid",
  localeId: "idioma",
  configHash: "perfil editorial",
  dataHash: "dados curados",
  standardVersion: "versão da norma",
};

const DECISION_PT: Record<"seen" | "dismissed", string> = {
  seen: "já examinado e mantido",
  dismissed: "já ignorado",
};

function renderBaselineMarkdown(comparison: BaselineComparison | null): string {
  if (comparison === null) return "";

  const out: string[] = ["## Comparação com o ponto de partida", ""];
  out.push(`**${comparison.title}** · ${comparison.savedAt}`);
  out.push("");
  out.push(
    "**A régua é a mesma nos dois lados.** O texto do ponto de partida foi reanalisado com o motor, o perfil e os " +
      "dados carimbados no cabeçalho deste relatório. Nenhum número abaixo compara medições feitas com réguas " +
      "diferentes.",
  );
  out.push("");

  const drift = comparison.rebasedCount - comparison.historicalCount;
  out.push(
    `A auditoria emitida à época registrou ${comparison.historicalCount} ` +
      `${plural(comparison.historicalCount, "anotação", "anotações")}. Reanalisado agora, o mesmo texto dá ` +
      `${comparison.rebasedCount}.`,
  );
  if (drift !== 0) {
    out.push("");
    out.push(
      `${Math.abs(drift)} ${plural(Math.abs(drift), "anotação de diferença vem", "anotações de diferença vêm")} da ` +
        "mudança da régua, não do texto.",
    );
  }
  if (comparison.divergence.length > 0) {
    out.push("");
    out.push(`Mudou na régua desde então: ${comparison.divergence.map((field) => STAMP_PT[field]).join(", ")}.`);
  }
  out.push("");

  const moved = comparison.byCriterion.filter((row) => row.direction !== "unchanged");
  if (moved.length > 0) {
    out.push("| Critério | Ponto de partida | Agora | |");
    out.push("|---|--:|--:|---|");
    for (const row of moved) {
      out.push(`| ${metaFor(row.criterion).label} | ${row.before} | ${row.after} | ${DIRECTION_PT[row.direction]} |`);
    }
    out.push("");
  }

  out.push("### O que você apontou e continua lá");
  out.push("");
  out.push(
    `**${comparison.stillThereCount} ${plural(comparison.stillThereCount, "ponto continua", "pontos continuam")}** ` +
      "no texto com as mesmas palavras.",
  );
  out.push("");
  if (comparison.stillThere.length === 0) {
    out.push("_Nenhum dos trechos apontados antes aparece de novo com as mesmas palavras._");
  } else {
    for (const point of comparison.stillThere) {
      const times = point.count > 1 ? ` · ${point.count}×` : "";
      out.push(`- **${metaFor(point.criterion).label}**${times} — “${collapse(point.excerpt)}”`);
      if (point.decision !== null) {
        const reason = point.decision.note === null ? "sem motivo registrado" : collapse(point.decision.note);
        out.push(`  _${DECISION_PT[point.decision.kind]}: ${reason}_`);
      }
    }
  }
  out.push("");
  out.push(
    "_Esta lista não afirma que algo foi resolvido: ela diz o que sobreviveu. Entre duas versões editadas fora do " +
      "Lucid não é possível dizer qual edição produziu qual mudança, e peso menor não é aprovação._",
  );
  out.push("");
  return out.join("\n");
}

const KIND_PT: Record<"seen" | "dismissed", string> = { seen: "revisado", dismissed: "ignorado" };

function renderDecisionsMarkdown(marks: ReviewMarks, findings: readonly Finding[]): string {
  if (findings.length === 0) return "";
  const kept = keptPoints(marks, findings);
  const unexamined = findings.length - kept.length;
  const withReason = kept.filter((point) => point.note !== null).length;

  const out: string[] = ["## Pontos examinados e mantidos", ""];
  out.push(
    "_Registro de decisão humana, não medição da ferramenta. Marcar um ponto não altera o placar, o resultado " +
      "da auditoria nem qualquer estado de conformidade: os números acima são os mesmos com ou sem esta seção._",
  );
  out.push("");
  out.push(
    kept.length === 0
      ? "**Nenhum ponto foi examinado nesta sessão.** Isto não é atestado sobre o texto nem defeito dele — " +
          "é o estado da revisão, dito em voz alta para que a ausência de registro não passe por revisão feita."
      : `**${kept.length} ${plural(kept.length, "ponto examinado", "pontos examinados")}** e mantidos no texto · ` +
          `${withReason} com motivo registrado.`,
  );
  if (unexamined > 0) {
    out.push("");
    out.push(
      `${unexamined} ${plural(unexamined, "ponto ainda não foi examinado", "pontos ainda não foram examinados")}. ` +
        "Os itens não examinados não são listados aqui: eles já estão em “Anotações”, com a mesma severidade.",
    );
  }
  out.push("");

  for (const point of [...kept].sort((a, b) => bySeverityThenPosition(a.finding, b.finding))) {
    out.push(`**${metaFor(point.finding.criterion).label}** — ${KIND_PT[point.kind]}`);
    out.push("");
    out.push(`> ${collapse(point.finding.span.text)}`);
    out.push("");
    out.push(point.note === null ? "_Sem motivo registrado._" : `**Motivo:** ${collapse(point.note)}`);
    out.push("");
  }
  return out.join("\n");
}

function renderVocabularyMarkdown(config: Config | null, findings: readonly Finding[]): string {
  const terms = config?.vocabulario.terms ?? [];
  if (terms.length === 0) return "";

  const hits = new Map<string, number>();
  for (const f of findings) {
    if (f.criterion !== "vocabulario_da_organizacao") continue;
    const declared = typeof f.meta?.term === "string" ? f.meta.term : f.span.text;
    hits.set(declared, (hits.get(declared) ?? 0) + 1);
  }

  const withPlain = terms.filter((t) => t.plain !== null && t.plain.trim() !== "").length;
  const out: string[] = ["## Vocabulário da organização", ""];
  out.push(
    "Estes termos **não vêm da norma**. Quem declarou que eles não são familiares ao leitor deste " +
      "documento foi a organização. O relatório os mantém separados do glossário curado porque a " +
      "autoridade sobre cada lista é de uma parte diferente, e uma não empresta peso à outra.",
  );
  out.push("");
  out.push(
    `- **${terms.length}** ${plural(terms.length, "termo declarado", "termos declarados")}: ` +
      `${withPlain} com equivalente registrado, ${terms.length - withPlain} apenas sinalizados`,
  );
  out.push(
    `- **${[...hits.values()].reduce((n, v) => n + v, 0)}** ${plural(
      [...hits.values()].reduce((n, v) => n + v, 0),
      "ocorrência encontrada",
      "ocorrências encontradas",
    )} neste texto`,
  );
  out.push("");
  out.push("| Termo | Equivalente registrado | Motivo declarado | Ocorrências |");
  out.push("| --- | --- | --- | --- |");
  for (const term of terms) {
    const plain = term.plain !== null && term.plain.trim() !== "" ? term.plain.trim() : "—";
    const reason = term.reason.trim() === "" ? "—" : term.reason.trim();
    out.push(`| ${cell(term.term)} | ${cell(plain)} | ${cell(reason)} | ${hits.get(term.term) ?? 0} |`);
  }
  out.push("");
  out.push(
    "_Termo sem equivalente registrado é sinalização, não proposta: sem uma troca atestada, sugerir " +
      "uma substituição seria a ferramenta inventar o que a organização não disse._",
  );
  out.push("");

  return out.join("\n");
}

const cell = (text: string): string => text.replace(/\|/g, "\\|").replace(/\n/g, " ");

export function buildAuditReport(
  diagnostic: Diagnostic,
  findings: readonly Finding[],
  meta: AuditReportMeta,
  ledger: readonly LedgerEntry[] = [],
  briefing: BriefingReport | null = null,
  config: Config | null = null,
  originalText: string | null = null,
  originalFindings: readonly Finding[] | null = null,
  profileId: ProfileId | null = null,
  marks: ReviewMarks = {},
  comparison: BaselineComparison | null = null,
): string {
  const m = diagnostic.metrics;
  const engine = diagnostic.meta;
  const total = findings.length;
  const sev: Record<Severity, number> = { info: 0, warning: 0, error: 0 };
  for (const f of findings) sev[f.severity]++;
  const safe = findings.filter(isSafe).length;
  const human = total - safe;

  const out: string[] = [];
  out.push("# Auditoria de Linguagem Simples");
  out.push("");
  out.push(`Análise determinística · ${engine.standardVersion} · Lucid`);
  out.push(`Gerado em ${meta.generatedAt}${meta.documentTitle ? ` · ${meta.documentTitle}` : ""}`);
  out.push(
    `Motor Lucid ${engine.lucidVersion} · perfil \`${engine.configHash}\` · ` +
      `dados \`${engine.dataHash}\` · ${engine.localeId}`,
  );
  out.push("");
  out.push("> **Este relatório mede, não aprova.** A ausência de anotações não é atestado de clareza.");
  out.push(
    "> Dois relatórios só são comparáveis se o motor, o perfil e os dados carimbados acima forem os mesmos: " +
      "limiar diferente ou léxico diferente produzem placar diferente a partir do mesmo texto.",
  );
  out.push(
    "> Legibilidade é sinal de apoio (Princípio 4 da norma), nunca aprovação. O valor não é truncado: " +
      "o número é o calculado, e a faixa de referência é leitura ao lado dele.",
  );
  out.push(
    "> Critérios de léxico (jargão, nominalização, redundância, perífrase, dupla negação, advérbios vagos) checam " +
      "**listas curadas** (precisão > recall): contagem baixa ou zero não prova ausência do fenômeno.",
  );
  out.push("");

  out.push("## Placar");
  out.push("");
  out.push(
    `- **${total}** ${plural(total, "anotação", "anotações")}: ` +
      `${sev.error} ${plural(sev.error, "prioritária", "prioritárias")}, ` +
      `${sev.warning} de atenção, ${sev.info} ${plural(sev.info, "leve", "leves")}`,
  );
  out.push(
    `- **${safe}** de troca direta (equivalente indicado; a aplicação é do autor) · **${human}** de decisão do autor`,
  );
  out.push(
    `- Palavras: ${fmtNum(m.words)} · Frases: ${fmtNum(m.sentences)} · Palavras por frase: ${fmtNum(m.wordsPerSentence)}`,
  );
  const readability = readabilityOf(m);
  out.push(
    readability.measured
      ? `- Legibilidade (Flesch-PT): ${readability.value} — ${readability.qualifier}`
      : `- Legibilidade (Flesch-PT): ${readability.qualifier}`,
  );
  for (const note of readability.notes) {
    out.push(`  - ${note}`);
  }
  out.push("");
  out.push("### Coesão (descritores)");
  out.push("");
  out.push(
    "_Descritores neutros: valor alto ou baixo não é, sozinho, aprovação nem reprovação (coesão alta pode ser " +
      "repetição; baixa pode ser variação). Não entram no placar._",
  );
  const co = m.cohesion;
  out.push(
    `- Coesão referencial (sobreposição entre frases vizinhas): ${fmtNum(co.referentialOverlap)} · ` +
      `pares sem continuidade: ${fmtNum(co.adjacentGapRatio)}`,
  );
  out.push(
    `- Conectivos por 100 palavras: ${fmtNum(co.connectivesPer100Words)} ` +
      `(aditivos ${co.connectivesByClass.additive}, adversativos ${co.connectivesByClass.adversative}, ` +
      `causais ${co.connectivesByClass.causal}, temporais ${co.connectivesByClass.temporal}, ` +
      `conclusivos ${co.connectivesByClass.conclusive})`,
  );
  out.push("");

  const counts = new Map<string, number>();
  for (const f of findings) counts.set(f.criterion, (counts.get(f.criterion) ?? 0) + 1);
  const activeRows = CRITERION_ORDER.filter((c) => (counts.get(c) ?? 0) > 0);
  if (activeRows.length > 0) {
    out.push("## Anotações por critério");
    out.push("");
    out.push("| Critério | Dimensão | Proveniência | Cobertura | Anotações |");
    out.push("|---|---|---|---|--:|");
    for (const c of activeRows) {
      const first = findings.find((f) => f.criterion === c)!;
      out.push(
        `| ${metaFor(c).label} | ${principleGroupLabel(first.principleGroup)} | ${provenanceLabel(first)} | ${coverageLabel(coverageOf(c))} | ${counts.get(c)} |`,
      );
    }
    out.push("");
    out.push(
      "_Cobertura **curada**: o critério compara contra uma lista curada — a contagem é um piso, não um teto. " +
        "Cobertura **produtiva**: regra que casa qualquer ocorrência do padrão._",
    );
    out.push("");
  }

  if (total > 0) {
    out.push("## Anotações");
    out.push("");
    out.push("Ordenadas por severidade (prioritário → leve).");
    out.push("");
    [...findings].sort(bySeverityThenPosition).forEach((f, i) => {
      out.push(
        `### ${i + 1}. ${metaFor(f.criterion).label} — ${SEVERITY_LABEL[f.severity]} · ${principleGroupLabel(f.principleGroup)} · ${provenanceLabel(f)}`,
      );
      out.push("");
      out.push(`> ${collapse(f.span.text)}`);
      out.push("");
      out.push(f.justification);
      if (isSafe(f) && f.suggestion !== undefined) {
        out.push("");
        out.push(
          `**Equivalente direto (curado):** ${f.suggestion} — indicado pela ferramenta; a troca no texto é do autor.`,
        );
      } else if (!f.requiresHuman) {
        out.push("");
        out.push(
          "_Sem troca 1:1 pronta, mas resolvível: a IA pode reescrever e a engine verifica — aplicar é decisão sua._",
        );
      } else {
        out.push("");
        out.push("_Exige decisão humana — a ferramenta aponta, não reescreve por você._");
      }
      out.push("");
    });
  }

  const profileSection = renderProfileMarkdown(config, profileId);
  if (profileSection) {
    out.push(profileSection);
  }

  const vocabularySection = renderVocabularyMarkdown(config, findings);
  if (vocabularySection) {
    out.push(vocabularySection);
  }

  const briefingSection = renderBriefingMarkdown(briefing);
  if (briefingSection) {
    out.push(briefingSection);
  }

  const comparisonSection = renderBaselineMarkdown(comparison);
  if (comparisonSection) {
    out.push(comparisonSection);
  }

  const balance = comparison === null ? renderBalanceMarkdown(originalFindings, findings) : "";
  if (balance) {
    out.push(balance);
  }

  const decisions = renderDecisionsMarkdown(marks, findings);
  if (decisions) {
    out.push(decisions);
  }

  const trail = renderLedgerMarkdown(ledger);
  if (trail) {
    out.push(trail);
  }

  const entryText = renderEntryTextMarkdown(originalText, ledger.length > 0);
  if (entryText) {
    out.push(entryText);
  }

  out.push("---");
  out.push("Gerado pelo Lucid — auditoria determinística (Camada 1, sem IA). Mede, não aprova.");
  out.push("");
  return out.join("\n");
}
