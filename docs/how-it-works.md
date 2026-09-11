# How Lucid works — in depth

The [README](../README.md) carries the thesis, one worked example and the headline numbers. This page is the long form: how the review is organized, how changes are attributed, how the engine measures itself, and why each of those decisions went the way it did.

- [The review](#the-review)
- [The organisation's vocabulary](#the-organisations-vocabulary)
- [Evaluation in depth](#evaluation-in-depth)
- [Portuguese morphology and the locale seam](#portuguese-morphology-and-the-locale-seam)
- [Experimental: US English](#experimental-us-english)
- [Engineering notes](#engineering-notes)

---

## The review

Finding 25 violations is the easy half. The hard half is that a list of 25 is not a task — it is a wall, and the reader who is looking at it has no idea where to start, what changes if they act, or when they are done. So the audit is also a **path**, and the path is held to the same rule as everything else: **it may reorder the work, never the verdict.**

### One criterion at a time

The findings are grouped by criterion and ordered by weight — the same `error 3 · warning 1 · info 0.3` the rewrite verifier already runs on, so a criterion with four errors outranks one with ten notes. Heaviest first. Each step is one criterion: you walk its occurrences with the same frame of mind instead of switching problem at every point. The header stays with you the whole way, and answers the three questions in the order they get asked — _where am I_ (step N of M, with the trail of what is behind you), _what do I do_ (open the pending occurrences and settle each one), _how do I advance_ (the next step, always one click and always visible).

Order is a **suggestion, not a rule**: you can enter at any step, and the findings — and the score — are identical in any sequence.

**A walked step is not a clean document.** Marking an occurrence as seen or dismissed is the author's note to themselves about their own review; it never touches the score, and the interface says so where you can't miss it: _a reviewed point is not a resolved one — resolved is what stopped existing in the text._

### Before × after, attributed to the criterion

When a change lands — your edit, a curated swap, or an accepted LLM rewrite — the engine re-analyzes and reports what moved, per criterion. The attribution is computed **at the moment of the change, with both texts in hand**, never by replaying offsets afterwards:

| What the ledger says       | What it means                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `resolved`                 | the finding stopped existing                                                                           |
| `kept`                     | same finding, same text, still there                                                                   |
| `rewritten, still flagged` | the passage changed; the criterion still fires                                                         |
| `flagged after the change` | the edit introduced it                                                                                 |
| `became something else`    | the count changed — reported as "N became M", with no pretence about which one is the survivor         |
| `knock-on effect`          | a finding **outside** the edited region moved, and is labeled as such rather than credited to the edit |

That last row is the point of the whole mechanism. Deleting a heading changes the verdict on a heading far below it; an honest delta has to name that instead of quietly folding it into what you just did.

### Profiles: the threshold is a declaration, not a default

A benefit ruling and an app screen do not fail at the same sentence length. Four named profiles carry the purpose — `base`, `normativo`, `publico`, `digital` — and each is a different set of thresholds, not a different set of rules: no criterion is switched off, no clause is reinterpreted.

Each profile hashes differently (`44521072`, `0cc01df9`, `d73a7e54`, `126cfd71`), and the report stamps the name, the version and the hash. **A looser threshold cannot hide** — it travels with the result, in the same `configHash` the reproducibility guarantee already rests on. Choosing a profile is stating who you are writing for, on the record.

---

## The organisation's vocabulary

A curated glossary is precise and small: only what has been verified one by one gets in, so Lucid's jargon list holds **38 entries** and its nominalization list **24**. Run the engine over **113,522 words of real Brazilian public-sector documents** — grant calls, official letters, booklets — and those two detectors fire **5 times** and **2 times** respectively.

The control is in the same table. `nominalizacao_encadeada` answers to the same clause (5.3.3) as `nominalization`, but recognises a morphological pattern instead of consulting a list, and it fires **581 times** — roughly 290 to 1 against its curated sibling. The two lexical criteria that stay silent on real documents are exactly the two whose recall is bounded by a list. The bottleneck was never the phenomenon; it was the curation.

No central list knows what a given office's readers stumble on — `termo de fomento`, `e-Parcerias`, `instrumento congênere`. So the office declares them, from a passage selected in the document: the term, the plain equivalent, and why. They are then looked for in every document audited with that vocabulary loaded, and they travel in the `.lucid.json` alongside the baseline.

What keeps this from becoming a hole in the authority model:

- **It is a criterion of its own**, not the jargon list with more rows — so the report keeps the two apart, and the reader of a report can always tell which findings the standard backs and which ones you do.
- **It never cites a clause.** `source: "organizational"`, no `normativeReference`, enforced by the same union as everything else.
- **A term with no recorded equivalent only signals.** Without an attested 1:1 swap, proposing one would mean inventing what nobody stated — so the finding is `requiresHuman` and carries no `suggestion`.
- **It travels in the stamp.** The vocabulary lives in the `Config`, which means a different vocabulary produces a different `configHash`. **No result can hide which lexicon measured it** — the same guarantee that already covers a loosened threshold.

And because a zero now means two different things depending on the detector, the interface says which: a list-bound criterion reports _"this zero says the list did not match, not that the text is clear of it"_, a productive one reports _"this zero is a measurement."_

---

## Evaluation in depth

`npm run eval` produces a stamped artifact ([`eval/report.json`](../eval/report.json)) rendered at [`/avaliacao`](https://lucid.marianacastro.dev/avaliacao). The README shows the four measured detectors. Three things about that table are unusual, and deliberate:

1. **Only 4 of 24 detectors are there.** The rest have no honest precision/recall number, so none is invented. The artifact says which is which.
2. **Known limitations count _against_ the score.** A false positive we chose not to fix is left in the corpus, so `jargon` publishes 0.963 instead of a prettier 1.000. The same rule is why `passive_voice` publishes 0.830 recall rather than the 0.943 it once showed: `ser` in the present with no agent and a subject before the verb (“o benefício é concedido”) is structurally identical to a predicative adjective (“o servidor é qualificado”), no deterministic signal separates them, and the detector now stays silent there. The recall those silences cost is in the number, not in a footnote.
3. **The artifact flags its own circular numbers.** Recall for a curated-lexicon detector is measured against a corpus built from that same lexicon — so it reports "the code reads its own list," not "the instrument finds the phenomenon." That caveat ships _inside_ the JSON.

### The assisted corpus

A caveat you publish and never act on is a caveat you have learned to live with. So the third point above has an apparatus behind it: **149 passages from 16 real federal laws** — text nobody wrote with a detector in mind — labelled by a pipeline whose whole design is that the labeller must not see the detector (`dependency-cruiser` fails the build if `scripts/corpus/` reaches for a pass or a dataset).

Two independent models propose every label; where they disagree, where either declares low confidence, and on a random audit sample of the ones they agreed on, **a person decides**. Agreement between the two is measured with Cohen's κ and Gwet's AC1, rates carry Wilson intervals, and the sample is stratified — a random stratum, where recall means something, and a cue-enriched one, where it would only measure the cue.

**One of three criteria clears the gate — and what it publishes is an absence, not a rate:**

| Criterion            |   AC1 | Result                                                    |
| -------------------- | ----: | --------------------------------------------------------- |
| `prose_enumeration`  | 1.000 | **published** — 0 false positives over 16 random passages |
| `sigla_sem_expansao` | 0.558 | withheld — inter-labeller agreement below the 0.7 floor   |
| `perifrase_inflada`  | 0.321 | withheld — inter-labeller agreement below the 0.7 floor   |

The published one is worth reading closely: the detector stayed silent on all 16 passages and the human-audited labels agree it should have, so **both denominators are empty and precision stays `—`**. A rule engine that fired zero times does not get to publish 100% precision. The finding is the silence, and the artifact says so instead of manufacturing a number at the best point of the scale.

That is the band working, not the band failing. The counts stay in the artifact so a dissenter can recompute; the **rates** are redacted, because a rate is a claim and this is precisely the claim the floor refused. And the interface keeps three absences apart — `—` is _no measurement was possible_, `retido` is _measured and not published_, `não se mede` is _a number that would be a lie_ — with a test that fails if they ever collapse into one.

The two below the floor cannot be rescued by more reviewing — and this was measured, not assumed: adjudicating the one queued audit item promoted `prose_enumeration` and moved neither of the others, because AC1 is a property of the model runs, not of the adjudication. What their low agreement measures is **how well-defined the criterion is** — and publishing that instead of a precision number is the more useful admission.

_See [`eval/report.json`](../eval/report.json) → `assistedCorpus`, rendered at [`/avaliacao`](https://lucid.marianacastro.dev/avaliacao#corpus), method in [`corpus/README.md`](../corpus/README.md), and the measurement written up — prediction, miss and all — in [`docs/experimentos/002`](experimentos/002-o-que-o-corpus-assistido-consegue-publicar.md)._

### Test strength

**2679 tests**, with [Stryker](https://stryker-mutator.io/) mutation testing over the criteria. Survivors are triaged into real gaps versus provably-equivalent mutants — because a mutation score you haven't triaged is also just a number.

### The rewrite benchmark

The generator × verifier table in the README comes from [`test/rewrite-benchmark.test.ts`](../test/rewrite-benchmark.test.ts), gated off CI (`BENCHMARK=1`). It separates **PROOF** (deterministic: the target violation is gone, numbers and dates survived, no jargon or first person fabricated) from **SIGNAL** (a non-deterministic read on meaning). Single run, `temperature 0`, 3 texts: a floor signal, not a leaderboard.

---

## Portuguese morphology and the locale seam

Handling mesoclisis, the synthetic pluperfect, the synthetic passive and gerundism required real morphology, not pattern-matching. Rather than hand-writing a conjugator, a build step stream-filters **PortiLexicon-UD** (71 MB) down to an ~850 KB _unambiguous_ set: pluperfect forms that never appear with any other reading. `fora` (also an adverb) and `vira` (also a verb) drop out; the opaque irregulars survive. Ambiguity resolved once, offline, so the runtime detector is a membership test.

Meanwhile **the core never imports a locale.** Passes, lexicons, syllable counting, readability and criteria all arrive through a `LocaleBundle`; `dependency-cruiser` fails the build if `core` reaches for `locales`, and a synthetic test locale proves the seam. A second language slots in without a line changing in the pipeline — and one has: see the experimental US-English catalogue below.

Readability likewise reuses rather than rebuilds: **Flesch adapted to Brazilian Portuguese** (Martins et al., 1996), never the English coefficients pointed at a language they were not fitted to.

---

## Experimental: US English

It exists to prove that the core accepts a real second catalogue — not a translation of the Portuguese one. `en-US` has 12 criteria of its own: six English-specific checks (passive voice, verbs hidden in nouns, the reader named in the third person, ambiguous _shall_, acronyms used before they are spelled out, series written as prose), five structural checks whose engine is shared with `pt-BR` under provisional English thresholds, and the organisation's declared vocabulary. The four Brazilian phenomena in the README have no English counterpart; they are declared absent, not translated.

**What it does not offer at this stage:** readability, cohesion, AI rewriting, validation on an independent corpus, the CLI (`lucid` analyses `pt-BR` only and has no `--locale`), or English prose in the exported report. It runs only in the studio, labelled _experimental_. No precision or recall is published for it: its golden suites were written in the same session as the detectors, by their author, knowing the rules — a regression net, not a measurement. Promotion to a measured criterion would need an independent set, separate authorship, random and cued strata, a labelling protocol, denominators with confidence intervals, real US documents and a split sealed before measuring.

**Where its lexicons come from.** From the Federal Plain Language Guidelines (2011): the hidden-verb suffixes (-ment, -tion, -sion, -ance), the light verbs it lists (achieve, effect, give, have, make, reach, take) and those in its examples (carry out, undertake, gain), the five phrase-to-verb pairs Lucid will offer as a swap, the readings of _shall_, the rule of defining an acronym on first use with four common ones (IBM, ATM, BMW, CIA), six reader roles (applicant, employee, lessee, operator, borrower, individual) and the vertical-list recommendation. Lucid's editorial extensions, marked in each dataset: the light verbs _conduct_ and _perform_, the suffix -ence, sixteen further common acronyms, the other reader roles, every exclusion list, and the irregular past participles — a finite registered list, since English participles are not a closed class. The 25-word sentence trigger is an interim reference borrowed from GOV.UK, not a US federal number.

---

## Engineering notes

**Honesty as a compile-time invariant.** The hardest constraint in this project is a _refusal_, and refusals rot unless the compiler holds them. The probe cannot return `approved` because the variant does not exist. An editorial rule cannot cite the standard because the union forbids it. A finding either carries a provably 1:1 curated equivalent or is stamped `requiresHuman`. Keeping that discipline while detectors, an AI rewriter, a CLI and a UI grew around it was the through-line of the whole build.

**Determinism stopped being a testing property and became a product one.** Byte-identical output is table stakes for snapshots. The payoff is elsewhere: it is what makes the rewrite verifier _credible_ (a reproducible referee, not a second opinion), what makes a conformance claim defensible, and — unexpectedly — what made structural editing work. When an imported `.docx` is edited, the engine re-applies the edit to the block model and **accepts the result only if the rebuilt source matches the requested text byte for byte**; otherwise it falls back and tells the user. The invariant became a feature.

**Reusing 71 MB, minimally.** Detecting `fizera` needs morphology no regex can supply. Instead of vendoring PortiLexicon-UD, a build step distills it to the unambiguous pluperfect set — the ambiguity resolved once, offline, so runtime stays a plain lookup.

**Why it audits instead of generating.** A frontier model will always out-write a rule engine at "make this simpler." So Lucid stopped competing there and became the referee: it _proves_ what got mechanically simpler against the norm, _flags_ where meaning may have slipped, and hands the decision back. **The defensible position is the verification, not the generation** — precisely the thing a chat interface cannot be.
