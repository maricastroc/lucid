/**
 * GERAÇÃO + VALIDAÇÃO (build-time) das tabelas FECHADAS de voz passiva→ativa do Tier 2 (ADR-032/033).
 * NUNCA roda em runtime — o runtime só lê os JSON gerados.
 *
 * Fonte das FORMAS: PortiLexicon-UD (CC-BY 4.0, ICMC-USP/NILC; HF `NILC-ICMC-USP/PortiLexicon-UD`,
 * `VERB.tsv`, colunas `forma⇥lema⇥FEATS` no padrão Universal Dependencies). A LISTA de lemas continua
 * CURADA por domínio (admin/jurídico) — a decisão de "quais verbos cobrir" é humana; o que o léxico
 * fornece é a FORMA correta de cada um (ADR-033: curada + validada pelo léxico). Assim, adicionar um
 * verbo à cobertura vira só "pôr o lema na lista": as 10 formas saem do léxico, e os regulares `-er`/
 * `-ir` ainda são cross-validados contra a regra de flexão — some o risco de digitar forma irregular
 * errada à mão. Só as 10 formas que a detecção consegue provar (3ª pessoa sing/plural × 5 tempos
 * simples do indicativo/condicional).
 *
 * Os `-ar` regulares NÃO entram aqui — são resolvidos em runtime pela regra determinística
 * (`actions/regular-morphology.ts`, ADR-033), pois as exceções do `-ar` (`-ear`, MÁRIO `-iar`,
 * `dar/estar`) são um conjunto fechado. A tabela guarda SÓ o que a regra não cobre com segurança:
 * `-er`/`-ir` (particípio `-ido` ambíguo) + irregulares.
 *
 * Este script também VALIDA `participios-infinitivo.pt.json` (particípio→infinitivo do andaime de
 * passiva): cada entrada é conferida contra o léxico (o particípio, como `VerbForm=Part`, tem de ter
 * o infinitivo curado entre seus lemas). É a desambiguação `-ido` (`recebido→receber` vs
 * `partido→partir`) feita pela autoridade do léxico, não à mão.
 *
 * Uso:  VERB_TSV=/caminho/para/VERB.tsv node scripts/derive-conjugacoes.mjs
 *   Baixe o VERB.tsv (71 MB, CC-BY 4.0) uma vez, fora do repo:
 *   curl -sL "https://huggingface.co/spaces/NILC-ICMC-USP/PortiLexicon-UD/resolve/main/VERB.tsv" -o VERB.tsv
 *   O script escreve `conjugacoes-ativas.pt.json` e falha (exit≠0) se qualquer forma ou
 *   desambiguação divergir do léxico. Chaves ordenadas → JSON estável (fingerprint reprodutível).
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATASETS = path.join(HERE, "..", "src", "locales", "pt-BR", "datasets");
const CONJ_OUT = path.join(DATASETS, "conjugacoes-ativas.pt.json");
const PART_IN = path.join(DATASETS, "participios-infinitivo.pt.json");

// ── Lista CURADA de lemas cobertos (só `-er`/`-ir` + irregulares; `-ar` regular fica na regra) ──
const REGULAR = [
  // -er
  "receber", "resolver", "proceder", "submeter", "estabelecer", "reconhecer", "escrever", "vender",
  "fornecer", "atender", "conceder", "promover", "prometer",
  // -ir
  "decidir", "deferir", "indeferir", "definir", "exigir", "expedir", "admitir", "remitir",
  "discutir", "permitir", "assistir", "emitir", "transmitir", "corrigir", "cumprir", "suprir",
];

// Irregulares — só o LEMA; as formas vêm do léxico. `dar` é `-ar` irregular (fora da regra `-ar`).
const IRREGULAR_LEMMAS = [
  "fazer", "dizer", "ver", "dar", "ter", "pôr", "prever", "rever", "propor", "manter", "obter",
];

const CURATED = [...new Set([...REGULAR, ...IRREGULAR_LEMMAS])];
const REGULAR_SET = new Set(REGULAR);

// Ordem CANÔNICA das 10 formas emitidas (fingerprint estável).
const FEATURE_ORDER = [
  "pres.3s", "pres.3p", "pret.3s", "pret.3p", "impf.3s", "impf.3p",
  "fut.3s", "fut.3p", "cond.3s", "cond.3p",
];

// traço → predicado sobre os FEATS (já pré-filtrado por Person=3, VerbForm=Fin).
const FEATURE_MATCH = {
  "pres.3s": (f) => f.Mood === "Ind" && f.Tense === "Pres" && f.Number === "Sing",
  "pres.3p": (f) => f.Mood === "Ind" && f.Tense === "Pres" && f.Number === "Plur",
  "pret.3s": (f) => f.Mood === "Ind" && f.Tense === "Past" && f.Number === "Sing",
  "pret.3p": (f) => f.Mood === "Ind" && f.Tense === "Past" && f.Number === "Plur",
  "impf.3s": (f) => f.Mood === "Ind" && f.Tense === "Imp" && f.Number === "Sing",
  "impf.3p": (f) => f.Mood === "Ind" && f.Tense === "Imp" && f.Number === "Plur",
  "fut.3s": (f) => f.Mood === "Ind" && f.Tense === "Fut" && f.Number === "Sing",
  "fut.3p": (f) => f.Mood === "Ind" && f.Tense === "Fut" && f.Number === "Plur",
  "cond.3s": (f) => f.Mood === "Cnd" && f.Number === "Sing",
  "cond.3p": (f) => f.Mood === "Cnd" && f.Number === "Plur",
};

/** Regra de flexão de 3ª pessoa para `-er`/`-ir` REGULAR — usada só para CROSS-VALIDAR o léxico. */
function ruleRegular(inf) {
  const stem = inf.slice(0, -2);
  const ending = inf.slice(-2);
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
  throw new Error(`ruleRegular só cobre -er/-ir: ${inf}`);
}

function parseFeats(feats) {
  const out = {};
  for (const kv of feats.split("|")) {
    const eq = kv.indexOf("=");
    if (eq > 0) out[kv.slice(0, eq)] = kv.slice(eq + 1);
  }
  return out;
}

async function main() {
  const tsvPath = process.env.VERB_TSV ?? process.argv[2];
  if (!tsvPath) {
    console.error(
      "ERRO: informe o VERB.tsv do PortiLexicon-UD via env VERB_TSV ou 1º argumento.\n" +
        '  curl -sL "https://huggingface.co/spaces/NILC-ICMC-USP/PortiLexicon-UD/resolve/main/VERB.tsv" -o VERB.tsv\n' +
        "  VERB_TSV=./VERB.tsv node scripts/derive-conjugacoes.mjs",
    );
    process.exit(2);
  }
  if (!fs.existsSync(tsvPath)) {
    console.error(`ERRO: VERB.tsv não encontrado em ${tsvPath}`);
    process.exit(2);
  }

  const curatedSet = new Set(CURATED);
  const participleMap = JSON.parse(fs.readFileSync(PART_IN, "utf8")).map;
  const participleKeys = new Set(Object.keys(participleMap));

  // lema → { traço → forma }   (só lemas curados)
  const lexForms = new Map(CURATED.map((l) => [l, {}]));
  // particípio (superfície) → Set<lema>   (só particípios da tabela a validar)
  const partLemmas = new Map([...participleKeys].map((p) => [p, new Set()]));

  const rl = readline.createInterface({ input: fs.createReadStream(tsvPath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    const tab1 = line.indexOf("\t");
    const tab2 = line.indexOf("\t", tab1 + 1);
    if (tab1 < 0 || tab2 < 0) continue;
    const form = line.slice(0, tab1);
    const lemma = line.slice(tab1 + 1, tab2);
    const featsRaw = line.slice(tab2 + 1);

    // Conjugação: 3ª pessoa finita de um lema curado.
    if (curatedSet.has(lemma) && featsRaw.includes("Person=3") && featsRaw.includes("VerbForm=Fin")) {
      const f = parseFeats(featsRaw);
      for (const key of FEATURE_ORDER) {
        if (FEATURE_MATCH[key](f)) {
          const slot = lexForms.get(lemma);
          if (slot[key] && slot[key] !== form) {
            throw new Error(`léxico ambíguo: ${lemma} ${key} = ${slot[key]} vs ${form}`);
          }
          slot[key] = form;
        }
      }
    }

    // Particípio a validar: superfície na tabela participios-infinitivo.
    if (featsRaw.includes("VerbForm=Part") && partLemmas.has(form)) {
      partLemmas.get(form).add(lemma);
    }
  }

  const errors = [];
  const warnings = [];

  // ── Montagem + validação das conjugações ──
  const verbs = {};
  for (const lemma of [...CURATED].sort()) {
    const slot = lexForms.get(lemma);
    const forms = {};
    for (const key of FEATURE_ORDER) {
      const form = slot[key];
      if (!form) {
        errors.push(`conjugação: ${lemma} sem forma para ${key} no léxico`);
        continue;
      }
      forms[key] = form;
    }
    // Cross-validação dos regulares -er/-ir: léxico tem de bater com a regra de flexão.
    if (REGULAR_SET.has(lemma)) {
      const byRule = ruleRegular(lemma);
      for (const key of FEATURE_ORDER) {
        if (slot[key] && slot[key] !== byRule[key]) {
          errors.push(`regular ${lemma} ${key}: léxico=${slot[key]} ≠ regra=${byRule[key]}`);
        }
      }
    }
    verbs[lemma] = forms;
  }

  // ── Validação de participios-infinitivo contra o léxico ──
  for (const [participle, infinitive] of Object.entries(participleMap)) {
    const lemmas = partLemmas.get(participle) ?? new Set();
    if (!lemmas.has(infinitive)) {
      errors.push(
        `participio: "${participle}" → "${infinitive}" não confirmado no léxico ` +
          `(lemas de particípio no léxico: ${[...lemmas].join(", ") || "nenhum"})`,
      );
    } else if (lemmas.size > 1) {
      warnings.push(
        `participio: "${participle}" é particípio de {${[...lemmas].sort().join(", ")}}; ` +
          `curadoria escolheu "${infinitive}"`,
      );
    }
  }

  for (const w of warnings) console.error(`AVISO  ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`ERRO   ${e}`);
    console.error(`\n${errors.length} divergência(s) contra o léxico — nada escrito.`);
    process.exit(1);
  }

  const out = {
    _comentario:
      "Tabela FECHADA de conjugação ativa (3ª pessoa sing/plural × pres/pret/impf/fut/cond) usada SOMENTE pela conversão voz passiva→ativa do Tier 2 (ADR-032/033). GERADA em build-time por scripts/derive-conjugacoes.mjs — lista de lemas CURADA (só -er/-ir + irregulares; -ar regular fica na regra de runtime), FORMAS extraídas de PortiLexicon-UD e regulares -er/-ir cross-validados contra a regra de flexão. Runtime nunca conjuga: combinação ausente ⇒ conversão 'unsupported'.",
    _fonte:
      "Formas de 3ª pessoa EXTRAÍDAS de PortiLexicon-UD (VERB.tsv, filtrado por Mood/Tense/Person/Number no padrão UD); regulares -er/-ir cross-validados contra regra determinística. Contém dados derivados de PortiLexicon-UD (Lucelene Lopes, Magali Duran, Paulo Fernandes, Thiago Pardo), licenciado sob CC-BY 4.0. https://portilexicon.icmc.usp.br/ · https://aclanthology.org/2022.lrec-1.715/",
    verbs,
  };

  fs.writeFileSync(CONJ_OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.error(
    `OK: ${Object.keys(verbs).length} verbos escritos em conjugacoes-ativas.pt.json; ` +
      `${Object.keys(participleMap).length} particípios validados` +
      (warnings.length ? ` (${warnings.length} aviso[s] de desambiguação)` : "") +
      ".",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
