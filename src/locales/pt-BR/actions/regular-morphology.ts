/**
 * Morfologia REGULAR de `-ar` por regra determinística (ADR-032, revisão). A conjugação de 3ª
 * pessoa dos verbos `-ar` regulares é 100% previsível — e, em 3ª pessoa do indicativo, as mudanças
 * ortográficas (`-car/-gar/-çar`) NÃO disparam (elas ocorrem antes de `-e`, que é 1ª pessoa/
 * subjuntivo). Então a regra é segura, e as EXCEÇÕES do `-ar` são um conjunto FECHADO e enumerável:
 *   · `-ear` (`passear → passeia`);
 *   · os verbos "MÁRIO" `-iar` (`mediar → medeia`);
 *   · irregulares (`dar`, `estar`) — que vivem na tabela fechada.
 *
 * Isso preserva "na dúvida, não converte": qualquer `-ar` fora dessas exceções é PROVADAMENTE
 * regular; as exceções caem na tabela ou em `unsupported`. NÃO fazemos regra para `-er`/`-ir` — lá
 * o particípio `-ido` é ambíguo (`bater`/`partir`) e os irregulares não são enumeráveis por padrão;
 * esses continuam nas tabelas fechadas.
 *
 * Runtime "produtivo" só para `-ar`, com guarda fechada — não é um conjugador geral.
 */

/** Verbos "MÁRIO" (`-iar` que flexionam como `-ear`: 3s em `-eia`). Classe fechada. */
const MARIO_IAR = new Set(["mediar", "ansiar", "remediar", "incendiar", "odiar"]);

/** `true` se o infinitivo `-ar` é REGULAR pela regra de 3ª pessoa (fora das exceções fechadas). */
function isRegularAr(infinitive: string): boolean {
  return infinitive.endsWith("ar") && !infinitive.endsWith("ear") && !MARIO_IAR.has(infinitive);
}

/**
 * Infinitivo a partir de um particípio REGULAR em `-ado` (masc. sing., minúsculo). `-ado → -ar`,
 * exceto quando o infinitivo derivado é `-ear` (não-regular). `-ido` NÃO é tratado aqui — é ambíguo
 * entre `-er`/`-ir` e exige a tabela. Retorna `null` quando a regra não se aplica com segurança.
 */
export function infinitiveFromRegularParticiple(participleMascSingLower: string): string | null {
  if (!participleMascSingLower.endsWith("ado")) return null;
  const infinitive = `${participleMascSingLower.slice(0, -3)}ar`;
  return isRegularAr(infinitive) ? infinitive : null;
}

/**
 * As 10 formas de 3ª pessoa de um `-ar` regular. `null` se o infinitivo não for um `-ar` regular
 * (deixando a decisão para a tabela fechada / `unsupported`).
 */
export function regularArConjugation(infinitive: string): Readonly<Record<string, string>> | null {
  if (!isRegularAr(infinitive)) return null;
  const stem = infinitive.slice(0, -2);
  return {
    "pres.3s": `${stem}a`,
    "pres.3p": `${stem}am`,
    "pret.3s": `${stem}ou`,
    "pret.3p": `${stem}aram`,
    "impf.3s": `${stem}ava`,
    "impf.3p": `${stem}avam`,
    "fut.3s": `${infinitive}á`,
    "fut.3p": `${infinitive}ão`,
    "cond.3s": `${infinitive}ia`,
    "cond.3p": `${infinitive}iam`,
  };
}
