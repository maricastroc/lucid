import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildEvalArtifact, serializeEvalArtifact } from "./compute";

/**
 * GUARD DE DRIFT — o artefato publicado tem que ser o do código atual.
 *
 * Sem isto, mudar um golden e rodar `npm test` passa verde (os evals não fixam valores),
 * e `eval/report.json` fica descrevendo um estado que não existe mais — a página publicaria
 * número que não é o do HEAD, que é exatamente o modo de falha que transforma eval em
 * marketing. O `goldenHash` torna a divergência detectável; este teste a DETECTA.
 *
 * É um teste da suíte normal (sem flag e sem git) de propósito: quem mexer no golden ou no
 * motor descobre na hora, não no code review.
 */
const ARTIFACT_PATH = resolve(__dirname, "../../eval/report.json");
const REGENERATE = "npm run eval";

describe("eval/report.json — guard de drift", () => {
  it("o artefato existe no repositório", () => {
    expect(existsSync(ARTIFACT_PATH), `eval/report.json não encontrado — rode \`${REGENERATE}\``).toBe(true);
  });

  it("o artefato committado é byte-idêntico ao que o código produz agora", () => {
    const emDisco = readFileSync(ARTIFACT_PATH, "utf8");
    const atual = serializeEvalArtifact(buildEvalArtifact());

    if (emDisco !== atual) {
      const doDisco = JSON.parse(emDisco) as { stamp?: Record<string, string> };
      const doCodigo = JSON.parse(atual) as { stamp?: Record<string, string> };
      const diffEstampa = Object.keys(doCodigo.stamp ?? {}).filter(
        (k) => doDisco.stamp?.[k] !== doCodigo.stamp?.[k],
      );
      expect.fail(
        `eval/report.json está DESATUALIZADO em relação ao código/golden atual — rode \`${REGENERATE}\` e commite o resultado.` +
          (diffEstampa.length > 0
            ? ` Estampa divergente em: ${diffEstampa
                .map((k) => `${k} (disco ${doDisco.stamp?.[k]} ≠ código ${doCodigo.stamp?.[k]})`)
                .join(", ")}.`
            : " A estampa é igual, então o que mudou é conteúdo medido (contagem, precisão, recall ou cobertura)."),
      );
    }

    expect(emDisco).toBe(atual);
  });
});
