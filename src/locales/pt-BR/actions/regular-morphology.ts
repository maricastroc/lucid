const MARIO_IAR = new Set(["mediar", "ansiar", "remediar", "incendiar", "odiar"]);

function isRegularAr(infinitive: string): boolean {
  return infinitive.endsWith("ar") && !infinitive.endsWith("ear") && !MARIO_IAR.has(infinitive);
}

export function infinitiveFromRegularParticiple(participleMascSingLower: string): string | null {
  if (!participleMascSingLower.endsWith("ado")) return null;
  const infinitive = `${participleMascSingLower.slice(0, -3)}ar`;
  return isRegularAr(infinitive) ? infinitive : null;
}

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
