import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { VerifiedRewrite } from "@/report/rewrite";
import { useManualEditDraft } from "@/app/components/revision-note/use-manual-edit-draft";

vi.mock("@/app/lib/rewrite", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/lib/rewrite")>()),
  verifyManualEdit: vi.fn(),
}));

const { verifyManualEdit } = await import("@/app/lib/rewrite");
const verify = vi.mocked(verifyManualEdit);

const SOURCE = "O pedido foi indeferido pela comissão.";
const TARGET = { start: 0, end: SOURCE.length, text: SOURCE };
const verdict = (proposed: string) =>
  ({ proposal: { proposerId: "author", original: SOURCE, proposed }, verification: {} }) as unknown as VerifiedRewrite;

const options = {
  source: SOURCE,
  target: TARGET,
  criterion: "passive_voice",
  declaration: null,
  lang: "pt-BR" as const,
};

beforeEach(() => {
  verify.mockReset();
});

describe("the manual edit draft", () => {
  it("opens on the original text, with nothing verified yet", () => {
    const { result } = renderHook(() => useManualEditDraft(options));
    expect(result.current.draft).toEqual({ status: "closed" });

    act(() => result.current.open());

    expect(result.current.draft).toEqual({ status: "editing", text: SOURCE });
    expect(result.current.dirty).toBe(false);
  });

  it("editing after a verdict retires it — the verdict was about other words", async () => {
    verify.mockResolvedValue(verdict("A comissão negou o pedido."));
    const { result } = renderHook(() => useManualEditDraft(options));
    act(() => result.current.open());
    act(() => result.current.edit("A comissão negou o pedido."));
    await act(async () => result.current.check());
    expect(result.current.verification).not.toBeNull();

    act(() => result.current.edit("A comissão negou o pedido em dez dias."));

    expect(result.current.verification).toBeNull();
    expect(result.current.draft).toEqual({ status: "editing", text: "A comissão negou o pedido em dez dias." });
  });

  it("restoring puts the original back and clears the verdict", async () => {
    verify.mockResolvedValue(verdict("A comissão negou o pedido."));
    const { result } = renderHook(() => useManualEditDraft(options));
    act(() => result.current.open());
    act(() => result.current.edit("A comissão negou o pedido."));
    await act(async () => result.current.check());

    act(() => result.current.restore());

    expect(result.current.draft).toEqual({ status: "editing", text: SOURCE });
    expect(result.current.verification).toBeNull();
    expect(result.current.dirty).toBe(false);
  });

  it("keeps the previous verdict on screen while a new check runs", async () => {
    verify.mockResolvedValueOnce(verdict("primeira versão"));
    const { result } = renderHook(() => useManualEditDraft(options));
    act(() => result.current.open());
    act(() => result.current.edit("primeira versão"));
    await act(async () => result.current.check());

    verify.mockImplementationOnce(() => new Promise(() => {}));
    act(() => void result.current.check());

    await waitFor(() => expect(result.current.draft.status).toBe("checking"));
    expect(result.current.verification).not.toBeNull();
  });

  it("a verdict from a superseded check cannot land on the newer draft", async () => {
    let releaseSlow: (v: VerifiedRewrite) => void = () => {};
    verify
      .mockImplementationOnce(() => new Promise((resolve) => (releaseSlow = resolve)))
      .mockImplementationOnce(async () => verdict("segunda versão"));

    const { result } = renderHook(() => useManualEditDraft(options));
    act(() => result.current.open());
    act(() => result.current.edit("primeira versão"));
    act(() => void result.current.check());
    act(() => result.current.edit("segunda versão"));
    await act(async () => result.current.check());

    expect(result.current.verification?.proposal.proposed).toBe("segunda versão");

    await act(async () => releaseSlow(verdict("primeira versão")));

    expect(result.current.verification?.proposal.proposed).toBe("segunda versão");
    expect(result.current.draft).toEqual({ status: "editing", text: "segunda versão" });
  });
});
