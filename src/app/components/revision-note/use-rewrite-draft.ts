"use client";

import { useCallback, useRef, useState } from "react";
import type { Span } from "@/lucid";
import type { AgentDeclaration, VerifiedRewrite } from "@/report/rewrite";
import { generateRewrite, type RewriteModel } from "../../lib/rewrite";

/**
 * The four states the AI proposal can be in. They were four independent flags before
 * (`loading`, `result`, `error`, and the absence of all three), which allowed combinations the
 * flow never produces — a result while loading, an error next to a proposal.
 */
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
  /** What the author declared about the omitted agent. Arriving or changing invalidates a proposal. */
  readonly declaration: AgentDeclaration | null;
  /** Fallback text for a failure with no message of its own — the copy stays with the JSX. */
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
  // Only the newest run may write state. Without it a slow first answer could land on top of a
  // second one and show a proposal for a request the author already replaced.
  const runIdRef = useRef(0);

  // Adjusting state while rendering, as before: the elicitation the author just answered turns the
  // next run directed, and retires a proposal made without it. A run in flight and a failure
  // message both survive the change, exactly as they did.
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
      // A cancelled run leaves no trace, the way it always has: no proposal, no error.
      if (controller.signal.aborted) setDraft({ status: "idle" });
      else setDraft({ status: "failed", message: error instanceof Error ? error.message : failureMessage });
    } finally {
      if (runIdRef.current === runId) abortRef.current = null;
    }
  }, [source, target, choice, criterion, directed, declaration, failureMessage]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return { draft, run, cancel };
}
