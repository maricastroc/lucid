"use client";

import { useCallback, useRef, useState } from "react";
import type { Span } from "@/lucid";
import type { AgentDeclaration, VerifiedRewrite } from "@/report/rewrite";
import type { UiLang } from "../../i18n/types";
import { verifyManualEdit } from "../../lib/rewrite";
import { isManualEditDirty } from "../../lib/text-edit";

/**
 * Closed carries no text at all: there was no draft to speak of before the author opened the
 * editor. Editing and checking are the two states the open editor can be in, and a verification
 * may sit under either — re-checking keeps the previous verdict on screen, as it did before.
 */
export type ManualEditDraft =
  | { readonly status: "closed" }
  | { readonly status: "editing"; readonly text: string }
  | { readonly status: "checking"; readonly text: string };

interface StampedVerification {
  readonly result: VerifiedRewrite;
  /** What the author had declared when this verdict was produced. */
  readonly forDeclaration: AgentDeclaration | null;
}

type State =
  | { readonly status: "closed" }
  | { readonly status: "editing"; readonly text: string; readonly verification: StampedVerification | null }
  | { readonly status: "checking"; readonly text: string; readonly verification: StampedVerification | null };

export interface ManualEditDraftOptions {
  readonly source: string;
  readonly target: Span;
  readonly criterion: string;
  readonly declaration: AgentDeclaration | null;
  readonly lang: UiLang;
}

export interface ManualEditDraftControls {
  readonly draft: ManualEditDraft;
  /** The verdict to show, already retired when the declaration it was made under changed. */
  readonly verification: VerifiedRewrite | null;
  readonly dirty: boolean;
  readonly open: () => void;
  readonly close: () => void;
  readonly edit: (text: string) => void;
  readonly restore: () => void;
  readonly check: () => Promise<void>;
}

export function useManualEditDraft({
  source,
  target,
  criterion,
  declaration,
  lang,
}: ManualEditDraftOptions): ManualEditDraftControls {
  const original = target.text;
  const [state, setState] = useState<State>({ status: "closed" });
  // Only the newest check may write a verdict, so a slow answer cannot land on a newer draft.
  const checkIdRef = useRef(0);

  const open = useCallback(
    () => setState({ status: "editing", text: original, verification: null }),
    [original],
  );

  const close = useCallback(() => setState({ status: "closed" }), []);

  // Editing retires the verdict: it was about text that no longer exists.
  const edit = useCallback(
    (text: string) => setState({ status: "editing", text, verification: null }),
    [],
  );

  const restore = useCallback(
    () => setState({ status: "editing", text: original, verification: null }),
    [original],
  );

  const check = useCallback(async () => {
    if (state.status === "closed") return;

    const checkId = ++checkIdRef.current;
    const text = state.text;
    setState({ status: "checking", text, verification: state.verification });

    try {
      const result = await verifyManualEdit(
        source,
        target,
        text,
        criterion,
        declaration ? [declaration] : undefined,
        lang,
      );
      if (checkIdRef.current === checkId) {
        setState({ status: "editing", text, verification: { result, forDeclaration: declaration } });
      }
    } finally {
      // A failure leaves the editor open with the previous verdict, and the error keeps travelling
      // — the same as before this was a hook.
      if (checkIdRef.current === checkId) {
        setState((now) =>
          now.status === "checking" ? { status: "editing", text: now.text, verification: now.verification } : now,
        );
      }
    }
  }, [state, source, target, criterion, declaration, lang]);

  const draft: ManualEditDraft =
    state.status === "closed" ? { status: "closed" } : { status: state.status, text: state.text };

  const verification =
    state.status !== "closed" && state.verification !== null && state.verification.forDeclaration === declaration
      ? state.verification.result
      : null;

  return {
    draft,
    verification,
    dirty: state.status === "closed" ? false : isManualEditDirty(original, state.text),
    open,
    close,
    edit,
    restore,
    check,
  };
}
