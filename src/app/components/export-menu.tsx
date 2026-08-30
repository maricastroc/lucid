"use client";

import { useCallback, useState } from "react";
import type { Block, BriefingCheck, Config, Diagnostic, Finding, ReaderBriefing } from "@/lucid";
import { buildAuditReport } from "../lib/audit-report";
import { documentToDocx, documentToHtml, documentToMarkdown, exportableBlocks } from "../lib/export-document";
import { renderReportHtml } from "../lib/report-html";
import type { LedgerEntry } from "../lib/ledger";
import type { ProfileId } from "../lib/profiles";
import { useCopy } from "../i18n/use-copy";
import { PrintReport } from "./print-report";
import { ReportRecordDialog } from "./report-record-dialog";
import { downloadFile } from "./export-menu/download-file";
import { useDismissableMenu } from "./export-menu/use-dismissable-menu";
import { ArrowDownIcon, ChevronDownIcon, PenNibIcon } from "./icons";
import { Button } from "./ui/button";

export interface ExportMenuProps {
  diagnostic: Diagnostic;
  findings: readonly Finding[];
  ledger: readonly LedgerEntry[];
  originalText: string | null;
  originalFindings: readonly Finding[] | null;
  profileId: ProfileId;
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
  originalText,
  originalFindings,
  profileId,
  blocks,
  briefing,
  briefingCheck,
  onBriefingChange,
  config,
}: ExportMenuProps) {
  const { c } = useCopy();
  const [docxError, setDocxError] = useState<string | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [printHtml, setPrintHtml] = useState<string | null>(null);
  const { open, boxRef, triggerRef, toggle, close, setOpen, onKeyDown } = useDismissableMenu(() => setDocxError(null));

  const auditMarkdown = () =>
    buildAuditReport(
      diagnostic,
      findings,
      { generatedAt: new Date().toLocaleString("pt-BR") },
      ledger,
      { briefing, check: briefingCheck },
      config,
      originalText,
      originalFindings,
      profileId,
    );

  const exportAudit = () => {
    downloadFile("auditoria-lucid.md", auditMarkdown(), "text/markdown;charset=utf-8");
    close(false);
  };

  const printAudit = () => {
    setPrintHtml(renderReportHtml(auditMarkdown()));
    close(false);
  };

  const printed = useCallback(() => setPrintHtml(null), []);

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

  const exportDocumentMd = () => {
    const markdown = documentToMarkdown(exportableBlocks(diagnostic.text, blocks));
    downloadFile("documento-revisado.md", markdown, "text/markdown;charset=utf-8");
    close(false);
  };

  const printDocument = () => {
    setPrintHtml(documentToHtml(exportableBlocks(diagnostic.text, blocks)));
    close(false);
  };

  return (
    <div ref={boxRef} className="relative" onKeyDown={onKeyDown}>
      <Button ref={triggerRef} shape="pill" aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
        <ArrowDownIcon className="size-3.5" />
        {c.panel.exportLabel}
        <ChevronDownIcon
          className={`size-3 text-ink-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </Button>

      {open && (
        <div
          role="menu"
          aria-label={c.panel.exportMenuLabel}
          className="rise absolute right-0 z-30 mt-1.5 w-76 rounded-lg border border-rule-2 bg-sheet p-1.5 shadow-(--shadow-pop)"
        >
          <GroupLabel>{c.overview.groupAudit}</GroupLabel>
          <MenuItem onClick={exportAudit}>{c.overview.exportAudit}</MenuItem>
          <MenuItem onClick={printAudit} note={c.overview.printNote}>
            {c.overview.printAudit}
          </MenuItem>

          <div className="mt-1.5 border-t border-rule-1 pt-1.5">
            <GroupLabel>{c.overview.groupDocument}</GroupLabel>
            <MenuItem onClick={exportDocumentMd}>{c.overview.exportDocumentMd}</MenuItem>
            <MenuItem onClick={exportDocx}>{c.overview.exportDocx}</MenuItem>
            <MenuItem onClick={printDocument}>{c.overview.printDocument}</MenuItem>
            <MenuItem onClick={exportTxt}>{c.overview.exportTxt}</MenuItem>
            <p className="px-2.5 pb-1 pt-1 text-[11px] leading-relaxed text-ink-3">{c.overview.docxNote}</p>
          </div>
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

      {printHtml !== null && <PrintReport html={printHtml} onPrinted={printed} />}

      <ReportRecordDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        briefing={briefing}
        onChange={onBriefingChange}
      />
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <span className="u-sublabel block px-2.5 pb-1 pt-0.5 text-ink-3">{children}</span>;
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
