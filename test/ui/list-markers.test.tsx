import { describe, expect, it } from "vitest";
import type { RawBlock } from "@/lucid";
import { mountStudio } from "./support/mount-studio";
import { auditReady } from "./support/points";

const TEXT = [
  "Gestão / Unidade: 68100001 - Sediv",
  "Fonte de Recursos: 500 - Tesouro",
  "O proponente poderá inscrever-se nas categorias informadas abaixo.",
].join("\n");

const BLOCKS: RawBlock[] = [
  {
    kind: "list",
    ordered: true,
    items: [
      { blocks: ["Gestão / Unidade: 68100001 - Sediv"], level: 3, ordered: true, marker: "2.1.1.1." },
      { blocks: ["Fonte de Recursos: 500 - Tesouro"], level: 3, ordered: true, marker: "2.1.1.2." },
      {
        blocks: ["O proponente poderá inscrever-se nas categorias informadas abaixo."],
        level: 1,
        ordered: true,
        marker: "2.2.",
      },
    ],
  },
];

const article = () => document.querySelector("article") ?? document.body;

describe("a numeração do próprio documento", () => {
  it("é impressa como está, sem um segundo número gerado ao lado", async () => {
    mountStudio({ text: TEXT, blocks: BLOCKS });
    await auditReady();

    const list = article().querySelector("ol, ul")!;
    expect(list.className).toContain("list-none");
    expect(article().textContent).toContain("2.1.1.1.");
    expect(article().textContent).toContain("2.2.");
  });

  it("recua pelo nível: 2.1.1.x fica mais fundo que 2.2, mesmo sem o pai na lista", async () => {
    mountStudio({ text: TEXT, blocks: BLOCKS });
    await auditReady();

    const items = [...article().querySelectorAll("li")] as HTMLElement[];
    expect(items).toHaveLength(3);
    expect(items[0].style.marginLeft).not.toBe("0em");
    expect(items[2].style.marginLeft).toBe("0em");
  });

  it("mantém o marcador gerado quando o documento não traz rótulo próprio", async () => {
    mountStudio({
      text: "Primeiro\nSegundo",
      blocks: [
        {
          kind: "list",
          ordered: false,
          items: [
            { blocks: ["Primeiro"], level: 0, ordered: false },
            { blocks: ["Segundo"], level: 0, ordered: false },
          ],
        },
      ],
    });
    await auditReady();

    expect(article().querySelector("ul")!.className).toContain("list-disc");
  });
});
