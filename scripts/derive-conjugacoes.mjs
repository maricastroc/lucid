/**
 * GERAÇÃO (build-time) da tabela FECHADA de conjugação ativa usada pela conversão voz
 * passiva→ativa do Tier 2 (ADR-032). NUNCA roda em runtime — o runtime só lê o JSON gerado.
 *
 * Fonte: lista CURADA de verbos do domínio administrativo/jurídico + as regras de flexão
 * REGULARES da 3ª pessoa (exatas para verbos regulares) + irregulares VERIFICADOS à mão. Só
 * as 10 formas que a detecção consegue provar (3ª pessoa sing/plural × 5 tempos simples do
 * indicativo/condicional). Recomenda-se validação cruzada com PortiLexicon-UD (CC-BY 4.0) ao
 * expandir a lista — mesma fonte já usada em `mais-que-perfeito`/`adverbios-mente`.
 *
 * Uso:  node scripts/derive-conjugacoes.mjs > src/locales/pt-BR/datasets/conjugacoes-ativas.pt.json
 * (a poda de ambiguidade e a expansão a partir do VERB.tsv ficam como próximo incremento).
 */

// Verbos REGULARES que a tabela materializa. Os `-ar` regulares NÃO entram aqui — são resolvidos
// em runtime pela regra determinística (`regular-morphology.ts`, ADR-032), pois as exceções do
// `-ar` (`-ear`, MÁRIO `-iar`, `dar/estar`) são um conjunto fechado. A tabela guarda SÓ o que a
// regra não cobre com segurança: `-er`/`-ir` (particípio `-ido` ambíguo) + irregulares.
const REGULAR = [
  // -er
  "receber", "resolver", "proceder", "submeter", "estabelecer", "reconhecer", "escrever", "vender",
  "fornecer", "atender", "conceder", "promover", "prometer",
  // -ir
  "decidir", "deferir", "indeferir", "definir", "exigir", "expedir", "admitir", "remitir",
  "discutir", "permitir", "assistir", "emitir", "transmitir", "corrigir", "cumprir", "suprir",
];

// Irregulares — 3ª pessoa VERIFICADA à mão. { lemma: { "pres.3s": …, "pres.3p": …, … } }
const IRREGULAR = {
  fazer:  { "pres.3s": "faz",   "pres.3p": "fazem",  "pret.3s": "fez",   "pret.3p": "fizeram",  "impf.3s": "fazia",  "impf.3p": "faziam",  "fut.3s": "fará",   "fut.3p": "farão",   "cond.3s": "faria",   "cond.3p": "fariam" },
  dizer:  { "pres.3s": "diz",   "pres.3p": "dizem",  "pret.3s": "disse", "pret.3p": "disseram", "impf.3s": "dizia",  "impf.3p": "diziam",  "fut.3s": "dirá",   "fut.3p": "dirão",   "cond.3s": "diria",   "cond.3p": "diriam" },
  ver:    { "pres.3s": "vê",    "pres.3p": "veem",   "pret.3s": "viu",   "pret.3p": "viram",    "impf.3s": "via",    "impf.3p": "viam",    "fut.3s": "verá",   "fut.3p": "verão",   "cond.3s": "veria",   "cond.3p": "veriam" },
  dar:    { "pres.3s": "dá",    "pres.3p": "dão",    "pret.3s": "deu",   "pret.3p": "deram",    "impf.3s": "dava",   "impf.3p": "davam",   "fut.3s": "dará",   "fut.3p": "darão",   "cond.3s": "daria",   "cond.3p": "dariam" },
  ter:    { "pres.3s": "tem",   "pres.3p": "têm",    "pret.3s": "teve",  "pret.3p": "tiveram",  "impf.3s": "tinha",  "impf.3p": "tinham",  "fut.3s": "terá",   "fut.3p": "terão",   "cond.3s": "teria",   "cond.3p": "teriam" },
  "pôr":  { "pres.3s": "põe",   "pres.3p": "põem",   "pret.3s": "pôs",   "pret.3p": "puseram",  "impf.3s": "punha",  "impf.3p": "punham",  "fut.3s": "porá",   "fut.3p": "porão",   "cond.3s": "poria",   "cond.3p": "poriam" },
  prever: { "pres.3s": "prevê", "pres.3p": "preveem","pret.3s": "previu","pret.3p": "previram", "impf.3s": "previa", "impf.3p": "previam", "fut.3s": "preverá","fut.3p": "preverão","cond.3s": "preveria", "cond.3p": "preveriam" },
  rever:  { "pres.3s": "revê",  "pres.3p": "reveem", "pret.3s": "reviu", "pret.3p": "reviram",  "impf.3s": "revia",  "impf.3p": "reviam",  "fut.3s": "reverá", "fut.3p": "reverão", "cond.3s": "reveria",  "cond.3p": "reveriam" },
  propor: { "pres.3s": "propõe","pres.3p": "propõem","pret.3s": "propôs","pret.3p": "propuseram","impf.3s": "propunha","impf.3p": "propunham","fut.3s": "proporá","fut.3p": "proporão","cond.3s": "proporia","cond.3p": "proporiam" },
  manter: { "pres.3s": "mantém","pres.3p": "mantêm", "pret.3s": "manteve","pret.3p": "mantiveram","impf.3s": "mantinha","impf.3p": "mantinham","fut.3s": "manterá","fut.3p": "manterão","cond.3s": "manteria","cond.3p": "manteriam" },
  obter:  { "pres.3s": "obtém", "pres.3p": "obtêm",  "pret.3s": "obteve","pret.3p": "obtiveram", "impf.3s": "obtinha","impf.3p": "obtinham","fut.3s": "obterá", "fut.3p": "obterão", "cond.3s": "obteria",  "cond.3p": "obteriam" },
};

function conjugateRegular(inf) {
  const stem = inf.slice(0, -2);
  const ending = inf.slice(-2);
  if (ending === "ar") {
    return {
      "pres.3s": `${stem}a`, "pres.3p": `${stem}am`,
      "pret.3s": `${stem}ou`, "pret.3p": `${stem}aram`,
      "impf.3s": `${stem}ava`, "impf.3p": `${stem}avam`,
      "fut.3s": `${inf}á`, "fut.3p": `${inf}ão`,
      "cond.3s": `${inf}ia`, "cond.3p": `${inf}iam`,
    };
  }
  if (ending === "er") {
    return {
      "pres.3s": `${stem}e`, "pres.3p": `${stem}em`,
      "pret.3s": `${stem}eu`, "pret.3p": `${stem}eram`,
      "impf.3s": `${stem}ia`, "impf.3p": `${stem}iam`,
      "fut.3s": `${inf}á`, "fut.3p": `${inf}ão`,
      "cond.3s": `${inf}ia`, "cond.3p": `${inf}iam`,
    };
  }
  if (ending === "ir") {
    return {
      "pres.3s": `${stem}e`, "pres.3p": `${stem}em`,
      "pret.3s": `${stem}iu`, "pret.3p": `${stem}iram`,
      "impf.3s": `${stem}ia`, "impf.3p": `${stem}iam`,
      "fut.3s": `${inf}á`, "fut.3p": `${inf}ão`,
      "cond.3s": `${inf}ia`, "cond.3p": `${inf}iam`,
    };
  }
  throw new Error(`terminação não regular: ${inf}`);
}

const verbs = {};
for (const inf of [...new Set(REGULAR)].sort()) verbs[inf] = conjugateRegular(inf);
for (const [inf, forms] of Object.entries(IRREGULAR)) verbs[inf] = forms;

// chaves ordenadas → JSON estável (fingerprint reprodutível)
const sortedVerbs = {};
for (const lemma of Object.keys(verbs).sort()) sortedVerbs[lemma] = verbs[lemma];

const out = {
  _comentario:
    "Tabela FECHADA de conjugação ativa (3ª pessoa sing/plural × pres/pret/impf/fut/cond) usada SOMENTE pela conversão voz passiva→ativa do Tier 2 (ADR-032). GERADA em build-time por scripts/derive-conjugacoes.mjs — regulares por regra exata, irregulares verificados à mão. Runtime nunca conjuga: combinação ausente ⇒ conversão 'unsupported'.",
  _fonte:
    "Verbos regulares: flexão de 3ª pessoa por regra determinística. Irregulares: curadoria própria verificada. Recomenda-se validação cruzada / expansão com PortiLexicon-UD (CC-BY 4.0, ICMC-USP/NILC).",
  verbs: sortedVerbs,
};

process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
