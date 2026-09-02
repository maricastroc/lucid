import type { ReaderBriefing } from "@/lucid";
import type { UiCopy } from "../i18n/copy";
import type { LedgerEntry } from "./ledger";
import type { ReviewMarks } from "./review-marks";

/**
 * O que se perde quando o documento aberto é substituído por outro.
 *
 * Só entra aqui o que a máquina NÃO recompõe. A auditoria em si fica de fora de propósito: ela é
 * recalculada do texto a qualquer momento, e um aviso que a incluísse dispararia em toda abertura
 * — treinando o autor a passar direto pelo aviso que existe para o caso em que há perda real.
 */
export interface PendingWork {
  /** Alterações registradas na trilha. */
  readonly changes: number;
  /** Pontos marcados como revisados. */
  readonly reviewed: number;
  /** Pontos marcados como ignorados. */
  readonly dismissed: number;
  /** O briefing do leitor foi respondido (elicitação do Princípio 1). */
  readonly briefing: boolean;
  /** O texto mudou desde que entrou — inclui digitação que a trilha ainda não registrou. */
  readonly editedText: boolean;
}

export interface PendingWorkInput {
  readonly text: string;
  readonly originalText: string | null;
  readonly ledger: readonly LedgerEntry[];
  readonly marks: ReviewMarks;
  readonly briefing: ReaderBriefing;
}

export function briefingAnswered(briefing: ReaderBriefing): boolean {
  return (
    briefing.audience.trim() !== "" ||
    briefing.purpose.trim() !== "" ||
    briefing.priorKnowledge.trim() !== "" ||
    briefing.mustFind.some((expression) => expression.trim() !== "")
  );
}

/**
 * `originalText` é `null` quando o texto de entrada não foi registrado (sessão salva antes do campo
 * existir). `null` não é `""`: um diz "não sei", o outro diz "escrito aqui dentro". Diante do "não
 * sei", havendo texto, o aviso aparece — errar para o lado do aviso custa um clique; errar para o
 * lado do silêncio custa o trabalho.
 */
function textWasEdited(text: string, originalText: string | null): boolean {
  if (text.trim() === "") return false;
  return originalText === null || text !== originalText;
}

/** `null` quando não há nada a perder — nesse caso o documento é substituído sem perguntar. */
export function pendingWork(input: PendingWorkInput): PendingWork | null {
  let reviewed = 0;
  let dismissed = 0;
  for (const mark of Object.values(input.marks)) {
    if (mark.kind === "seen") reviewed += 1;
    else dismissed += 1;
  }

  const work: PendingWork = {
    changes: input.ledger.length,
    reviewed,
    dismissed,
    briefing: briefingAnswered(input.briefing),
    editedText: textWasEdited(input.text, input.originalText),
  };

  const empty =
    work.changes === 0 && work.reviewed === 0 && work.dismissed === 0 && !work.briefing && !work.editedText;

  return empty ? null : work;
}

/**
 * O que está em risco, na ordem em que dói: primeiro o texto e as decisões do autor, depois o
 * briefing. Cada linha nomeia o que se perde — número nenhum aparece sem substantivo.
 */
export function atRiskItems(work: PendingWork, copy: UiCopy["studio"]["replaceDocument"]): readonly string[] {
  const items: string[] = [];
  if (work.editedText) items.push(copy.editedText);
  if (work.changes > 0) items.push(copy.changes(work.changes));
  if (work.reviewed > 0) items.push(copy.reviewed(work.reviewed));
  if (work.dismissed > 0) items.push(copy.dismissed(work.dismissed));
  if (work.briefing) items.push(copy.briefing);
  return items;
}
