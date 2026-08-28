<h1 align="center">
  <br>
  <img src="public/icon-light.svg" alt="Lucid" width="40">
  <br>
  Lucid
  <br>
</h1>

<h4 align="center">LLM proposes. Engine verifies.</h4>

<p align="center">
  A <strong>deterministic auditor</strong> that checks writing against <strong>ISO 24495-1</strong>, the international Plain Language standard — and a working answer to a question every AI writing tool dodges: <em>if a language model rewrote this, who checked the rewrite?</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/ISO_24495--1-1A1813?style=for-the-badge" alt="ISO 24495-1" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/deterministic-0f7b6c?style=for-the-badge" alt="Deterministic" />
</p>

<p align="center">
  <a href="#-the-problem">The problem</a> •
  <a href="#-llm-proposes-engine-verifies">The idea</a> •
  <a href="#-30-seconds">30 seconds</a> •
  <a href="#-what-it-does--what-it-refuses-to-do">Does / Refuses</a> •
  <a href="#-inside-the-engine">Inside</a> •
  <a href="#-run-it">Run it</a> •
  <a href="#-license">License</a>
</p>

<p align="center">
  🔗 <strong>Live demo:</strong> <a href="https://lucid.marianacastro.dev/">lucid.marianacastro.dev</a> · <em>The interface is in Portuguese — the JSON output below is not.</em>
</p>

<br/>

## 🎯 The problem

**Every writing tool is now a language model — and the model that writes is also the model that grades.** Ask an LLM to simplify a contract and it will hand back something that *reads* better. Ask whether the meaning survived, whether a number changed, whether it invented an actor that was never in the source, and the honest answer is: nobody checked. The generator is its own judge.

That is tolerable for a blog post. It is not tolerable for the documents that actually need plain language — benefit rulings, tax notices, court decisions, consent forms — where being *wrong* is worse than being *dense*, and where an organization may have to **prove** what it did, not just assert it.

The usual alternative is a readability score. But "grade 8 reading level" is a single number over syllable counts: it cannot tell you *which sentence* fails, *which rule* it breaks, or *why* — and it happily rewards text that is short, fluent and wrong.

**Lucid takes the third path: separate the writer from the judge, and make the judge deterministic.**

<br/>

## 🧩 LLM proposes. Engine verifies.

Two layers, and a hard fence between them that the build enforces:

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1 — the deterministic engine          THE PRODUCT    │
│  zero LLM · zero network · same input → byte-identical out  │
│  23 detectors, each citing the ISO clause it enforces       │
│  It can judge. It cannot write.                             │
└─────────────────────────────────────────────────────────────┘
                    ▲                        ▲
             verifies│                 verifies│
                    │                        │
        ┌───────────┴──────────┐  ┌──────────┴───────────┐
        │  a human rewrite     │  │  an LLM rewrite      │
        │  (the author)        │  │  (opt-in, Layer 2)   │
        │  It can write.       │  │  It can write.       │
        │  It cannot judge.    │  │  It cannot judge.    │
        └──────────────────────┘  └──────────────────────┘
```

The engine **never writes a word into your document**. It detects, explains, cites the clause, and — when a rewrite shows up, from a person or a model — it re-analyzes and reports what it can *prove* versus what it can only *signal*. No source is privileged: your own edit is judged by exactly the same checks as the model's.

This inverts the usual arrangement. The component that can produce fluent text has no authority. The component with authority has no ability to produce text. **Neither can flatter the other.**

<p align="center">
<img width="3118" height="1950" alt="Lucid's review studio: the document on the left with inline annotations, the audit rail on the right showing the finding, its ISO clause and its justification" src="https://github.com/user-attachments/assets/6ff3d23a-5922-442b-9f2b-522b88699444" />
</p>

<p align="center"><em>The review studio. Left: the document, every finding underlined in place. Right: the selected finding — which criterion fired, which ISO subsection it maps to, and why it hurts the reader.</em></p>

<br/>

## 🚀 30 seconds

You don't need Portuguese to read the output. Here is one sentence of Brazilian officialese:

> **`Foi realizada a análise do documento pela comissão competente em sede de procedimento administrativo.`**
>
> *Word for word: "Was carried out the analysis of the document by the competent committee in the seat of administrative proceeding."*
>
> A plain version would be: **"The committee analyzed the document."**

If that disease looks familiar, that is the point — **bureaucratic language is universal; only its symptoms are local.** English does the same thing with *"it was determined that"* and *"the implementation of."*

```bash
lucid edital.txt --format json
```

Two of the three findings it returns (real output, trimmed):

```jsonc
{
  "criterion": "passive_voice",
  "severity": "warning",
  "source": "iso-24495-1",
  "principleGroup": "understandable",
  "normativeReference": { "standard": "ABNT NBR ISO 24495-1", "section": "5.3.3" },
  "requiresHuman": true,              // the agent is absent — a rule cannot invent who acted
  "span": { "start": 0, "end": 13, "text": "Foi realizada" },
  "position": { "line": 1, "column": 1 }
}
{
  "criterion": "jargon",
  "severity": "warning",
  "normativeReference": { "standard": "ABNT NBR ISO 24495-1", "section": "5.3.2" },
  "requiresHuman": false,
  "suggestion": "no âmbito de",        // a curated 1:1 equivalent, shown — never applied
  "span": { "start": 62, "end": 72, "text": "em sede de" }
}
```

Read what those fields actually promise:

- **`normativeReference`** — the finding cites a clause of a published international standard, not somebody's style preference. It is only present when the criterion genuinely derives from the norm (see [provenance](#provenance-every-finding-declares-its-authority)).
- **`requiresHuman: true`** — the engine detected a passive with no stated agent and **refuses to guess who acted**. It reports the fact and stops. That is a feature, not a gap.
- **`suggestion`** — appears only for a curated, context-free 1:1 equivalent, and is *displayed*, never written into your file.

Every run also stamps `configHash` and `dataHash`. Same text + same config + same lexicons → the same JSON, byte for byte.

<br/>

## 🚦 What it does / what it refuses to do

The refusals are not missing features. They are the design.

| ✅ It does | ❌ It refuses to |
|---|---|
| Locate every violation, with character offsets and `line:column` | Rewrite your document, or apply any edit — ever |
| Cite the ISO clause behind each finding | Invent authority: editorial rules never get a fake clause number |
| Explain, in prose, why the reader is hurt | Emit a grade, a score out of 100, or a pass mark |
| Mark what needs human judgment, **and why** | Guess a missing agent, or swap a word with more than one sense |
| Verify a rewrite — yours or an LLM's — against the same checks | Certify a document as compliant |
| Report what it did **not** look for | Let a silent absence read as an all-clear |
| Show curated equivalents as information | Pretend a lexicon covers a whole language |

**There is no green check anywhere in the system, and the type system enforces it.** The comprehension probe's result type is `flag | neutral` — there is no `approved` variant to return. Passing a floor test is the *absence of one failure*, never evidence of clarity, so the compiler makes "it approved the text" unrepresentable.

<br/>

## 🔬 Inside the engine

### The pipeline is pure

```
analyze(text):
  buildDocument   normalize (NFC) → segment sentences → tokenize → group blocks
  passes          23 deterministic detectors, each emitting findings with provenance
  score           per-criterion counts + density — measures, never approves
  → Diagnostic    { text, findings, score, metrics, meta(configHash, dataHash) }
```

No `Date`, no `Math.random`, no `localeCompare`, no network anywhere in the core — an ESLint rule fails the build if any appear. Findings sort canonically by `(start, end, criterion)`. One NFC normalization at the door. The result is a core that is **testable offline with fixtures** and locked by byte-identical snapshots: any drift is a red build, not a mystery.

### Provenance: every finding declares its authority

Not everything worth flagging is in the standard, and pretending otherwise would be the easiest lie to tell. So each criterion declares where it comes from, and the type system enforces the boundary:

| `source` | Meaning | Gets an ISO clause? |
|---|---|---|
| `iso-24495-1` | Derived from a numbered clause of the standard | **Yes** — `normativeReference` required |
| `editorial-pt-br` | A Portuguese editorial convention, not in the norm | **No** — the field cannot exist |
| `structural-heuristic` | A weak structural signal, honestly labeled | **No** |

`normativeReference ⟺ source === "iso-24495-1"` is a discriminated union: an editorial rule **cannot** be given a clause number, because that code does not compile.

### Generator × verifier

Because the verifier is deterministic and independent, "which model should rewrite this?" stops being a vibe and becomes a measurement. The same referee scores every generator over the same stress texts, separating **PROOF** (deterministic: the target violation is gone, numbers and dates survived, no jargon or first person fabricated) from **SIGNAL** (the probe's non-deterministic read on meaning).

| System | rewrote % | ΔFlesch | proofs OK % | no-veto % | latency ms |
|---|--:|--:|--:|--:|--:|
| llama-3.3-70b · `correct` | 67 | +0.5 | **100** | 100 | 556 |
| llama-3.3-70b · `rewrite` | 100 | **+69.8** | **100** | 67 | 657 |
| gemini-2.5-flash · `correct` | 100 | +16.6 | 67 | 67 | 1440 |
| gemini-2.5-flash · `rewrite` | 100 | **+71.5** | 67 | 33 | 1263 |

The interesting row is the last one. Gemini produced the **biggest readability gain of the whole table** — and the deterministic gate still caught it altering a value or introducing new jargon on the numbers-and-dates text, dropping it to 67% proofs. **Better prose never buys a pass.** That is the entire thesis in one table.

*Caveat, stated because it matters: single run, `temperature 0`, 3 texts. A floor signal, not a leaderboard. The harness is gated off CI ([`test/rewrite-benchmark.test.ts`](test/rewrite-benchmark.test.ts), `BENCHMARK=1`).*

### Reproducibility is `(version, config, data)`

A diagnostic you cannot reproduce is an opinion. Every run is stamped with the engine version, a hash of the active configuration, and a hash of **every curated lexicon that influenced it**. Edit one entry in a jargon list and the `dataHash` changes, the golden snapshot breaks, and the build tells you — automatic governance over the data, not just the code.

### It measures itself, and publishes what it gets wrong

`npm run eval` produces a signed artifact ([`eval/report.json`](eval/report.json)) rendered at [`/avaliacao`](https://lucid.marianacastro.dev/avaliacao). Current measured detectors:

| Detector | Precision | Recall | Coverage |
|---|--:|--:|---|
| `passive_voice` | 1.000 | 0.943 | productive rule |
| `nominalization` | 1.000 | 0.892 | curated lexicon |
| `jargon` | 0.963 | 0.929 | curated lexicon |

Three things about that table are unusual, and deliberate:

1. **Only 3 of 23 detectors are there.** The rest have no honest precision/recall number, so none is invented. The artifact says which is which.
2. **Known limitations count *against* the score.** A false positive we chose not to fix is left in the corpus, so `jargon` publishes 0.963 instead of a prettier 1.000.
3. **The artifact flags its own circular numbers.** Recall for a curated-lexicon detector is measured against a corpus built from that same lexicon — so it reports "the code reads its own list," not "the instrument finds the phenomenon." That caveat ships *inside* the JSON.

Test strength itself is measured: **1393 tests**, with [Stryker](https://stryker-mutator.io/) mutation testing over the criteria. Survivors are triaged into real gaps versus provably-equivalent mutants — because a mutation score you haven't triaged is also just a number.

<br/>

## 📐 Why ISO 24495-1

**ISO 24495-1:2023** is the international standard for Plain Language. Not a style guide, not one government's manual — a published norm with four numbered principles:

| # | Principle | The reader… | Clause |
|---|---|---|---|
| 1 | **Relevant** | gets what they actually need | 5.1 |
| 2 | **Findable** | can locate it | 5.2 |
| 3 | **Understandable** | understands it | 5.3 |
| 4 | **Usable** | can act on it | 5.4 |

Lucid implements the **Brazilian adoption** (`ABNT NBR ISO 24495-1:2024`), which is identical to the ISO text. That matters for anyone reading from elsewhere: the authority behind every finding is the international standard, and a second locale would cite the same clauses.

**The standard explicitly says plain language rests on reader success, not on mechanical formulas.** Rather than treating that as an inconvenience, Lucid uses it to divide the work honestly:

- **Principles 2 and 3 → 23 deterministic detectors.** These are the mechanically checkable ones. This is where rules are strong.
- **Principle 1 → no detector, and there never will be one.** "Relevant *to whom?*" depends on the reader, the purpose, and what the author chose to cut. So Lucid **asks** instead: it poses the standard's own questions, records the answers as the author's declaration, and verifies only what is literally verifiable. Undeclared reads **"not declared"** — never "compliant."
- **Principle 4 → testing with real readers. Lucid does not cover it.** A synthetic floor-reader (the comprehension probe) was built as the cheap floor *before* human testing: it reads *only* the passage, may never use outside knowledge, and reports where it stalls — it can fail a text, never pass one. It is **not exposed in the product**: re-run against the model currently wired in, it failed the recall floor this repo already had (it read "the text does not say" and still reported that it could answer), so shipping it would have implied a coverage nobody validated. The code, the labelled golden set and the harness stay in the tree; the section comes back only when a live meta-eval clears both floors. Until then Principle 4 is answered the way the standard answers it — with human readers.

**Two of four principles are covered by rules, and the README says so** — because a tool that claimed all four would be lying about the two that need a person.

<br/>

## 🇧🇷 Why Portuguese first

Not a limitation — a choice of hard mode, on top of a language-neutral core.

Brazilian officialese has failure modes that no English tool has ever needed to model:

| Phenomenon | Example | What it is in English |
|---|---|---|
| **Mesoclisis** | `far-se-á` | A pronoun infixed *inside* a future-tense verb. English has no equivalent construction. |
| **Synthetic pluperfect** | `fizera` | "had done" in a single word; the irregulars are opaque to any regex |
| **Synthetic passive** | `aplica-se a multa` | A passive built with a clitic, agent structurally absent and ambiguous with the impersonal |
| **Gerundism** | `vai estar enviando` | "will be sending" — a calque of English progressive future, stigmatized in Portuguese |

Handling those required real morphology, not pattern-matching. Rather than hand-writing a conjugator, a build step stream-filters **PortiLexicon-UD** (71 MB) down to an ~850 KB *unambiguous* set: pluperfect forms that never appear with any other reading. `fora` (also an adverb) and `vira` (also a verb) drop out; the opaque irregulars survive. Ambiguity resolved once, offline, so the runtime detector is a membership test.

Meanwhile **the core never imports a locale.** Passes, lexicons, syllable counting, readability and criteria all arrive through a `LocaleBundle`; `dependency-cruiser` fails the build if `core` reaches for `locales`, and a synthetic test locale proves the seam. A second language slots in without a line changing in the pipeline.

Readability likewise reuses rather than rebuilds: **Flesch adapted to Brazilian Portuguese** (Martins et al., 1996), never the English coefficients pointed at a language they were not fitted to.

<br/>

## 💻 Run it

**Layer 1 needs no keys and no network.** It is pure and offline. Only the AI rewrite reads `GROQ_API_KEY` or `GEMINI_API_KEY` (the comprehension probe does too, but it is currently hidden from the interface — see Principle 4 above).

```bash
git clone https://github.com/maricastroc/lucid
cd lucid
npm install
```

### The CLI

```bash
npm run build:cli && npm link     # puts `lucid` on your PATH
lucid document.docx --format json
```

*Honest note on language: the JSON is language-neutral — criterion ids, ISO clauses, severities,
spans, `line:column`. The `justification` prose and the human-readable text output are in Portuguese,
because they are written for the person revising a Portuguese document. You can read the structure
without reading the language.*

Accepts `.txt`, `.md`, `.docx` and stdin. **The exit codes are the honest part:**

| Code | Meaning |
|---|---|
| `0` | the audit ran — **not** "the document passed" |
| `1` | execution failed (unreadable file, bad flag) |
| `2` | **a threshold *you* declared** with `--fail-on` was crossed |

Findings never move the exit code on their own. There is no built-in notion of "too many." If you want CI to fail, you say where the line is:

```bash
lucid drafts/*.docx --fail-on error   # your policy, not the tool's
```

### The studio

```bash
npm run dev     # → http://localhost:3000
```

### The checks

```bash
npm run test        # 1393 Vitest tests + byte-identical golden snapshots
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint (incl. the no-Date/no-random rule inside core)
npm run depcheck    # dependency-cruiser — the layer fence
npm run eval        # regenerate the self-evaluation artifact
npm run mutation:passes   # Stryker over the 23 criteria (~26 min, off CI)
```

<br/>

## 🧰 Tech stack

| Category | Technologies |
|---|---|
| **Deterministic core** | Framework-free TypeScript — pure passes over a canonical document model. No DOM, no React, no network |
| **App** | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| **CLI** | esbuild-bundled single file, Layer 1 only |
| **LLM layer (opt-in)** | Groq + Google Gemini via raw `fetch`, no SDK, `temperature 0`, versioned prompts, behind one interface |
| **Standard** | ISO 24495-1 / ABNT NBR ISO 24495-1:2024 — the sole authority for every `normativeReference` |
| **Reused data** | PortiLexicon-UD (CC-BY 4.0) morphology; Flesch-PT (Martins et al., 1996) |
| **Testing** | Vitest, golden snapshots, **Stryker** mutation testing, **dependency-cruiser** for the layer fence |

<br/>

## 📓 Engineering notes

**Honesty as a compile-time invariant.** The hardest constraint in this project is a *refusal*, and refusals rot unless the compiler holds them. The probe cannot return `approved` because the variant does not exist. An editorial rule cannot cite the standard because the union forbids it. A finding either carries a provably 1:1 curated equivalent or is stamped `requiresHuman`. Keeping that discipline while detectors, an AI rewriter, a CLI and a UI grew around it was the through-line of the whole build.

**Determinism stopped being a testing property and became a product one.** Byte-identical output is table stakes for snapshots. The payoff is elsewhere: it is what makes the rewrite verifier *credible* (a reproducible referee, not a second opinion), what makes a conformance claim defensible, and — unexpectedly — what made structural editing work. When an imported `.docx` is edited, the engine re-applies the edit to the block model and **accepts the result only if the rebuilt source matches the requested text byte for byte**; otherwise it falls back and tells the user. The invariant became a feature.

**Reusing 71 MB, minimally.** Detecting `fizera` needs morphology no regex can supply. Instead of vendoring PortiLexicon-UD, a build step distills it to the unambiguous pluperfect set — the ambiguity resolved once, offline, so runtime stays a plain lookup.

**Why it audits instead of generating.** A frontier model will always out-write a rule engine at "make this simpler." So Lucid stopped competing there and became the referee: it *proves* what got mechanically simpler against the norm, *flags* where meaning may have slipped, and hands the decision back. **The defensible position is the verification, not the generation** — precisely the thing a chat interface cannot be.

<br/>

## 📄 License

The **code** is [MIT](LICENSE) — use, study, fork and build on it, keeping the copyright and license notice.

The **bundled linguistic data** derived from **PortiLexicon-UD** (`mais-que-perfeito.pt.json`, `adverbios-mente.pt.json`) is a derivative work under **CC-BY 4.0** — attribution required; see [`src/locales/pt-BR/datasets/README.md`](src/locales/pt-BR/datasets/README.md).

© 2025–2026 Mariana Castro

<br/>

<div align="center">

⭐ If this project is useful to you, give it a star.

</div>
