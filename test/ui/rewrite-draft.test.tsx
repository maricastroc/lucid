import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { AgentDeclaration, VerifiedRewrite } from "@/report/rewrite";
import { useRewriteDraft } from "@/app/components/revision-note/use-rewrite-draft";

vi.mock("@/app/lib/rewrite", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/lib/rewrite")>()),
  generateRewrite: vi.fn(),
}));

const { generateRewrite } = await import("@/app/lib/rewrite");
const generate = vi.mocked(generateRewrite);

const SOURCE = "O pedido foi indeferido pela comissão.";
const TARGET = { start: 0, end: SOURCE.length, text: SOURCE };
const answer = (proposed: string) =>
  ({ proposal: { proposerId: "p@1", original: SOURCE, proposed }, verification: {} }) as unknown as VerifiedRewrite;

const options = (declaration: AgentDeclaration | null = null) => ({
  source: SOURCE,
  target: TARGET,
  criterion: "passive_voice",
  choice: { providerId: "stub" as const, model: "m", name: "n" },
  declaration,
  failureMessage: "falhou",
});

beforeEach(() => {
  generate.mockReset();
});

describe("the AI proposal draft", () => {
  it("cancelling leaves neither a proposal nor an error", async () => {
    generate.mockImplementation(
      (_t, _target, _c, opts) =>
        new Promise((_resolve, reject) =>
          opts?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))),
        ),
    );

    const { result } = renderHook(() => useRewriteDraft(options()));
    act(() => void result.current.run());
    await waitFor(() => expect(result.current.draft.status).toBe("running"));

    await act(async () => result.current.cancel());

    await waitFor(() => expect(result.current.draft).toEqual({ status: "idle" }));
  });

  it("an answer from a superseded run cannot land on top of the newer one", async () => {
    const slow = answer("resposta antiga");
    const fast = answer("resposta nova");
    let releaseSlow: (v: VerifiedRewrite) => void = () => {};
    generate
      .mockImplementationOnce(() => new Promise((resolve) => (releaseSlow = resolve)))
      .mockImplementationOnce(async () => fast);

    const { result } = renderHook(() => useRewriteDraft(options()));
    act(() => void result.current.run());
    act(() => void result.current.run());
    await waitFor(() => expect(result.current.draft.status).toBe("proposed"));

    await act(async () => releaseSlow(slow));

    expect(result.current.draft).toEqual({ status: "proposed", result: fast });
  });

  it("a new declaration retires the proposal made without it", async () => {
    generate.mockResolvedValue(answer("uma proposta"));
    const declaration: AgentDeclaration = { span: TARGET, agent: "a comissão" };

    const { result, rerender } = renderHook((props: { declaration: AgentDeclaration | null }) =>
      useRewriteDraft(options(props.declaration)),
    { initialProps: { declaration: null as AgentDeclaration | null } });

    await act(async () => result.current.run());
    expect(result.current.draft.status).toBe("proposed");

    rerender({ declaration });

    expect(result.current.draft).toEqual({ status: "idle" });
  });

  it("a failure survives a declaration arriving — it was never a proposal", async () => {
    generate.mockImplementation(async () => {
      throw new Error("sem resposta");
    });
    const declaration: AgentDeclaration = { span: TARGET, agent: "a comissão" };

    const { result, rerender } = renderHook((props: { declaration: AgentDeclaration | null }) =>
      useRewriteDraft(options(props.declaration)),
    { initialProps: { declaration: null as AgentDeclaration | null } });

    await act(async () => result.current.run());
    expect(result.current.draft).toEqual({ status: "failed", message: "sem resposta" });

    rerender({ declaration });

    expect(result.current.draft).toEqual({ status: "failed", message: "sem resposta" });
  });
});
