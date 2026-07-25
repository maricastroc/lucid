import { describe, expect, it } from "vitest";
import { EVAL_SCHEMA_VERSION } from "../src/report/eval/contract";
import { SUPPORTED_SCHEMA_VERSION } from "../src/app/avaliacao/page";
import artifact from "../eval/report.json";

/**
 * A página de avaliação é APRESENTAÇÃO: ela lê `eval/report.json` e não recalcula nada.
 * O único acoplamento que pode apodrecer em silêncio é a versão do esquema — se o artefato
 * mudar de forma e a página não for atualizada, o usuário veria o estado de
 * incompatibilidade em produção. Este teste faz esse descompasso quebrar o build.
 */
describe("página de avaliação — compatibilidade com o contrato do artefato", () => {
  it("a página suporta a versão de esquema que o artefato declara", () => {
    expect(SUPPORTED_SCHEMA_VERSION).toBe(artifact.schemaVersion);
  });

  it("a página suporta a versão que o emissor produz hoje", () => {
    expect(SUPPORTED_SCHEMA_VERSION).toBe(EVAL_SCHEMA_VERSION);
  });
});
