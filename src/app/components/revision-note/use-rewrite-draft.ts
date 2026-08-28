"use client";

import { useCallback, useRef, useState } from "react";
import type { Span } from "@/lucid";
import type { AgentDeclaration, VerifiedRewrite } from "@/report/rewrite";
import { generateRewrite, type RewriteModel } from "../../lib/rewrite";

export type RewriteDraft =
  | { readonly status: "idle" }
  | { readonly status: "running" }
  | { readonly status: "failed"; readonly message: string }
  | { readonly status: "proposed"; readonly result: VerifiedRewrite };

export interface RewriteDraftOptions {
  readonly source: string;
  readonly target: Span;
  readonly criterion: string;
  readonly choice: RewriteModel;
  readonly declaration: AgentDeclaration | null;
  readonly failureMessage: string;
}

export interface RewriteDraftControls {
  readonly draft: RewriteDraft;
  readonly run: () => Promise<void>;
  readonly cancel: () => void;
}

export function useRewriteDraft({
  source,
  target,
  criterion,
  choice,
  declaration,
  failureMessage,
}: RewriteDraftOptions): RewriteDraftControls {
  const [draft, setDraft] = useState<RewriteDraft>({ status: "idle" });
  const [directed, setDirected] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  const [lastDeclaration, setLastDeclaration] = useState(declaration);
  if (declaration !== lastDeclaration) {
    setLastDeclaration(declaration);
    if (declaration) setDirected(true);
    setDraft((current) => (current.status === "proposed" ? { status: "idle" } : current));
  }

  const run = useCallback(async () => {
    const runId = ++runIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setDraft({ status: "running" });

    try {
      const result = await generateRewrite(source, target, choice, {
        criterion,
        directed,
        declarations: declaration ? [declaration] : undefined,
        signal: controller.signal,
      });
      if (runIdRef.current === runId) setDraft({ status: "proposed", result });
    } catch (error) {
      if (runIdRef.current !== runId) return;
      if (controller.signal.aborted) setDraft({ status: "idle" });
      else setDraft({ status: "failed", message: error instanceof Error ? error.message : failureMessage });
    } finally {
      if (runIdRef.current === runId) abortRef.current = null;
    }
  }, [source, target, choice, criterion, directed, declaration, failureMessage]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return { draft, run, cancel };
}
