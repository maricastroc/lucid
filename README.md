<h1 align="center">
  <br>
  <img src="public/app-icon.svg" alt="Lucid" width="40">
  <br>
  Lucid
  <br>
</h1>

<h4 align="center">A deterministic Plain-Language auditor for Brazilian Portuguese — it diagnoses a text against the ABNT NBR ISO 24495-1 standard, stamps every finding with the exact principle it violates, and refuses to fake the parts that need a human. It marks, it never invents.</h4>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/ABNT_NBR_ISO_24495--1-1A1813?style=for-the-badge" alt="ABNT NBR ISO 24495-1" />
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-the-two-layer-engine">The Two-Layer Engine</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#ℹ%EF%B8%8F-how-to-run-the-application">How To Run</a> •
  <a href="#-license">License</a>
</p>

<p align="center">
  Not a "make it simpler" button — an <strong>honest instrument</strong>. Lucid measures a text against Plain Language and shows exactly <em>where</em> and <em>why</em> it fails, then hands the hard calls back to you. Its core (<strong>Layer 1</strong>) is a <strong>100% deterministic</strong> linter — zero LLM, zero network, same input → <strong>byte-identical</strong> output — that stamps each finding with the <strong>ABNT NBR ISO 24495-1</strong> subsection it violates. A second, opt-in layer runs a synthetic floor-reader that can only ever <em>fail</em> a passage, <strong>never approve it</strong> — because passing a floor test is the absence of a failure, not proof of clarity. <strong>13 detectors</strong>, <strong>874 tests</strong>, and a hard fence between the two layers that the build enforces.
</p>

<p align="center">
  🔗 <strong>Live demo:</strong> <a href="urban-flow.marianacastro.dev/">lucid.marianacastro.dev</a>
</p>

<p align="center">
<img width="3118" height="1950" alt="Macbook-Air-1559x975 34" src="https://github.com/user-attachments/assets/6ff3d23a-5922-442b-9f2b-522b88699444" />
</p>

<br/>

## 🔎 Features

|                                    |                                                                                                                                                                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **🔬 Deterministic core**          | Layer 1 is a pure linter: **zero LLM, zero network**, same input → **byte-identical** output. It is the product; the language model is optional and fenced off.                                                                                              |
| **🏷️ Per-criterion provenance**    | Every finding cites the exact **ABNT NBR ISO 24495-1** subsection it violates (e.g. `5.3.4`) plus a plain-Portuguese justification. The `principle` is never invented — it maps to the norm.                                                                 |
| **✋ Marks, never invents**         | Anything that needs judgment — a hidden agent, a multi-sense word, cutting the superfluous — is flagged `requiresHuman` and left to the author, **with the reason**. The tool refuses to fake it.                                                            |
| **✅ Safe mechanical fixes only**  | A suggestion appears **only** when the substitution is provably safe (a unique glossary match, a closed conjugation table). Otherwise Lucid flags and explains — it never guesses an edit.                                                                    |
| **🧩 13 detectors, per principle** | Long sentences, passive voice, nominalization, jargon, synthetic pluperfect, gerundism, `-mente` adverb pile-ups, redundancy, inflated periphrasis, mesoclisis and double-negation (**Principle 3**); long paragraphs and prose-enumeration (**Principle 2**). |
| **🇧🇷 Built for bureaucratese**    | The detectors target exactly what plagues official Brazilian Portuguese — and what no English tool covers: mesoclisis (`far-se-á`), gerundism (`vai estar enviando`), synthetic pluperfect (`requerera`), litotes (`não é incomum`), latinisms.             |
| **🧪 The comprehension probe**     | An opt-in floor-reader (**Layer 2**, LLM) reads *only* the passage and tries to answer the reader's question. It is a **negative test**: it can flag where a real reader would stall, but it **never returns a green check**.                                 |
| **♻️ Verified AI rewrites**        | When a model *does* rewrite, the **deterministic engine is the judge**: separated **PROOF** (target violation gone, numbers/dates preserved, no fabricated first person) vs. **SIGNAL** (meaning preserved via the probe) — never a seal. The author decides. |
| **🧾 Reproducible to the data**    | Every diagnostic carries a `configHash` **and** a `dataHash`. Change a lexicon and the hash changes and the golden snapshot breaks on purpose. Reproducibility = `(version, config, data)`.                                                                  |
| **🗂️ Format-independent by design** | Detectors run over a canonical `AnnotatedDocument`. Plain text today; DOCX / PDF / HTML importers later produce **the same model** — without a single detector changing.                                                                                    |
| **📊 A score that measures**       | Per-criterion counts and density — deliberately **with no overall grade and no "OK."** The absence of findings is not a certificate of clarity, and the UI says so.                                                                                          |
| **🧰 Assisted structural actions** | For findings that need judgment, Lucid offers **deterministic** scaffolds — split a long sentence at a real clause boundary; **turn a passive into the active voice** (it de-contracts the agent, conjugates from a closed table, reorders — and when only the agent is missing, asks you for *just that* and finishes the rest). Always a reviewable draft, never a free rewrite. |
| **✍️ The review studio**           | A two-mode editor (**Write / Review**) with inline annotations, an audit rail that groups by criterion and severity, the safe-suggestion applier, and the probe panel — all fed by a single client-side `analyze()`.                                          |
| **🔒 A fence the build enforces**  | Layer 1 never imports Layer 2 (or React, or the network). Checked by **dependency-cruiser** + boundary tests: if Layer 2 falls, the product stands whole.                                                                                                    |
| **🌍 Language-pluggable core**     | The engine is **language-neutral**; Portuguese is the first explicit `Locale`. A `LocaleBundle` carries the passes, lexicons, syllable counter, readability metric and criteria; `core` never imports a locale (a fence enforces it), so a second locale slots in **without touching the pipeline**. A synthetic test locale proves the seam.                    |
| **🧵 Deterministic & tested**      | Same text + same config + same data → identical diagnostic, byte for byte. The pure engine and its curated lexicon/rule facts are locked by **874 Vitest tests** and byte-identical golden snapshots; any non-determinism is a failing build.                 |

<br/>

## 🧠 The two-layer engine

Lucid is two layers with a **hard fence** between them — the non-negotiable at the heart of the project.

- **Layer 1 — the deterministic linter** (`src/lucid/core/`): 100% deterministic, **zero LLM, zero network**. Same input → byte-identical output. It is the core and it is the product.
- **Layer 2 — the comprehension probe** (`src/lucid/probe/`): uses an LLM, but **strictly as a negative test** (a floor, never a seal). Isolated behind an interface, opt-in, switch-off-able. It never touches the text and never rewrites.

`core` never imports `probe` (or `react`, or the network). If Layer 2 disappears, Layer 1 is untouched — verified by `dependency-cruiser` and boundary tests.

The whole of Layer 1 is a fixed, pure pipeline ([`src/lucid/core/analyzer.ts`](src/lucid/core/analyzer.ts)):

```
analyze(text):
  buildDocument   normalize (NFC) → segment sentences → tokenize → group paragraphs
  passes          13 deterministic detectors, each emitting Findings with provenance
  score           per-criterion counts + density — measures, never approves
  → Diagnostic    { text, findings, score, metrics, meta(localeId, configHash, dataHash) }
```

- **Deterministic by construction** — a single NFC normalization, code-unit ordering (never `localeCompare`), a canonical finding sort by `(start, end, criterion, principle)`, and no `Date`/`Math.random` anywhere in the core. Same input → the same `Diagnostic`, byte for byte, so the core is testable offline with fixtures and locked by snapshot tests.
- **The pass architecture** — every detector is a pure `Pass` over a frozen document: `{ criterion, category, principle, dataDeps, run(ctx) → Finding[] }`. The orchestrator runs the registry, canonically sorts, and builds the score. **Adding a detector is adding one pass** — no change to the pipeline.
- **Language-pluggable by design (ADR-031)** — `analyzeWithLocale(text, locale)` / `createAnalyzer({ locale })` drive the pipeline from a `LocaleBundle` (passes + lexicons + syllable counter + readability + criteria), with no global mutable state. The core is **language-neutral and never imports a locale**; the Portuguese default (`analyze`, `localePtBR`) is composed at the barrel. `dependency-cruiser` forbids `core → locales` and keeps every locale as pure as Layer 1. Portuguese is the first `Locale`, not the only one — a second slots in without a line changing in `core`.
- **Provenance is the point** — a `Finding` carries the span, the norm subsection (`principle`), a justification, and `requiresHuman`. Suggestions appear only when a substitution is mechanically safe; everything else is marked, not resolved.
- **A data registry** ([`src/lucid/core/data/`](src/lucid/core/data)) — curated lexicons (jargon, participles, nominalizations, redundancies, periphrasis…) plus morphology **derived from PortiLexicon-UD**, each fingerprinted. The union of data that influenced a run is stamped as `meta.dataHash`; editing any lexicon changes the hash and breaks the golden on purpose (automatic governance).
- **Reuse over rebuild** — readability uses **Flesch adapted to PT-BR** (Martins et al., 1996), never the English Flesch. Verb morphology is **sliced from PortiLexicon-UD (CC-BY)** at build time — the 71 MB `VERB.tsv` distilled to an ~850 KB unambiguous set — instead of hand-writing a conjugator.
- **The comprehension probe** — the floor-reader prompt forces **literal, local reading** (no world knowledge, no filling gaps) and reports where it stalls. `interpret()` maps its output to `flag | neutral` — there is no third `approved` value, and the type forbids one. Passing the floor is the absence of a failure, never evidence of comprehension.
- **Verified rewrites (Tier 3)** — the model proposes a paragraph rewrite; the deterministic engine re-analyzes it and separates **PROOF** (the target violation is gone, the finding weight didn't rise, numbers/dates preserved, no jargon and no first person fabricated) from **SIGNAL** (entities and meaning preserved, the latter via the probe as a negative test). Never a green check; the author applies it or not.

**Generator × verifier benchmark.** The same deterministic verifier judges any generator, which turns model choice into an honest measurement instead of a leap of faith. A gated harness ([`test/rewrite-benchmark.test.ts`](test/rewrite-benchmark.test.ts), `BENCHMARK=1`, off CI) infers the provider from the model id (Groq × Gemini) behind the one `ChatProvider` interface and scores each `model × strategy` over a small stress golden (impersonal monster / numbers-dates-names / passive-jargon):

| System | rewrote% | ΔFlesch | findings after | proofs OK% | no-veto% | latency ms | tokens |
|---|--:|--:|--:|--:|--:|--:|--:|
| llama-3.3-70b · correct | 67 | +0.5 | 4.0 | 100 | 100 | 556 | 479 |
| llama-3.3-70b · rewrite | 100 | **+69.8** | 2.0 | 100 | 67 | 657 | 653 |
| gemini-2.5-flash · correct | 100 | +16.6 | 3.3 | 67 | 67 | 1440 | 377 |
| gemini-2.5-flash · rewrite | 100 | **+71.5** | 2.0 | 67 | 33 | 1263 | 537 |

The reading: `rewrite` buys far more clarity than `correct` (ΔFlesch ~+70 vs ~+10), and the verifier does its job — Gemini's bolder rewrites scored the biggest Flesch gains **but** its `proofs OK%` dropped to 67% (on the numbers-dates-names text the deterministic check caught an altered value or new jargon) and its veto rate rose. Stronger prose never buys a pass; the proof gate is what decides. Honest caveat: single run, `temperature 0` (LLM output still varies run-to-run — hence `rewrote% < 100` when `correct` returns identical text), 3 texts — a floor signal, not a leaderboard.

The architecture and every design decision live in [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md), with the full decision log (ADRs 001–032) in [`docs/DECISOES.md`](docs/DECISOES.md).

<br/>

## 🧰 Tech Stack

<p>
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" />
</p>

| Category               | Technologies                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| **Framework**          | Next.js 16 (App Router), React 19                                                                    |
| **Language**           | TypeScript 5                                                                                         |
| **Styling**            | Tailwind CSS v4                                                                                      |
| **Deterministic core** | Framework-free TypeScript — pure `Pass`es over a canonical document model, no DOM, no React          |
| **LLM layer (opt-in)** | Groq + Google Gemini via raw `fetch` (no SDK), `temperature 0`, versioned prompts — behind an interface, off by default |
| **Standard**           | ABNT NBR ISO 24495-1:2024 (Plain Language) — the sole authority for every `principle`                |
| **Reused data**        | PortiLexicon-UD (CC-BY 4.0) morphology; Flesch-PT (Martins et al., 1996)                            |
| **Testing**            | Vitest — unit + byte-identical golden snapshots; **dependency-cruiser** enforces the layer fence     |
| **Tooling**            | ESLint                                                                                               |

<br/>

## 📝 Project Description

Lucid is a Plain-Language auditor built around a strict separation: a **pure, deterministic core** and everything else. All analysis logic lives in `src/lucid/core/` as pure passes over a canonical document model — no DOM, no React, no network — wrapped by a thin Next.js studio (`src/app/`). A neutral LLM layer (`src/llm/`) and the comprehension probe (`src/lucid/probe/`) sit behind interfaces the core can never reach.

The authority for what counts as a violation is the **ABNT NBR ISO 24495-1:2024** standard (Plain Language). The norm itself says clarity rests on *reader success*, not on mechanical formulas — and that defines Lucid's division of labor:

- **Layer 1** covers **Principles 2 (Findable) and 3 (Understandable)** — the mechanically checkable ones. This is where the rules are strong.
- **`requiresHuman` flags** cover **Principle 1 (Relevant)** — author work *before* writing, which no rule can guess.
- **The comprehension probe** is the cheap floor-proxy for **Principle 4 (Usable)** — the norm's "test with real readers," run as a negative check *before* the human test. Being only a floor is alignment with the norm, not an excuse.

The market context is concrete: Brazil's **Lei 15.263/2025** made Plain Language a federal obligation across all three branches — so public bodies will need to *prove* conformance, criterion by criterion, not just claim it. A deterministic, per-criterion, norm-anchored diagnostic is exactly that evidence, and it is exactly what a language model — non-deterministic and unauditable by construction — cannot be.

<br/>

## 🛠️ Engineering challenges

**Honesty as an invariant, not a feature.** The hardest constraint is a *refusal*. The probe can never emit a green check — its result type is `flag | neutral` with no `approved` variant, enforced by the compiler. A finding either carries a *provably safe* suggestion or is stamped `requiresHuman`. Building a tool whose value is partly **what it declines to claim** — and keeping that discipline as detectors, an AI rewriter and a UI grew around it — was the through-line of the whole project.

**Determinism turned from a correctness property into a product one.** Byte-identical output is table stakes for testing; the payoff is trust. It is what makes the **Tier-3 verifier** credible — an LLM's rewrite is judged by a *reproducible* engine, not a second opinion — and what makes a **conformance audit** defensible: the same text yields the same diagnostic, citable against the norm. The core is locked by snapshot tests where any drift fails the build, and a `dataHash` extends reproducibility to the lexicons themselves.

**Reusing a 71 MB lexicon, minimally.** To flag the synthetic pluperfect — whose irregulars (`fizera`, `dissera`, `coubera`, `trouxera`) are opaque to any regex — Lucid needs real morphology. Instead of shipping PortiLexicon-UD whole, a build-time step **stream-filters `VERB.tsv` to the `Tense=Pqp` forms and prunes every form that also appears with any other reading anywhere** — so `fora` (adverb) and `vira` (verb *virar*) drop out, while the opaque irregulars survive. A 71 MB source becomes an ~850 KB *unambiguous* set, the ambiguity resolved once, offline, so the runtime detector is a plain membership test.

**The reframe: the tool audits, it does not generate.** A frontier model will always rewrite "simpler" better than a rule engine, so Lucid stopped competing there. When AI rewrites, the deterministic engine becomes the **referee**: it *proves* what got mechanically simpler (per-criterion, against the norm) and *flags* where meaning may have slipped, and the human signs off. The moat is the verification, not the generation — precisely the thing a chat interface can't be.

**Format independence, without importers.** The detectors were made blind to the source format up front — they consume a canonical `AnnotatedDocument`, and `buildDocument` is merely the plain-text importer. DOCX / PDF / HTML importers can be added later as siblings that produce the same model (the block layer growing additively), so a whole new input format ships **without touching a single detector**.

<br/>

## ℹ️ How to run the application?

> Layer 1 needs **no keys or setup** — it is pure and offline. Layer 2 (the comprehension probe) and the Tier-3 rewrite are opt-in and read a `GROQ_API_KEY` or `GEMINI_API_KEY` from the environment when used.

> Clone the repository:

```bash
git clone https://github.com/maricastroc/lucid
```

> Install the dependencies:

```bash
npm install
```

> Start the dev server:

```bash
npm run dev
```

> Run the checks:

```bash
npm run test        # Vitest unit + golden snapshots
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm run depcheck    # dependency-cruiser — the layer fence
```

> ⏩ Open [http://localhost:3000](http://localhost:3000) to use the studio.

<br/>

## 📄 License

The **code** is released under the [MIT License](LICENSE) — use, study, fork and build on it, **as long as the original copyright and license notice are kept.**

The **bundled linguistic data** derived from **PortiLexicon-UD** (`mais-que-perfeito.pt.json`, `adverbios-mente.pt.json`) is a derivative work under **Creative Commons Attribution 4.0 (CC-BY 4.0)** — attribution is required; see [`src/lucid/data/README.md`](src/lucid/data/README.md).

© 2025–2026 Mariana Castro

<br/>

<div align="center">

⭐ If you like this project, give it a star on GitHub!

</div>
