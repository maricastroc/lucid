import { assistida, flat, metaBool, metaNum, metaStr, type NarrativeSet } from "./narrative-types";

const DOMAIN_EN: Record<string, string> = {
  administrative: "administrative",
  legal: "legal",
  general: "technical",
};

export const NARRATIVE_EN: NarrativeSet = {
  long_sentence: {
    headline: (f) => {
      const w = metaNum(f, "words");
      return w != null ? `Long sentence · ${w} words` : "Long sentence";
    },
    prose: (f) => {
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      if (w == null || th == null) return "This sentence is too long to read comfortably.";
      return `This sentence has ${w} words. For easier reading, we recommend sentences of up to ${th} words.`;
    },
    confidence: (f) => {
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      return assistida(
        `The tool measures length exactly${
          w != null && th != null ? ` (${w} words against a threshold of ${th})` : ""
        }, but it does not decide what is superfluous or where to cut — that is the author's work (Principle 1). What it can do is locate where the sentence could split; the choice is yours.`,
      );
    },
  },
  passive_voice: {
    headline: (f) =>
      metaStr(f, "eventiveness") === "ambiguous_present"
        ? "This may be the passive voice"
        : metaBool(f, "hasAgent")
          ? "Passive voice with agent"
          : "Passive voice without agent",
    prose: (f) => {
      const passage = `«${flat(f.span.text)}» combines a form of the verb “ser” with a participle.`;
      if (metaStr(f, "eventiveness") === "ambiguous_present") {
        return `${passage} In the present with no agent, the same construction carries an action undergone, a state and a plain characteristic alike — and the tool tells none of the three apart.`;
      }
      return `${passage} ${
        metaBool(f, "hasAgent")
          ? "The agent appears in the passage itself."
          : "The text does not say who performed the action."
      }`;
    },
    confidence: (f) =>
      assistida(
        metaStr(f, "eventiveness") === "ambiguous_present"
          ? `Before rewriting, settle what the sentence does: if it describes an action, the active voice asks you to say who performs it; if it describes a state or a characteristic, there is no passive here and the point can be marked as seen. That reading is yours — the tool only points at the construction.`
          : metaBool(f, "hasAgent")
            ? `The agent is in the text, so the information exists — but turning it active means reordering subject and object and reconjugating the verb. That is outside any mechanical guarantee: the tool builds the scaffolding, the final sentence is yours.`
            : `Beyond reordering and reconjugating, the agent is not in the text here: rewriting in the active voice would mean inventing who performed the action. The tool refuses to fabricate and hands the decision back to you.`,
      ),
  },
  passiva_sintetica: {
    headline: () => "Synthetic passive (“se”)",
    prose: (f) =>
      metaStr(f, "position") === "proclitic"
        ? `«${flat(f.span.text)}» puts the “se” before the verb: the action exists, but the text does not say who performs it (“não se aplica a multa” — who applies it?). The detector only marks proclisis after a word that forces it (“${metaStr(f, "attractor") ?? "não"}”, here), a position where the “se” cannot be the conditional; and it excludes inherently pronominal verbs (trata-se, refere-se…).`
        : `«${flat(f.span.text)}» uses the enclitic “se”: the action exists, but the text does not say who performs it (“aplica-se a multa” — who applies it?). The detector marks the enclitic “verb-se” form and excludes inherently pronominal verbs (trata-se, refere-se…).`,
    confidence: () =>
      assistida(
        `The “se” is ambiguous — it can be a passive, an indeterminate subject, or a reflexive. The tool does not resolve that ambiguity and does not invent the agent: it flags the construction and hands the decision back to you.`,
      ),
  },
  nominalization: {
    headline: (f) => {
      const base = metaStr(f, "baseVerb");
      return base ? `Nominalization of “${base}”` : "Nominalization";
    },
    prose: (f) => {
      const base = metaStr(f, "baseVerb");
      return `The action${base ? ` of the verb “${base}”` : ""} appears disguised as a noun, attached to a light verb — which lengthens the sentence and pulls the verb away from its meaning.`;
    },
    confidence: (f) => {
      const base = metaStr(f, "baseVerb");
      if (!f.requiresHuman)
        return assistida(
          `The mapping to the verb${base ? ` “${base}”` : ""} is unique and comes from a curated lexicon — but reconjugating and adjusting the complement is writing, and the engine does not write. Give the action back to the verb in your own edit, or ask the AI for the rewrite; the engine verifies the result.`,
        );
      return assistida(
        `The construction was detected, but mapping this word to a single verb is not safe (more than one sense is possible). Choosing the verb${base ? ` — perhaps “${base}” —` : ""} is your decision; the tool does not choose for you.`,
      );
    },
  },
  jargon: {
    headline: (f) => `${DOMAIN_EN[metaStr(f, "domain") ?? ""] ?? "Technical"} jargon`,
    prose: (f) =>
      `«${flat(f.span.text)}» is listed in the curated glossary as ${
        DOMAIN_EN[metaStr(f, "domain") ?? ""] ?? "technical"
      } vocabulary, unfamiliar to readers outside that domain.`,
    confidence: (f) => {
      if (f.suggestion !== undefined)
        return {
          level: "segura",
          rationale: `“${flat(f.span.text)}” is in the curated glossary with a single, context-independent equivalent; swapping it for “${f.suggestion}” preserves government and requires no reconjugation. It is a 1:1 substitution — the tool vouches for the equivalence; making the swap in the text is yours.`,
        };
      return assistida(
        `There is a simpler equivalent, but the swap depends on what follows in the sentence: applying it blindly could break agreement. The tool detects it and points the way, but leaves the swap to you.`,
      );
    },
  },
  sigla_sem_expansao: {
    headline: (f) => {
      const a = metaStr(f, "acronym");
      return a ? `Unexpanded acronym · “${a}”` : "Unexpanded acronym";
    },
    prose: (f) => {
      const a = metaStr(f, "acronym");
      return `The acronym${a ? ` “${a}”` : ""} appears without having been spelled out before this occurrence. The detector marks only the FIRST undefined use, and ignores state codes, units and universal acronyms (CPF, CEP…).`;
    },
    confidence: () =>
      assistida(
        `The tool locates the first undefined occurrence exactly, but writing the name out — “Nome Por Extenso (SIGLA)” — is your writing; it does not know what the acronym stands for and will not invent the expansion.`,
      ),
  },
  subordinacao_densa: {
    headline: (f) => {
      const c = metaNum(f, "clauses");
      return c != null ? `Dense subordination · ${c} clauses` : "Dense subordination";
    },
    prose: (f) => {
      const c = metaNum(f, "clauses");
      const th = metaNum(f, "threshold");
      return `This sentence chains ${c ?? "several"} subordinate clauses${
        th != null ? ` (threshold: ${th})` : ""
      }. The detector counts unambiguous subordinating connectives — it does not interpret content, and deliberately ignores the ambiguous ones (“que”, “se”, “caso”…).`;
    },
    confidence: (f) => {
      const c = metaNum(f, "clauses");
      return assistida(
        `The tool counts subordinating connectives exactly${
          c != null ? ` (${c} in this sentence)` : ""
        }, but separating the clauses means deciding what becomes its own sentence and reconjugating — the author's work (Principle 1). It points at the density; the rewrite is yours.`,
      );
    },
  },
  leitor_terceira_pessoa: {
    headline: (f) => {
      const noun = metaStr(f, "readerNoun");
      return noun ? `Indirect address · “${noun}”` : "Talking about the reader";
    },
    prose: (f) => {
      const noun = metaStr(f, "readerNoun");
      const verb = metaStr(f, "deonticVerb");
      return `The text names the reader in the third person${noun ? ` (“${noun}”)` : ""}${
        verb ? ` and assigns them an obligation (“${verb}”)` : ""
      } — it speaks ABOUT the reader instead of WITH them. The detector requires a subject plus a deontic verb, so “tem direitos” (no obligation) does not fire.`;
    },
    confidence: () =>
      assistida(
        `The tool recognizes the reader-noun in subject position with a verb of obligation — but switching to “você” or the imperative changes the person and the register of the text, a stylistic decision for the author. It is a weak signal (info): it points, it does not correct.`,
      ),
  },
  salto_de_nivel_titulo: {
    headline: (f) => {
      const l = metaNum(f, "level");
      const p = metaNum(f, "prevLevel");
      return l != null && p != null ? `Heading skip · level ${p}→${l}` : "Heading level skip";
    },
    prose: (f) => {
      const l = metaNum(f, "level");
      const p = metaNum(f, "prevLevel");
      return `The heading hierarchy jumps from level ${p ?? "the previous"} to ${l ?? "the next"}, without the intermediate step. The detector reads the heading LEVELS — it only exists because the document is structured (a .docx carries that markup; plain text has no real headings).`;
    },
    confidence: () =>
      assistida(
        `The tool reads heading levels exactly, but deciding whether this heading should move up a level or whether an intermediate heading is missing depends on how the content is organized — the author's work.`,
      ),
  },
  nominalizacao_encadeada: {
    headline: (f) => (metaStr(f, "kind") === "chain" ? "Chained nominalizations" : "Concentrated nominalizations"),
    prose: (f) =>
      metaStr(f, "kind") === "chain"
        ? `«${flat(f.span.text)}» hides the action in a noun that governs another abstract noun through “de” — the sentence stacks abstractions instead of saying who does what.`
        : `The sentence concentrates ${metaNum(f, "count") ?? "several"} action nouns — each one hides a verb, and the pile-up weighs the reading down.`,
    confidence: () =>
      assistida(
        `Detection is by curated lexicon and adjacency — no interpretation. But undoing a nominalization means giving the action back to the verb and saying who performs it, which changes the structure of the sentence; the tool neither rewrites nor invents the agent.`,
      ),
  },
  mais_que_perfeito_sintetico: {
    confidence: () =>
      assistida(
        `The form is correct, but the synthetic pluperfect (“fizera”) sounds archaic and stalls the reader. The compound form (“tinha feito”) is clearer — swapping requires reconjugating with the auxiliary, which the tool does not do on its own.`,
      ),
  },
  gerundismo: {
    confidence: () =>
      assistida(
        `The chained gerund (“vamos estar enviando”) lengthens without informing. The simple future or the present (“enviaremos”, “enviamos”) says the same in fewer words — but rewriting changes the verb form, and that is your decision.`,
      ),
  },
  adverbio_mente_denso: {
    confidence: () =>
      assistida(
        `Discontinued criterion (ADR-058): it counts -mente adverbs by density. Replaced by “Vague adverbs”, which targets the smoke-screen adverb itself. Off by default.`,
      ),
  },
  adverbios_vagos: {
    confidence: () =>
      assistida(
        `The tool recognizes the vague adverb from a curated lexicon, but deciding whether cutting it weakens or cleans the sentence depends on the emphasis you want — which is why it is a weak signal (info) that points rather than corrects.`,
      ),
  },
  redundancia: {
    confidence: () =>
      assistida(
        `The tool recognizes the redundant pair, but choosing which term to cut is your decision — which is why it names the leaner form in the justification instead of applying it.`,
      ),
  },
  perifrase_inflada: {
    confidence: () =>
      assistida(
        `The periphrasis has an equivalent lean form, but swapping it can change the government of what follows — the tool points at the direct form and leaves the swap to you.`,
      ),
  },
  paragraph_length: {
    confidence: () =>
      assistida(
        `The tool counts the paragraph's sentences exactly, but where to break it into smaller blocks depends on how the ideas are organized — an author's decision.`,
      ),
  },
  prose_enumeration: {
    confidence: () =>
      assistida(
        `The tool recognizes the enumeration embedded in the prose, but turning it into a list is a formatting decision that changes the structure of the text — yours.`,
      ),
  },
  mesoclise: {
    confidence: () =>
      assistida(
        `Mesoclisis (“far-se-á”) is correct, but rare, and it stalls the reading. Rewriting without it (“será feito”, “vai fazer”) changes the construction — the author's work, not a mechanical swap.`,
      ),
  },
  dupla_negacao: {
    confidence: () =>
      assistida(
        `The tool recognizes the litotes (“não é incomum”), but asserting it directly (“é comum”) may change the nuance you intended — which is why it points at the direct form and leaves the decision to you.`,
      ),
  },
  long_heading: {
    headline: (f) => {
      const w = metaNum(f, "words");
      return metaStr(f, "reason") === "length" && w != null ? `Long heading · ${w} words` : "Long heading";
    },
    confidence: () =>
      assistida(
        `The tool measures the heading (words, number of sentences, final punctuation) exactly, but shortening or reshaping it into a label depends on what is essential for the reader — the author's work.`,
      ),
  },
  single_item_list: {
    confidence: () =>
      assistida(
        `The tool recognizes the one-item list, but deciding between completing the list and dissolving it into running text depends on the content — an author's decision.`,
      ),
  },
  heading_body_mismatch: {
    headline: () => "Heading with no echo in the body",
    prose: (f) => {
      const hw = metaNum(f, "headingContentWords");
      const bw = metaNum(f, "bodyContentWords");
      return (
        `No content word from this heading reappears in the ${bw ?? "several"} content words of the section ` +
        `(the heading has ${hw ?? "few"}). The comparison normalizes plural/singular (documentos ≈ documento), but ` +
        "it does not relate derivations or synonyms; it is a weak proxy for findability, not proof that the heading is wrong."
      );
    },
    confidence: () =>
      assistida(
        `This is the weakest signal in the tool: a deterministic proxy (word overlap), not a reading of meaning. Deciding whether the heading needs to change — and to what — is the author's work; the tool does not rewrite headings.`,
      ),
  },
};
