const MARIO_IAR = new Set(["mediar", "ansiar", "remediar", "incendiar", "odiar"]);

function isRegularAr(infinitive: string): boolean {
  return infinitive.endsWith("ar") && !infinitive.endsWith("ear") && !MARIO_IAR.has(infinitive);
}

export function infinitiveFromRegularParticiple(participleMascSingLower: string): string | null {
  if (!participleMascSingLower.endsWith("ado")) return null;
  const infinitive = `${participleMascSingLower.slice(0, -3)}ar`;
  return isRegularAr(infinitive) ? infinitive : null;
}
