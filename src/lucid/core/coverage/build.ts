import type { Block, BlockKind, CriterionTaxonomy, Document, Pass } from "../types";
import type {
  ClauseCoverage,
  ClauseLimitKind,
  ClauseNode,
  ClauseStatus,
  ClauseTree,
  CoverageReport,
  OutsideStandardCriterion,
} from "./types";

function compareSections(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const l = left[i] ?? -1;
    const r = right[i] ?? -1;
    if (l !== r) return l - r;
  }
  return 0;
}

function indexNodes(tree: ClauseTree): Map<string, ClauseNode> {
  const bySection = new Map<string, ClauseNode>();
  for (const node of tree.nodes) {
    if (bySection.has(node.section)) {
      throw new Error(`cláusula "${node.section}" aparece duas vezes na árvore de ${tree.standard}.`);
    }
    bySection.set(node.section, node);
  }
  return bySection;
}

function assertAcyclicParents(bySection: Map<string, ClauseNode>, standard: string): void {
  for (const node of bySection.values()) {
    const seen = new Set<string>([node.section]);
    let current = node.parent;
    while (current !== null) {
      const parent = bySection.get(current);
      if (!parent) {
        throw new Error(
          `cláusula "${node.section}" declara parent "${current}", que não existe na árvore de ${standard}.`,
        );
      }
      if (seen.has(current)) {
        throw new Error(`ciclo de parent na árvore de ${standard}, passando por "${current}".`);
      }
      seen.add(current);
      current = parent.parent;
    }
  }
}

function criteriaBySection(taxonomy: CriterionTaxonomy): Map<string, string[]> {
  const bySection = new Map<string, string[]>();
  for (const criterion of Object.keys(taxonomy).sort()) {
    const entry = taxonomy[criterion];
    if (entry.source !== "iso-24495-1") continue;
    const section = entry.normativeReference.section;
    const list = bySection.get(section);
    if (list) list.push(criterion);
    else bySection.set(section, [criterion]);
  }
  return bySection;
}

function outsideStandardFrom(taxonomy: CriterionTaxonomy): OutsideStandardCriterion[] {
  return Object.keys(taxonomy)
    .sort()
    .flatMap((criterion) => {
      const entry = taxonomy[criterion];
      return entry.source === "iso-24495-1"
        ? []
        : [{ criterion, source: entry.source, principleGroup: entry.principleGroup }];
    });
}

function rollUp(inputs: readonly ClauseStatus[]): ClauseStatus {
  if (inputs.every((status) => status === "detected")) return "detected";
  if (inputs.some((status) => status === "detected" || status === "partial")) return "partial";
  if (inputs.some((status) => status === "unbuilt")) return "unbuilt";
  return inputs.some((status) => status === "unreachable") ? "unreachable" : "out_of_reach";
}

export interface CoverageOptions {
  readonly passes?: readonly Pass[];
  readonly doc?: Document;
}

export function criteriaWithoutObject(passes: readonly Pass[], blocks: readonly Block[]): string[] {
  const present = new Set(blocks.map((block) => block.kind));
  return passes
    .filter((pass) => {
      const requires = pass.requires ?? [];
      return requires.length > 0 && !requires.some((kind) => present.has(kind));
    })
    .map((pass) => pass.criterion)
    .sort();
}

export function missingBlockKinds(passes: readonly Pass[], blocks: readonly Block[]): BlockKind[] {
  const present = new Set(blocks.map((block) => block.kind));
  const missing = new Set<BlockKind>();
  for (const pass of passes) {
    const requires = pass.requires ?? [];
    if (requires.length === 0) continue;
    if (requires.some((kind) => present.has(kind))) continue;
    for (const kind of requires) missing.add(kind);
  }
  return [...missing].sort();
}

function silentIn(passes: readonly Pass[], doc: Document): Set<string> {
  return new Set(criteriaWithoutObject(passes, doc.blocks));
}

const DECLARABLE_LIMITS: readonly ClauseLimitKind[] = ["partial", "unbuilt", "out_of_reach"];

function leafStatus(
  node: ClauseNode,
  criteria: readonly string[],
  instruments: readonly string[],
  standard: string,
): ClauseStatus {
  const limit = node.limit;
  const evidence = [...criteria, ...instruments];

  if (limit && !DECLARABLE_LIMITS.includes(limit.kind)) {
    throw new Error(
      `cláusula "${node.section}" de ${standard} declara limite "${limit.kind}". ` +
        `Só ${DECLARABLE_LIMITS.join(", ")} podem ser declarados: "unreachable" é sempre derivado ` +
        "do documento auditado, nunca escrito na árvore.",
    );
  }

  if (evidence.length === 0) {
    if (!limit) {
      throw new Error(
        `cláusula "${node.section}" de ${standard} não tem detector, instrumento nem limite declarado. ` +
          "Toda cláusula sem cobertura precisa dizer se é `unbuilt` (alcançável, não construída) " +
          "ou `out_of_reach` (não verificável a partir do texto), com motivo — ausência sem motivo " +
          "é defeito, não limitação.",
      );
    }
    if (limit.kind === "partial") {
      throw new Error(
        `cláusula "${node.section}" de ${standard} declara limite "partial" sem detector nem instrumento. ` +
          "`partial` significa cobertura presente COM limite conhecido dentro da cláusula.",
      );
    }
    return limit.kind;
  }

  if (!limit) return "detected";

  if (limit.kind !== "partial") {
    throw new Error(
      `cláusula "${node.section}" de ${standard} tem cobertura (${evidence.join(", ")}) mas declara ` +
        `limite "${limit.kind}", que afirma ausência de cobertura. Use "partial" ou remova o limite.`,
    );
  }

  return "partial";
}

export function buildCoverageReport(
  tree: ClauseTree,
  taxonomy: CriterionTaxonomy,
  options: CoverageOptions = {},
): CoverageReport {
  const silent = options.doc ? silentIn(options.passes ?? [], options.doc) : new Set<string>();
  const bySection = indexNodes(tree);
  assertAcyclicParents(bySection, tree.standard);

  const bySectionCriteria = criteriaBySection(taxonomy);
  for (const [section, criteria] of bySectionCriteria) {
    if (!bySection.has(section)) {
      throw new Error(
        `os critérios ${criteria.join(", ")} citam a cláusula "${section}" de ${tree.standard}, ` +
          "que não existe na árvore transcrita. Um critério não pode citar autoridade que a árvore não declara.",
      );
    }
  }

  const childrenOf = new Map<string, string[]>();
  for (const node of bySection.values()) {
    if (node.parent === null) continue;
    const list = childrenOf.get(node.parent);
    if (list) list.push(node.section);
    else childrenOf.set(node.parent, [node.section]);
  }
  for (const list of childrenOf.values()) list.sort(compareSections);

  const sections = [...bySection.keys()].sort(compareSections);
  const resolved = new Map<string, ClauseStatus>();

  function statusOf(section: string): ClauseStatus {
    const cached = resolved.get(section);
    if (cached) return cached;

    const node = bySection.get(section) as ClauseNode;
    const criteria = bySectionCriteria.get(section) ?? [];
    const instruments = node.instruments ?? [];
    const children = childrenOf.get(section) ?? [];

    let status: ClauseStatus;
    if (children.length === 0) {
      const declared = leafStatus(node, criteria, instruments, tree.standard);
      const silenced = criteria.filter((criterion) => silent.has(criterion));
      status =
        silenced.length === 0
          ? declared
          : silenced.length === criteria.length && instruments.length === 0
            ? "unreachable"
            : declared === "detected"
              ? "partial"
              : declared;
    } else {
      if (node.limit) {
        throw new Error(
          `cláusula "${section}" de ${tree.standard} tem subcláusulas e também declara um limite. ` +
            "O estado de uma cláusula com filhas é derivado delas — um motivo declarado aqui esconderia " +
            "o que as filhas dizem.",
        );
      }
      const inputs = children.map(statusOf);
      const covered = criteria.length + instruments.length > 0;
      status = rollUp(covered ? [...inputs, "detected"] : inputs);
    }

    resolved.set(section, status);
    return status;
  }

  const clauses: ClauseCoverage[] = sections.map((section) => {
    const node = bySection.get(section) as ClauseNode;
    const children = childrenOf.get(section) ?? [];
    const derived = children.length > 0;
    return {
      section,
      title: node.title,
      parent: node.parent,
      children,
      principleGroup: node.principleGroup,
      provisional: node.provisional,
      status: statusOf(section),
      derived,
      criteria: bySectionCriteria.get(section) ?? [],
      silent: (bySectionCriteria.get(section) ?? []).filter((criterion) => silent.has(criterion)),
      instruments: node.instruments ?? [],
      reason: derived ? null : (node.limit?.reason ?? null),
    };
  });

  const byStatus: Record<ClauseStatus, number> = {
    detected: 0,
    partial: 0,
    unbuilt: 0,
    out_of_reach: 0,
    unreachable: 0,
  };
  for (const clause of clauses) byStatus[clause.status]++;

  const leaves = clauses.filter((clause) => !clause.derived);
  const detectedLeaves = leaves.filter((clause) => clause.status === "detected").length;

  return {
    scope: options.doc ? "document" : "instrument",
    standard: tree.standard,
    transcription: tree.transcription,
    exhaustive: tree.exhaustive,
    clauses,
    byStatus,
    detectedShare: tree.exhaustive && leaves.length > 0 ? detectedLeaves / leaves.length : null,
    silentCriteria: [...silent].sort(),
    outsideStandard: outsideStandardFrom(taxonomy),
  };
}
