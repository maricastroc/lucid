<h1 align="center">
  <br>
  <img src="public/icon-light.svg" alt="Lucid" width="40">
  <br>
  Lucid
  <br>
</h1>

<h4 align="center">Every finding, traced to its criterion and its source.</h4>

<p align="center">
  A <strong>deterministic text auditor</strong>. Every finding names the criterion that fired and the source that criterion rests on — a clause of <strong>ISO 24495-1</strong>, a declared editorial convention, a structural heuristic or your organisation's own vocabulary — and the same input always produces the same output.
</p>

<p align="center">
  <a href="https://github.com/maricastroc/lucid/actions/workflows/ci.yml"><img src="https://github.com/maricastroc/lucid/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
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
  <a href="#-30-seconds">30 seconds</a> •
  <a href="#-the-engine-judges-the-model-proposes">The idea</a> •
  <a href="#-what-it-does--what-it-refuses-to-do">Does / Refuses</a> •
  <a href="#-it-measures-itself">Measured</a> •
  <a href="#-inside-the-engine">Inside</a> •
  <a href="#-run-it">Run it</a>
</p>

<p align="center">
  🔗 <strong>Live demo:</strong> <a href="https://lucid.marianacastro.dev/">lucid.marianacastro.dev</a> · <em>Interface in Portuguese or English; the analysis is Portuguese, with an experimental US-English catalogue in the studio.</em>
</p>

<br/>

## 🎯 The problem

**A writing check is only as good as its answer to _"says who?"_.** A style checker flags a passive without saying on what authority. A single score over the whole text cannot point to the sentence, the rule or the reason. A language model gives a fluent opinion that may change on the next run. None of them can back a finding when someone asks for its basis.

That gap matters most where a text has to be defended, not just improved — contracts, consent forms, policies, regulations — and where someone may have to show what was checked, and against what.

**Lucid treats every finding as a claim with a citation:** the criterion that fired, the source behind it, the exact span, and a stamp that lets anyone reproduce the run byte for byte.

<br/>

## 🚀 30 seconds

One sentence of Brazilian officialese:

> **`Foi realizada a análise do documento pela comissão competente em sede de procedimento administrativo.`**
>
> _Word for word: "Was carried out the analysis of the document by the competent committee in the seat of administrative proceeding." Direct: **"The committee analyzed the document."**_

Bureaucratic language is universal; only its symptoms are local. English does the same with _"it was determined that"_.

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

- **`normativeReference`** cites a clause of the standard — and exists only when the criterion genuinely derives from it.
- **`requiresHuman: true`** means the engine refuses to guess who acted. It reports the fact and stops.
- **`suggestion`** is a curated 1:1 equivalent, displayed, never written into your file.

Every run is stamped with `configHash` and `dataHash`: same text, config and lexicons → the same JSON, byte for byte.

<br/>

## 🧩 The engine judges. The model proposes.

Two layers, and a fence between them that the build enforces:

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1 — the deterministic engine          THE PRODUCT    │
│  zero LLM · zero network · same input → byte-identical out  │
│  24 detectors, each declaring the authority behind it       │
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

The deterministic engine **never authors text**: it detects, cites the source and explains. Rewrites come from outside it — a language model, when you opt in, or your own edit — and when one arrives, the engine re-analyzes it and separates what it can _prove_ from what it can only _signal_. Your edit is judged by exactly the same checks as the model's, and nothing enters the document without your decision. The component that writes has no authority; the component with authority cannot write.

<p align="center">
<img width="3118" height="1950" alt="Lucid's review studio: the document on the left with inline annotations, the audit rail on the right showing the finding, its ISO clause and its justification" src="https://github.com/user-attachments/assets/6ff3d23a-5922-442b-9f2b-522b88699444" />
</p>

<p align="center"><em>The review studio. Left: the document, every finding underlined in place. Right: the selected finding — which criterion fired, which ISO subsection it maps to, and why it hurts the reader.</em></p>

The review walks one criterion at a time, heaviest first. Every change lands in a per-criterion ledger — `resolved`, `kept`, `flagged after the change`, `knock-on effect` — computed with both texts in hand. Marking a finding as reviewed never moves the score: _resolved is what stopped existing in the text._ → [The review in depth](docs/how-it-works.md#the-review)

Because the referee is deterministic, "which model should rewrite this?" becomes a measurement:

| System                       | rewrote % |   ΔFlesch | proofs OK % | no-veto % | latency ms |
| ---------------------------- | --------: | --------: | ----------: | --------: | ---------: |
| llama-3.3-70b · `correct`    |        67 |      +0.5 |     **100** |       100 |        556 |
| llama-3.3-70b · `rewrite`    |       100 | **+69.8** |     **100** |        67 |        657 |
| gemini-2.5-flash · `correct` |       100 |     +16.6 |          67 |        67 |       1440 |
| gemini-2.5-flash · `rewrite` |       100 | **+71.5** |          67 |        33 |       1263 |

Gemini produced the biggest readability gain in the table — and the deterministic gate still caught it altering a value or introducing jargon on the numbers-and-dates text. **Better prose never buys a pass.** _(Single run, `temperature 0`, 3 texts: a floor signal, not a leaderboard.)_

<br/>

## 🚦 What it does / what it refuses to do

The refusals are the design, not missing features.

| ✅ It does                                                       | ❌ It refuses to                                                 |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| Locate every violation, with character offsets and `line:column` | Rewrite your document, or apply any edit on its own              |
| Cite the source behind each finding — the ISO clause, if any     | Invent authority: editorial rules never get a fake clause number |
| Explain, in prose, why the reader is hurt                        | Emit a grade, a score out of 100, or a pass mark                 |
| Mark what needs human judgment, **and why**                      | Guess a missing agent, or swap a word with more than one sense   |
| Verify a rewrite — yours or an LLM's — against the same checks   | Certify a document as compliant                                  |
| Report what it did **not** look for                              | Let a silent absence read as an all-clear                        |

**There is no green check anywhere, and the type system enforces it.** The comprehension probe's result type is `flag | neutral` — there is no `approved` variant to return.

<br/>

## 📏 It measures itself

`npm run eval` produces a stamped artifact ([`eval/report.json`](eval/report.json)), rendered at [`/avaliacao`](https://lucid.marianacastro.dev/avaliacao):

| Detector             | Precision | Recall | Coverage        |
| -------------------- | --------: | -----: | --------------- |
| `passive_voice`      |     1.000 |  0.830 | productive rule |
| `nominalization`     |     1.000 |  0.898 | curated lexicon |
| `jargon`             |     0.963 |  0.929 | curated lexicon |
| `sigla_sem_expansao` |     0.867 |  1.000 | productive rule |

- **Only 4 of 24 detectors are listed.** The others have no defensible precision/recall number, so none is invented.
- **Known limitations count against the score.** `passive_voice` publishes 0.830 recall, not the 0.943 it once showed: where no deterministic signal separates a passive from a predicative adjective, the detector now stays silent, and the cost is in the number.
- **Circular numbers are flagged inside the JSON.** Recall of a curated-lexicon detector, measured on a corpus built from that lexicon, says "the code reads its own list" — and the artifact says so.

To break that circularity: **149 passages from 16 real federal laws**, labelled by two independent models that never see the detectors, with a person adjudicating disagreements and a random audit sample. Agreement is measured with Cohen's κ and Gwet's AC1. One of three criteria clears the 0.7 floor, and what it publishes is an absence — zero false positives over 16 random passages, precision `—` — not a rate. The other two are withheld. → [Method and results](docs/how-it-works.md#the-assisted-corpus)

<br/>

## 🔬 Inside the engine

- **A pure pipeline.** Normalize (NFC) → segment → tokenize → 24 detectors → per-criterion score. No `Date`, no `Math.random`, no `localeCompare`, no network in the core; an ESLint rule fails the build if one appears. Byte-identical golden snapshots lock the output.
- **Provenance is a type.** Every criterion declares where its authority comes from:

  | `source`               | Meaning                                            | Gets an ISO clause?                     |
  | ---------------------- | -------------------------------------------------- | --------------------------------------- |
  | `iso-24495-1`          | Derived from a numbered clause of the standard     | **Yes** — `normativeReference` required |
  | `editorial-pt-br`      | A Portuguese editorial convention, not in the norm | **No** — the field cannot exist         |
  | `structural-heuristic` | A weak structural signal, labeled as such          | **No**                                  |
  | `organizational`       | A term **your organisation** declared unfamiliar   | **No**                                  |

  `normativeReference ⟺ source === "iso-24495-1"` is a discriminated union: an editorial rule cannot be given a clause number, because that code does not compile.

- **Reproducibility is `(version, config, data)`.** Every run hashes the configuration and every curated lexicon that influenced it. Edit one glossary entry and the golden snapshot breaks.
- **The layers are fenced.** `dependency-cruiser` fails the build if the core reaches for the LLM layer or a locale. Languages arrive through a `LocaleBundle`; an experimental US-English catalogue with 12 criteria of its own proves the seam.
- **2679 tests**, plus [Stryker](https://stryker-mutator.io/) mutation testing over the criteria, survivors triaged.

### Why Portuguese first

Brazilian officialese has failure modes no English tool has needed to model:

| Phenomenon               | Example              | What it is in English                                                                      |
| ------------------------ | -------------------- | ------------------------------------------------------------------------------------------ |
| **Mesoclisis**           | `far-se-á`           | A pronoun infixed _inside_ a future-tense verb. English has no equivalent construction.    |
| **Synthetic pluperfect** | `fizera`             | "had done" in a single word; the irregulars are opaque to any regex                        |
| **Synthetic passive**    | `aplica-se a multa`  | A passive built with a clitic, agent structurally absent and ambiguous with the impersonal |
| **Gerundism**            | `vai estar enviando` | "will be sending" — a calque of English progressive future, stigmatized in Portuguese      |

Detecting them takes real morphology: a build step distils **PortiLexicon-UD** (71 MB) to an ~850 KB set of unambiguous forms, so the runtime check is a lookup. Readability uses **Flesch adapted to Brazilian Portuguese** (Martins et al., 1996), not the English coefficients.

<br/>

## 📐 The standard behind the ISO criteria

The ISO criteria come from `ABNT NBR ISO 24495-1:2024`, the Brazilian adoption — identical in text — of ISO 24495-1:2023, _Plain language — Part 1: Governing principles and guidelines_. The standard itself says its outcome rests on reader success, not on mechanical formulas — so Lucid covers only what rules can honestly check:

| #   | Principle          | Clause | In Lucid                                                                                                                                     |
| --- | ------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Relevant**       | 5.1    | No detector, ever. Lucid asks the standard's questions and records the author's answers; undeclared reads _"not declared"_, never compliant. |
| 2   | **Findable**       | 5.2    | Deterministic detectors                                                                                                                      |
| 3   | **Understandable** | 5.3    | Deterministic detectors                                                                                                                      |
| 4   | **Usable**         | 5.4    | Needs real readers. A synthetic comprehension probe exists in the code but is off: it failed its own recall floor against the current model. |

23 detectors cover principles 2 and 3; a 24th checks [your organisation's own vocabulary](docs/how-it-works.md#the-organisations-vocabulary) and never cites the standard.

<br/>

## 💻 Run it

**Layer 1 needs no keys and no network.** Only the AI rewrite reads `GEMINI_API_KEY`.

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

Accepts `.txt`, `.md`, `.docx`, `.pdf` and stdin; analyses `pt-BR` only. The JSON is language-neutral; the `justification` prose is Portuguese, written for the person revising the document. The exit codes refuse to approve:

| Code | Meaning                                                     |
| ---- | ----------------------------------------------------------- |
| `0`  | the audit ran — **not** "the document passed"               |
| `1`  | execution failed (unreadable file, bad flag)                |
| `2`  | **a threshold _you_ declared** with `--fail-on` was crossed |

```bash
lucid drafts/*.docx --fail-on error   # your policy, not the tool's
```

### The studio and the checks

```bash
npm run dev         # → http://localhost:3000
npm run test        # 2679 Vitest tests + byte-identical golden snapshots
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint (incl. the no-Date/no-random rule inside core)
npm run depcheck    # dependency-cruiser — the layer fence
npm run eval        # regenerate the self-evaluation artifact
```

<br/>

## 🧰 Tech stack

| Category               | Technologies                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| **Deterministic core** | Framework-free TypeScript — pure passes over a canonical document model. No DOM, no React, no network |
| **App**                | Next.js 16 (App Router), React 19, Tailwind CSS v4                                                    |
| **CLI**                | esbuild-bundled single file, Layer 1 only                                                             |
| **LLM layer (opt-in)** | Google Gemini via raw `fetch`, no SDK, `temperature 0`, versioned prompts, behind one interface       |
| **Standard**           | ISO 24495-1 / ABNT NBR ISO 24495-1:2024 — the sole authority for every `normativeReference`           |
| **Reused data**        | PortiLexicon-UD (CC-BY 4.0) morphology; Flesch-PT (Martins et al., 1996)                              |
| **Testing**            | Vitest, golden snapshots, **Stryker** mutation testing, **dependency-cruiser** for the layer fence    |

<br/>

## 📚 Go deeper

- **[How it works](docs/how-it-works.md)** — the review path and change ledger, profiles, the organisation's vocabulary, the full evaluation method, the US-English catalogue, engineering notes.
- **[Experiments](docs/experimentos/)** _(in Portuguese)_ — measurements written up, prediction and miss included.
- **[Corpus method](corpus/README.md)** — how the assisted corpus is labelled.

<br/>

## 📄 License

The **code** is [MIT](LICENSE) — use, study, fork and build on it, keeping the copyright and license notice.

The **bundled linguistic data** derived from **PortiLexicon-UD** (`mais-que-perfeito.pt.json`, `adverbios-mente.pt.json`) is a derivative work under **CC-BY 4.0** — attribution required; see [`src/locales/pt-BR/datasets/README.md`](src/locales/pt-BR/datasets/README.md).

© 2025–2026 [**Mariana Castro**](https://marianacastro.dev) · [Live demo](https://lucid.marianacastro.dev/)
