# Lucid's evaluation — the instrument measuring itself

`report.json` is the evaluation artifact for the deterministic engine, produced by:

```bash
npm run eval
```

The computation lives in [`test/eval/compute.ts`](../test/eval/compute.ts) and is the **single
source**: the eval tests assert over the very same return value this file serializes. There is no
second implementation for a page to diverge from CI — if a published number is wrong, the test
breaks with it.

The **shape** is declared in [`src/report/eval/contract.ts`](../src/report/eval/contract.ts), the
contract both sides depend on: the tooling that produces the artifact and the
[`/avaliacao`](../src/app/avaliacao/page.tsx) page that presents it.

## How to read it

- **`schemaVersion`** — the version of this file's SHAPE (not of the engine; that is
  `stamp.lucidVersion`). A consumer reads this before interpreting anything else: an incompatible
  change to the shape increments the number instead of silently breaking the consumer.

- **`stamp`** — `(lucidVersion, localeId, configHash, dataHash, goldenHash)`. Without it a number is
  a claim, not a measurement: this is what makes it reproducible. `dataHash` covers **all** datasets
  in the registry, not only those used by the evaluated criteria. `goldenHash` covers the corpus:
  the measurement depends on the golden as much as on the engine — declaring a new known limitation
  changes published recall without touching config or data, and without that hash two disagreeing
  artifacts would be indistinguishable.

  **Known limit of the stamp:** none of the hashes covers the **source code** of the passes.
  `lucidVersion` is declared by hand, so two runs of different code under the same version carry an
  identical stamp (verified empirically). That is why the drift guard compares **byte for byte**
  instead of trusting the stamp.

- **`precision` / `recall` / `exactRate`** — `null` when there is no denominator (the detector had
  no opportunity to be right or wrong). **Never `1`**: fabricating 100% would be the same mistake as
  the `fleschPt: 0` corrected in ADR-066, and at the best point of the scale. `tp`/`fp`/`fn` are
  always present so the number can be recomputed.

- **`detectors[]`** — precision/recall per criterion, in the **canonical order** of `CRITERION_IDS`
  (the same order as `criteriaCoverage`, so no consumer ever sees two orderings of one set), with
  `negatives` (how many cases require the detector **not** to fire) and two deliberately separate
  failure lists:
  - `knownLimitations` — a **declared** failure, with a curated reason. It counts _against_ the
    metric instead of being excluded.
  - `regressions` — a failure on an entry marked `correto`, **with no reason, because nobody wrote
    one**. Empty on a green build (the eval asserts that no `correto` entry fails); it exists so
    that the impossible case is visible instead of disguising itself as a limitation. A consumer
    **must not infer a reason** for these.

- **`criteriaCoverage`** — the three tiers of evidence, **derived from the data**: a new criterion
  with no eval shows up in `unitTestsOnly` automatically.
  - `measured` — precision/recall against a golden corpus that includes negative cases.
  - `goldenLabelledOnly` — exact findings labelled in the integrated golden, without an aggregate
    metric.
  - `unitTestsOnly` — unit tests only. A unit test is written _from_ the implementation and
    therefore **does not measure recall** over text nobody anticipated. Absence of a number is not
    absence of a defect.

- **`method.caveats`** — the limits of the method, as **addressable** data (`{ id, text }`), so the
  page can highlight or link each one. The most important is `circular_recall_curated`: **recall for
  a `curated`-coverage criterion is circular** (the golden's positives come from the same lexicon
  the detector consults), so it measures "the code reads its own list," not "the instrument finds
  the phenomenon in the language."

- **`assistedCorpus`** — the **corpus-assisted band**, and the standing answer to
  `circular_recall_curated`. Same detectors, different supervision: the reference labels come from
  passages of real federal law that nobody wrote with a detector in mind, proposed by two
  independent models and adjudicated by a person where they diverged. `null` when the corpus was
  not built in this tree — never an empty band, which would read as a measurement of zero.

  It **never merges into `criteriaCoverage`**. That partition stays the authored-evidence one; a
  criterion appearing in both has two measurements of different provenance, not one stronger
  measurement. The band carries its own promotion gate:

  - `measuredAssisted` — criteria whose metric cleared the gate (inter-labeler agreement at or
    above `agreementFloor`, and a person having audited the model-consensus sample).
  - `withheld` — criteria that were **measured and not published**, each with a `withheldReason`
    that names the gate it failed.

  For a withheld criterion the artifact keeps the **counts** (`cases`, `negatives`, `tp`, `fp`,
  `fn`) and nulls the **rates** and intervals. Counts are an observation; a rate is a claim, and the
  claim is the part the project declared it does not sustain. The full unredacted numbers stay in
  [`corpus/v1/measurement.json`](../corpus/v1/measurement.json) for anyone who disagrees with the
  floor and wants to recompute.

  `strata.cued.recall` is `null` whatever the gate says: that stratum entered by a surface cue, so
  recall there would measure the cue rather than the language.

  The page keeps three absences apart, and
  [`test/eval/assisted-rate.test.ts`](../test/eval/assisted-rate.test.ts) locks the distinction:
  **"—"** is no denominator (no measurement was possible), **"retido"** is a measurement withheld,
  and **"não se mede"** is a number that could be computed and would be a lie.

## The artifact cannot go stale

[`test/eval/artifact-drift.test.ts`](../test/eval/artifact-drift.test.ts) runs in the normal suite
(no flag, no git) and fails if this file diverges from what the code produces now — telling you
which stamp field changed, or that the stamp is identical and what changed was measured content.
Touched a golden or a pass? Run `npm run eval` and commit the result.

In CI, the one-line equivalent is:

```bash
npm run eval && git diff --exit-code eval/report.json
```

## No timestamp

The artifact is **byte-identical** for the same code and the same data — Layer 1's determinism
promise extended to the measurement itself. A run's identity is the stamp triple, not the clock; the
date lives in git history.

## What did and did not come from a model

The **measurement** is deterministic and offline throughout: no number in this file was produced by
running a model over text, and the comprehension probe (Layer 2) contributes nothing.

The exception worth declaring is in the **labels** of `assistedCorpus`. The reference the detector
was scored against there was proposed by two language models and adjudicated by a person where they
disagreed. The detector never met a model — it met the label. That is what `no_layer_2` says, and
why it is worded as a distinction rather than a denial.
