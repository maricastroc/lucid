"use client";

import { useState } from "react";
import type { OrgTerm } from "@/lucid";
import { useCopy } from "../i18n/use-copy";
import { Button, IconButton } from "./ui/button";
import { CloseIcon } from "./icons";

interface Props {
  terms: readonly OrgTerm[];
  excerpt: string;
  counts: ReadonlyMap<string, number>;
  onChange: (terms: readonly OrgTerm[]) => void;
  onClearExcerpt: () => void;
}

const FIELD =
  "w-full min-w-0 rounded-lg border border-rule-2 bg-sheet px-2.5 py-2 text-[13px] text-ink-0 " +
  "placeholder:text-ink-dim focus:border-accent focus:outline-none";

export function VocabularyPanel({ terms, excerpt, counts, onChange, onClearExcerpt }: Props) {
  const { c } = useCopy();
  const v = c.vocabulary;

  const [term, setTerm] = useState("");
  const [plain, setPlain] = useState("");
  const [reason, setReason] = useState("");

  const already = (candidate: string) =>
    terms.some((t) => t.term.toLocaleLowerCase("pt-BR") === candidate.toLocaleLowerCase("pt-BR"));

  const add = () => {
    const trimmed = term.trim();
    if (trimmed === "" || already(trimmed)) return;
    onChange([...terms, { term: trimmed, plain: plain.trim() === "" ? null : plain.trim(), reason: reason.trim() }]);
    setTerm("");
    setPlain("");
    setReason("");
    onClearExcerpt();
  };

  const remove = (target: string) => onChange(terms.filter((t) => t.term !== target));

  const duplicate = term.trim() !== "" && already(term.trim());

  return (
    <div className="border-t border-rule-1 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[13.5px] font-semibold text-ink-0">{v.label}</h3>
        <span className="rounded-[3px] bg-surface-3 px-1.5 py-px text-[10px] tracking-wide text-ink-2">{v.chip}</span>
      </div>

      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">{v.lead}</p>

      {excerpt !== "" && excerpt !== term && (
        <div className="mt-3 rounded-lg border border-dashed border-rule-2 px-2.5 py-2">
          <p className="text-[12px] leading-relaxed text-ink-2">
            {v.fromSelection} <span className="font-medium text-ink-0">«{excerpt}»</span>
          </p>
          <Button variant="link" size="xs" shape="soft" onClick={() => setTerm(excerpt)} className="mt-1">
            {v.useSelection}
          </Button>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[12.5px] font-medium text-ink-1">{v.termLabel}</span>
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={v.termPlaceholder}
            aria-label={v.termLabel}
            className={FIELD}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[12.5px] font-medium text-ink-1">{v.plainLabel}</span>
          <span className="text-[11.5px] leading-relaxed text-ink-3">{v.plainHint}</span>
          <input
            value={plain}
            onChange={(e) => setPlain(e.target.value)}
            placeholder={v.plainPlaceholder}
            aria-label={v.plainLabel}
            className={FIELD}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[12.5px] font-medium text-ink-1">{v.reasonLabel}</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              add();
            }}
            placeholder={v.reasonPlaceholder}
            aria-label={v.reasonLabel}
            className={FIELD}
          />
        </label>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={add} disabled={term.trim() === "" || duplicate} className="shrink-0">
            {v.add}
          </Button>
          {duplicate && <span className="text-[11.5px] text-ink-3">{v.duplicate}</span>}
        </div>
      </div>

      {terms.length > 0 && (
        <div className="mt-4">
          <span className="u-label text-ink-3">{v.declaredLabel(terms.length)}</span>
          <ul className="mt-2 flex flex-col gap-1">
            {terms.map((entry) => (
              <li
                key={entry.term}
                className="flex items-start gap-2 rounded-lg border border-rule-1 px-2.5 py-2 text-[12.5px]"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-ink-0">{entry.term}</span>
                  <span className="ml-1.5 text-ink-3">{v.occurrences(counts.get(entry.term) ?? 0)}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-2">
                    {entry.plain === null ? v.signalOnly : v.swapsTo(entry.plain)}
                  </span>
                  {entry.reason !== "" && (
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-3">{entry.reason}</span>
                  )}
                </div>
                <IconButton label={v.remove(entry.term)} onClick={() => remove(entry.term)} className="shrink-0">
                  <CloseIcon className="size-3.5" />
                </IconButton>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">{v.authorityCaveat}</p>
    </div>
  );
}
