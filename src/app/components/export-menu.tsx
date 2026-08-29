"use client";

import { useState } from "react";
import type { Block, BriefingCheck, Config, Diagnostic, Finding, ReaderBriefing } from "@/lucid";
import { buildAuditReport } from "../lib/audit-report";
import { documentToDocx, exportableBlocks } from "../lib/export-document";
import type { LedgerEntry } from "../lib/ledger";
import { useCopy } from "../i18n/use-copy";
import { ReportRecordDialog } from "./report-record-dialog";
import { downloadFile } from "./export-menu/download-file";
import { useDismissableMenu } from "./export-menu/use-dismissable-menu";
import { ArrowDownIcon, ChevronDownIcon, PenNibIcon } from "./icons";

export interface ExportMenuProps {
  diagnostic: Diagnostic;
  findings: readonly Finding[];
  ledger: readonly LedgerEntry[];
  blocks: readonly Block[] | null;
  briefing: ReaderBriefing;
  briefingCheck: BriefingCheck;
  onBriefingChange: (briefing: ReaderBriefing) => void;
  config: Config;
}

export function ExportMenu({
  diagnostic,
  findings,
  ledger,
  blocks,
  briefing,
  briefingCheck,
  onBriefingChange,
  config,
}: ExportMenuProps) {
  const { c } = useCopy();
  const [docxError, setDocxError] = useState<string | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const { open, boxRef, triggerRef, toggle, close, setOpen, onKeyDown } = useDismissableMenu(() => setDocxError(null));

  const exportAudit = () => {
    downloadFile(
      "auditoria-lucid.md",
      buildAuditReport(
        diagnostic,
        findings,
        { generatedAt: new Date().toLocaleString("pt-BR") },
        ledger,
        { briefing, check: briefingCheck },
        config,
      ),
      "text/markdown;charset=utf-8",
    );
    close(false);
  };

  const exportDocx = async () => {
    setDocxError(null);
    try {
      const bytes = await documentToDocx(exportableBlocks(diagnostic.text, blocks));
      downloadFile(
        "documento-revisado.docx",
        bytes as BlobPart,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      close(false);
    } catch {
      setDocxError(c.overview.docxError);
    }
  };

  const exportTxt = () => {
    downloadFile("documento-revisado.txt", diagnostic.text, "text/plain;charset=utf-8");
    close(false);
  };

  return (
    <div ref={boxRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className="inline-flex items-center gap-1.5 rounded-full border border-rule-2 px-3 py-1.5 text-[12px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0"
      >
        <ArrowDownIcon className="size-3.5" />
        {c.panel.exportLabel}
        <ChevronDownIcon
          className={`size-3 text-ink-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={c.panel.exportMenuLabel}
          className="rise absolute right-0 z-30 mt-1.5 w-76 rounded-lg border border-rule-2 bg-sheet p-1.5 shadow-(--shadow-pop)"
        >
          <MenuItem onClick={exportAudit}>{c.overview.exportAudit}</MenuItem>
          <MenuItem onClick={exportDocx} note={c.overview.docxNote}>
            {c.overview.exportDocx}
          </MenuItem>
          <MenuItem onClick={exportTxt}>{c.overview.exportTxt}</MenuItem>
          {docxError !== null && (
            <p role="alert" className="px-2.5 pb-1.5 pt-1 text-[11.5px] leading-relaxed text-sev-error">
              {docxError}
            </p>
          )}

          <div className="mt-1.5 border-t border-rule-1 pt-1.5">
            <MenuItem
              icon={<PenNibIcon className="size-3.5 text-ink-3" />}
              onClick={() => {
                setOpen(false);
                setRecordOpen(true);
              }}
              note={c.reportRecord.menuNote}
            >
              {c.reportRecord.menuItem}
            </MenuItem>
          </div>
        </div>
      )}

      <ReportRecordDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        briefing={briefing}
        onChange={onBriefingChange}
      />
    </div>
  );
}

function MenuItem({
  onClick,
  note,
  icon,
  children,
}: {
  onClick: () => void;
  note?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="row-hit flex w-full flex-col items-start gap-0.5 rounded-md px-2.5 py-2 text-left hover:bg-surface-2"
    >
      <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-ink-1">
        {icon ?? <ArrowDownIcon className="size-3.5 text-ink-3" />}
        {children}
      </span>
      {note !== undefined && <span className="text-[11px] leading-relaxed text-ink-3">{note}</span>}
    </button>
  );
}
