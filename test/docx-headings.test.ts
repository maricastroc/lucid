import { describe, expect, it } from "vitest";
import { headingStyleMap } from "@/importers/docx";

const style = (id: string, name: string, inner: string) =>
  `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/>${inner}</w:style>`;

const used = (...ids: string[]) => ids.map((id) => `<w:p><w:pPr><w:pStyle w:val="${id}"/></w:pPr></w:p>`).join("");

describe("de onde vem o nível de um título no .docx", () => {
  it("o próprio arquivo declara: outlineLvl é evidência, não palpite", () => {
    const styles = style("Titulo1", "Título 1", '<w:pPr><w:outlineLvl w:val="0"/></w:pPr>');
    const map = headingStyleMap(styles, used("Titulo1"));

    expect(map.names).toEqual(["Título 1"]);
    expect(map.inferred).toEqual([]);
    expect(map.entries[0]).toBe("p[style-name='Título 1'] => h1:fresh");
  });

  it("o estilo herda o nível de outro que o declara", () => {
    const styles =
      style("Heading2", "heading 2", '<w:pPr><w:outlineLvl w:val="1"/></w:pPr>') +
      style("MeuSub", "Meu Subtítulo", '<w:basedOn w:val="Heading2"/>');
    const map = headingStyleMap(styles, used("MeuSub"));

    expect(map.names).toContain("Meu Subtítulo");
    expect(map.inferred).toEqual([]);
    expect(map.entries).toContain("p[style-name='Meu Subtítulo'] => h2:fresh");
  });

  it("ninguém declarou nada, mas o nome do estilo diz o nível — e isso fica marcado como inferido", () => {
    const styles = style("IrisH1", "Iris H1", "") + style("IrisCorpo", "Iris Corpo", "");
    const map = headingStyleMap(styles, used("IrisH1", "IrisCorpo"));

    expect(map.names).toEqual(["Iris H1"]);
    expect(map.inferred).toEqual(["Iris H1"]);
  });

  it("aceita as formas que uma pessoa escreve de fato", () => {
    const styles =
      style("A", "heading 3", "") + style("B", "Título 2", "") + style("C", "Nível 4", "") + style("D", "Sub H5", "");
    const map = headingStyleMap(styles, used("A", "B", "C", "D"));

    expect(map.entries).toEqual([
      "p[style-name='Nível 4'] => h4:fresh",
      "p[style-name='Sub H5'] => h5:fresh",
      "p[style-name='Título 2'] => h2:fresh",
      "p[style-name='heading 3'] => h3:fresh",
    ]);
    expect(map.inferred).toHaveLength(4);
  });

  it("não confunde corpo de texto com título só porque o nome tem número", () => {
    const styles = style("Corpo", "Iris Corpo", "") + style("Lista", "Iris Lista", "") + style("N", "Normal", "");
    const map = headingStyleMap(styles, used("Corpo", "Lista", "N"));

    expect(map.names).toEqual([]);
  });

  it("ignora estilo declarado mas não usado no documento", () => {
    const styles = style("IrisH1", "Iris H1", "");

    expect(headingStyleMap(styles, "<w:p/>").names).toEqual([]);
  });

  it("declarado vence inferido para o mesmo estilo", () => {
    const styles = style("H1", "Título 1", '<w:pPr><w:outlineLvl w:val="2"/></w:pPr>');
    const map = headingStyleMap(styles, used("H1"));

    expect(map.entries[0]).toBe("p[style-name='Título 1'] => h3:fresh");
    expect(map.inferred).toEqual([]);
  });
});
