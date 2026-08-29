import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountStudio } from "./support/mount-studio";
import { auditReady } from "./support/points";
import { PASSIVE_AND_JARGON } from "./support/documents";

const printed = () => document.getElementById("relatorio-impresso");

let print: ReturnType<typeof vi.fn>;

beforeEach(() => {
  print = vi.fn();
  window.print = print as unknown as typeof window.print;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function openPrint() {
  const { user } = mountStudio({ text: PASSIVE_AND_JARGON, originalText: PASSIVE_AND_JARGON });
  await auditReady();
  await user.click(screen.getAllByRole("button", { name: /exportar/i })[0]);
  await user.click(screen.getByRole("menuitem", { name: /imprimir auditoria/i }));
  return user;
}

describe("printing the audit", () => {
  it("hands the report to the browser's own print dialog", async () => {
    await openPrint();
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("opens the dialog without waiting for a frame, which a background tab never paints", async () => {
    vi.stubGlobal("requestAnimationFrame", () => {
      throw new Error("the print sheet must not depend on a painted frame");
    });
    await openPrint();
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("prints the report, not the screen", async () => {
    await openPrint();
    const sheet = printed()!;
    expect(sheet).toBeInTheDocument();
    expect(sheet.querySelector("h1")).toHaveTextContent(/auditoria de linguagem simples/i);
    expect(sheet.textContent).toContain("Placar");
    expect(sheet.textContent).toMatch(/Motor Lucid .+ · perfil .+ · dados /);
  });

  it("puts the sheet directly on the body, where the print rule can stand it alone", async () => {
    await openPrint();
    expect(printed()!.parentElement).toBe(document.body);
  });

  it("carries the entry text, so the printed delta can be checked too", async () => {
    await openPrint();
    expect(printed()!.querySelector("pre.report-source")).toHaveTextContent(/o pedido foi indeferido/i);
  });

  it("opens one dialog per print, not one per effect run", async () => {
    await openPrint();
    expect(print).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event("afterprint"));
    await screen.findByRole("complementary", { name: /auditoria/i });
    expect(printed()).toBeNull();
  });

  it("takes the sheet down once the dialog closes", async () => {
    await openPrint();
    expect(printed()).toBeInTheDocument();
    window.dispatchEvent(new Event("afterprint"));
    await screen.findByRole("complementary", { name: /auditoria/i });
    expect(printed()).toBeNull();
  });

  it("says what the item does, since the browser is what makes the file", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await user.click(screen.getAllByRole("button", { name: /exportar/i })[0]);
    expect(screen.getByRole("menuitem", { name: /imprimir auditoria/i })).toHaveTextContent(/salvar como pdf/i);
  });
});
