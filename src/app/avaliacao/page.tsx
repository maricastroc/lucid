import type { Metadata } from "next";
import Link from "next/link";
import { coverageLabel, metaFor } from "../lib/criteria";
import { precisionState, recallState, silentStratumReading, type RateState } from "../lib/assisted-rate";
import rawReport from "../../../eval/report.json";
import {
  EVAL_SCHEMA_VERSION,
  type AssistedMeasurement,
  type AssistedStratum,
  type CaveatId,
  type DetectorReport,
  type EvalArtifact,
} from "@/report/eval/contract";
import { EvidenceNav } from "./evidence-nav";
import { CopyRunSignature } from "./run-signature";

export const metadata: Metadata = {
  title: "Avaliação do motor — Lucid",
  description:
    "O Lucid só publica métricas onde a medição é sustentada. Precisão, recall e cobertura do motor determinístico, com as limitações do método declaradas — lidas do artefato de eval, não recalculadas.",
};

export const SUPPORTED_SCHEMA_VERSION = EVAL_SCHEMA_VERSION;

const artifact = rawReport as unknown as EvalArtifact;

const comma = (s: string): string => s.replace(".", ",");
const rate = (v: number | null): string => (v === null ? "—" : `${comma((v * 100).toFixed(1))}%`);
const decimal = (v: number | null, places = 3): string => (v === null ? "—" : comma(v.toFixed(places)));
const SECTIONS = [
  { id: "resumo", label: "Resumo" },
  { id: "metodo", label: "Método" },
  { id: "camadas", label: "Camadas de evidência" },
  { id: "criterios", label: "Critérios medidos" },
  { id: "corpus", label: "Corpus assistido" },
  { id: "falhas", label: "Falhas declaradas" },
  { id: "procedencia", label: "Procedência" },
] as const;

const TIERS = [
  {
    note: "Precisão e recall contra golden que inclui casos negativos — há oportunidade real de falso positivo.",
    rule: "border-t-2 border-ink-0",
    numeral: "text-ink-0",
  },
  {
    note: "Findings exatos fixados no golden integrado: regressão quebra o build, mas não há taxa agregada.",
    rule: "border-t border-ink-dim",
    numeral: "text-ink-1",
  },
  {
    note: "Confirma o que o autor previu; não mede recall sobre texto que ninguém antecipou.",
    rule: "border-t border-dashed border-ink-dim",
    numeral: "text-ink-2",
  },
] as const;

export default function AvaliacaoPage() {
  if (artifact.schemaVersion !== SUPPORTED_SCHEMA_VERSION) return <Incompatible found={artifact.schemaVersion} />;

  const { stamp, method, detectors, services, criteriaCoverage, assistedCorpus } = artifact;

  const layers = [
    { key: "measured", label: "com métrica publicada", criteria: criteriaCoverage.measured },
    { key: "labelled", label: "rotulados, sem métrica agregada", criteria: criteriaCoverage.goldenLabelledOnly },
    { key: "unit", label: "apenas teste unitário", criteria: criteriaCoverage.unitTestsOnly },
  ] as const;

  const noteNumber = (id: CaveatId): number | null => {
    const i = method.caveats.findIndex((c) => c.id === id);
    return i === -1 ? null : i + 1;
  };

  const regressions = detectors.flatMap((d) => d.regressions.map((r) => ({ ...r, criterion: d.criterion })));

  const runSignature = [
    `lucidVersion: ${stamp.lucidVersion}`,
    `localeId: ${stamp.localeId}`,
    `schemaVersion: ${artifact.schemaVersion}`,
    `configHash: ${stamp.configHash}`,
    `dataHash: ${stamp.dataHash}`,
    `goldenHash: ${stamp.goldenHash}`,
    `standardVersion: ${stamp.standardVersion}`,
  ].join("\n");

  return (
    <main className="min-h-dvh bg-desk px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-272">
        <div className="fade-in overflow-clip rounded-xl border border-rule-1 bg-sheet shadow-(--shadow-sheet)">
          <header className="px-6 py-8 sm:px-14 sm:py-10">
            <p className="u-label flex items-center gap-2 text-ink-2">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              Avaliação do motor
            </p>

            <h1 className="mt-5 max-w-[30ch] font-serif text-[26px] leading-[1.12] tracking-[-0.02em] text-ink-0 sm:text-[35px]">
              O Lucid só publica métricas onde a medição é sustentada.
              <span className="mt-1 block text-ink-2">O resto ele declara como não medido.</span>
            </h1>

            <p className="mt-5 max-w-[62ch] text-[14px] leading-[1.65] text-ink-1">
              Cada taxa desta página vem de corpus rotulado à mão, com as falhas conhecidas contando contra o número em
              vez de serem excluídas. Todo valor é lido de <Mono>eval/report.json</Mono> — nada é recalculado aqui, e o
              que não foi medido aparece como não medido.
            </p>

            <p className="mt-4 flex max-w-[62ch] items-start gap-2.5 text-[13px] leading-relaxed text-ink-1">
              <span
                className="mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full border border-human-line bg-human-weak"
                aria-hidden
              >
                <CrossGlyph />
              </span>
              <span>
                Número alto aqui <span className="font-medium text-ink-0">não</span> é aprovação nem atestado de clareza
                de texto: mede o motor, não o documento de ninguém.
              </span>
            </p>
          </header>

          <EvidenceNav sections={SECTIONS} />

          <EvidenceSummary artifact={artifact} />

          <Band id="metodo" label="Método" aside="o que os números podem significar">
            <p className="max-w-[64ch] text-[13.5px] leading-relaxed text-ink-1">
              Limites do método, do próprio artefato. Os cartões de critério remetem a eles pelos índices. Pontuação por{" "}
              <Mono>{method.scoring}</Mono>.
            </p>
            <ol className="mt-5 grid grid-cols-1 gap-x-10 lg:grid-cols-2">
              {method.caveats.map((caveat, i) => (
                <li
                  key={caveat.id}
                  id={`nota-${caveat.id}`}
                  className="grid scroll-mt-20 grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 border-t border-rule-1 py-3 transition-colors first:border-t-0 target:bg-accent-weak lg:nth-2:border-t-0"
                >
                  <span aria-hidden className="pt-px font-mono text-[11px] tabular-nums text-ink-1">
                    {i + 1}
                  </span>
                  <p className="text-[12.5px] leading-[1.6] text-ink-1">
                    {caveat.text} <MonoTag className="ml-0.5 align-[1px]">{caveat.id}</MonoTag>
                  </p>
                </li>
              ))}
            </ol>
          </Band>

          <Band id="camadas" label="Camadas de evidência" aside="três regimes, não um placar">
            <p className="max-w-[62ch] text-[15px] leading-[1.65] text-ink-1">
              <Tabular>{criteriaCoverage.measured.length}</Tabular> dos <Tabular>{criteriaCoverage.total}</Tabular>{" "}
              critérios do motor têm métrica publicada. Os demais aparecem nas camadas abaixo, com a evidência que de
              fato existe para cada um — a régua enfraquece junto.
            </p>

            <div className="relative mt-9 pl-5 sm:pl-7">
              <span aria-hidden className="absolute bottom-4 left-0 top-4 w-px bg-rule-3" />
              <ol className="flex flex-col gap-7">
                {layers.map((l, i) => (
                  <li
                    key={l.key}
                    className={`grid gap-x-8 gap-y-3 pt-5 sm:grid-cols-[5.5rem_minmax(0,1fr)] ${TIERS[i].rule}`}
                  >
                    <p className={`font-serif text-[40px] leading-none tabular-nums ${TIERS[i].numeral}`}>
                      {l.criteria.length}
                    </p>
                    <div>
                      <h3 className="text-[14.5px] leading-snug text-ink-0">{l.label}</h3>
                      <p className="mt-1.5 max-w-[58ch] text-[12.5px] leading-relaxed text-ink-1">{TIERS[i].note}</p>
                      <ul className="mt-4 flex flex-wrap gap-1.5">
                        {l.criteria.map((c) => (
                          <li
                            key={c}
                            title={c}
                            className="inline-flex items-baseline rounded-full border border-rule-2 bg-surface px-2.5 py-1 text-[12px] text-ink-0"
                          >
                            {metaFor(c).label}
                          </li>
                        ))}
                      </ul>
                      <details className="mt-2.5 text-[11.5px]">
                        <summary className="inline-flex w-fit cursor-pointer list-none rounded-sm text-ink-1 underline decoration-rule-3 underline-offset-4 transition-colors hover:text-ink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                          identificadores
                        </summary>
                        <ul className="mt-2 flex flex-col gap-1">
                          {l.criteria.map((c) => (
                            <li key={c} className="flex flex-wrap items-baseline gap-x-2 text-ink-1">
                              <span className="text-ink-0">{metaFor(c).label}</span>
                              <MonoTag>{c}</MonoTag>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Band>

          {regressions.length > 0 && (
            <Band id="regressoes" label="Regressões" aside="falha sem motivo declarado">
              <div className="rounded-lg border border-human-line bg-human-weak px-5 py-4">
                <p className="max-w-[62ch] text-[13px] leading-relaxed text-ink-1">
                  Casos marcados como corretos no corpus que falharam. Não há motivo declarado — e esta página não
                  inventa nenhum.
                </p>
                <ul className="mt-4 flex flex-col gap-3">
                  {regressions.map((r) => (
                    <li key={`${r.criterion}:${r.texto}`}>
                      <p className="font-serif text-[15px] leading-snug text-ink-0">
                        <Quoted>{r.texto}</Quoted>
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-ink-1">
                        {r.criterion} · esperado <Tabular>{r.expectedCount}</Tabular> · obtido{" "}
                        <Tabular>{r.actualCount}</Tabular>
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </Band>
          )}

          <Band id="criterios" label="Critérios medidos" aside="precisão e recall, com o corpus que os sustenta">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {detectors.map((d) => (
                <CriterionCard key={d.criterion} d={d} noteNumber={noteNumber} />
              ))}
            </div>
            <p className="mt-6 max-w-[68ch] text-[12.5px] leading-relaxed text-ink-1">
              <span className="text-ink-1">Casos</span> é o tamanho do corpus do critério e{" "}
              <span className="text-ink-1">negativos</span> é quantos deles exigem que o detector fique calado — sem
              eles, precisão seria 100% por construção. Um traço significa ausência de medida, nunca zero.
            </p>
          </Band>

          {assistedCorpus && <AssistedBand corpus={assistedCorpus} noteNumber={noteNumber} />}

          <Band id="falhas" label="Falhas declaradas" aside="com motivo, contando contra a métrica">
            <div className="flex flex-col gap-11">
              {detectors.map((d) => (
                <section key={d.criterion} id={`lim-${d.criterion}`} className="scroll-mt-20">
                  <h3 className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-rule-2 pb-2.5">
                    <span className="text-[14px] text-ink-0">{metaFor(d.criterion).label}</span>
                    <MonoTag>{d.criterion}</MonoTag>
                    <span className="ml-auto text-[12px] tabular-nums text-ink-1">
                      {d.knownLimitations.length}{" "}
                      {d.knownLimitations.length === 1 ? "caso declarado" : "casos declarados"}
                      <span className="ml-1.5 text-ink-1">· conta contra a métrica</span>
                    </span>
                  </h3>
                  <ol className="mt-5 flex flex-col gap-7">
                    {d.knownLimitations.map((lim, i) => (
                      <li key={lim.texto} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3">
                        <span
                          aria-hidden
                          className="grid size-6 place-items-center rounded-[4px] bg-surface-3 font-mono text-[10.5px] tabular-nums text-ink-1"
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="wrap-break-word border-l-2 border-rule-3 pl-4 font-serif text-[16.5px] leading-snug text-ink-0">
                            <Quoted>{lim.texto}</Quoted>
                          </p>
                          <div className="mt-3 pl-4">
                            <p className="u-sublabel text-ink-1">por que falha</p>
                            <p className="mt-1.5 max-w-[58ch] wrap-break-word text-[12.5px] leading-[1.65] text-ink-1">
                              {lim.motivo}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          </Band>

          <Band id="procedencia" label="Procedência" aside="assinatura da rodada">
            <div className="rounded-lg border border-rule-2 bg-surface-2 px-5 py-5">
              <p className="max-w-[64ch] text-[13px] leading-relaxed text-ink-1">
                Estes seis valores identificam a rodada: com eles e o mesmo corpus, qualquer pessoa chega aos mesmos
                números desta página — e uma divergência aponta qual peça mudou.
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-rule-1 pt-5 sm:grid-cols-3">
                <Field term="lucidVersion" value={stamp.lucidVersion} />
                <Field term="localeId" value={stamp.localeId} />
                <Field term="schemaVersion" value={String(artifact.schemaVersion)} />
                <Field term="configHash" value={stamp.configHash} />
                <Field term="dataHash" value={stamp.dataHash} />
                <Field term="goldenHash" value={stamp.goldenHash} />
              </dl>
              <div className="mt-5 border-t border-rule-1 pt-4">
                <CopyRunSignature signature={runSignature} />
              </div>

              <p className="mt-4 text-[12px] leading-relaxed text-ink-1">
                <span className="font-mono text-[11px] text-ink-1">{stamp.standardVersion}</span> · mesma estampa e
                mesmo corpus devem produzir os mesmos valores. Ela não cobre o código-fonte dos detectores —{" "}
                <Mono>lucidVersion</Mono> é declarada à mão —, e por isso o guard de atualidade compara byte a byte em
                vez de confiar nela. Para regenerar: <Mono>npm run eval</Mono>.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
              <div>
                <h3 className="text-[13.5px] text-ink-1">
                  Silabação
                  <span className="ml-2 text-[12px] text-ink-1">serviço interno, não critério da norma</span>
                </h3>
                <dl className="mt-3.5 flex flex-wrap gap-x-10 gap-y-4">
                  <Field term="acerto exato" value={rate(services.syllables.exactRate)} big />
                  <Field term="erro absoluto médio" value={decimal(services.syllables.meanAbsoluteError)} big />
                </dl>
              </div>
              <p className="text-[12px] text-ink-1">
                <Tabular>{services.syllables.words}</Tabular> palavras ·{" "}
                <Tabular>{services.syllables.limitations}</Tabular> declaradas
              </p>
            </div>
          </Band>

          <footer className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-rule-1 bg-surface px-6 py-4 text-[11.5px] text-ink-1 sm:px-14">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            Medição determinística e offline
            <span className="text-ink-dim" aria-hidden>
              ·
            </span>
            Nenhum número desta página saiu de um modelo — na faixa assistida, os rótulos de referência sim
            <Link
              href="/"
              className="ml-auto rounded-sm underline decoration-rule-3 underline-offset-4 transition-colors hover:text-ink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              Voltar ao Lucid
            </Link>
          </footer>
        </div>
      </div>
    </main>
  );
}

function EvidenceSummary({ artifact }: { artifact: EvalArtifact }) {
  const { criteriaCoverage, detectors } = artifact;
  const declaredFailures = detectors.reduce((total, d) => total + d.summary.limitations, 0);

  const regimes = [
    {
      value: criteriaCoverage.measured.length,
      label: "com métrica publicada",
      note: "precisão e recall contra golden com negativos",
      href: "#criterios",
      className: "text-ink-0",
    },
    {
      value: criteriaCoverage.goldenLabelledOnly.length,
      label: "rotulados, sem métrica",
      note: "regressão quebra o build, mas não há taxa",
      href: "#camadas",
      className: "text-ink-1",
    },
    {
      value: criteriaCoverage.unitTestsOnly.length,
      label: "apenas teste unitário",
      note: "confirma o previsto, não mede o imprevisto",
      href: "#camadas",
      className: "text-ink-2",
    },
  ] as const;

  return (
    <section id="resumo" className="scroll-mt-16 border-t border-rule-2 bg-surface px-6 py-7 sm:px-14">
      <h2 className="u-label text-ink-1">
        Evidência disponível para os <Tabular>{criteriaCoverage.total}</Tabular> critérios
      </h2>
      <p className="mt-2 max-w-[64ch] text-[12.5px] leading-relaxed text-ink-1">
        Quantos critérios têm cada tipo de evidência. Não é nota, aprovação nem média — é o quanto se sabe sobre cada
        um, e a régua enfraquece da esquerda para a direita.
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
        {regimes.map((r) => (
          <div key={r.label}>
            <dd className={`font-serif text-[34px] leading-none tabular-nums ${r.className}`}>{r.value}</dd>
            <dt className="mt-2 text-[12.5px] leading-snug text-ink-0">
              <a
                href={r.href}
                className="rounded-sm underline decoration-rule-3 underline-offset-4 transition-colors hover:decoration-ink-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {r.label}
              </a>
            </dt>
            <p className="mt-1 max-w-[22ch] text-[11.5px] leading-snug text-ink-1">{r.note}</p>
          </div>
        ))}
        <div>
          <dd className="font-serif text-[34px] leading-none tabular-nums text-human">{declaredFailures}</dd>
          <dt className="mt-2 text-[12.5px] leading-snug text-ink-0">
            <a
              href="#falhas"
              className="rounded-sm underline decoration-rule-3 underline-offset-4 transition-colors hover:decoration-ink-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              falhas declaradas
            </a>
          </dt>
          <p className="mt-1 max-w-[22ch] text-[11.5px] leading-snug text-ink-1">
            contam contra a métrica, não são excluídas
          </p>
        </div>
      </dl>
    </section>
  );
}

function CrossGlyph() {
  return (
    <svg viewBox="0 0 10 10" className="size-2.5 text-human" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path d="M2 2l6 6M8 2l-6 6" strokeLinecap="round" />
    </svg>
  );
}

function Band({
  id,
  label,
  aside,
  children,
}: {
  id: string;
  label: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-16 border-t border-rule-2 px-6 py-10 sm:px-14 lg:grid lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-x-8"
    >
      <div className="lg:sticky lg:top-16 lg:self-start lg:border-r lg:border-rule-1 lg:pr-8">
        <h2 className="u-label text-ink-0">{label}</h2>
        {aside && <p className="mt-2 hidden max-w-[15ch] text-[11.5px] leading-snug text-ink-1 lg:block">{aside}</p>}
      </div>
      <div className="mt-4 lg:mt-0">{children}</div>
    </section>
  );
}

function CriterionCard({ d, noteNumber }: { d: DetectorReport; noteNumber: (id: CaveatId) => number | null }) {
  const curated = d.coverage === "curated";
  const corpus: readonly { term: string; value: number; dim?: boolean; note?: CaveatId }[] = [
    { term: "casos", value: d.summary.cases, note: "count_scoring" },
    { term: "negativos", value: d.summary.negatives },
    { term: "tp", value: d.summary.tp },
    { term: "fp", value: d.summary.fp, dim: d.summary.fp === 0 },
    { term: "fn", value: d.summary.fn, dim: d.summary.fn === 0 },
  ];

  return (
    <article className="flex flex-col rounded-lg border border-rule-1 bg-sheet px-5 py-5 shadow-(--shadow-card)">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[14.5px] leading-tight text-ink-0">{metaFor(d.criterion).label}</h3>
          <MonoTag className="mt-2">{d.criterion}</MonoTag>
        </div>
        <span className="shrink-0 rounded-full border border-rule-2 bg-surface-2 px-2 py-0.5 text-[10.5px] font-medium text-ink-1">
          {coverageLabel(d.coverage)}
          {curated && <NoteRef n={noteNumber("circular_recall_curated")} id="circular_recall_curated" />}
        </span>
      </div>

      <dl className="mt-6 flex flex-col gap-5">
        <Reading term="precisão" value={rate(d.summary.precision)} />
        <Reading term="recall" value={rate(d.summary.recall)} />
      </dl>

      <dl className="mt-6 flex flex-col gap-y-1.5 border-t border-rule-1 pt-4">
        {corpus.map((c) => (
          <div key={c.term} className="flex items-baseline justify-between gap-3">
            <dt className="font-mono text-[10.5px] tracking-tight text-ink-1">
              {c.term}
              {c.note && <NoteRef n={noteNumber(c.note)} id={c.note} />}
            </dt>
            <dd className={`text-[12.5px] tabular-nums ${c.dim ? "text-ink-2" : "text-ink-0"}`}>{c.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 flex items-baseline gap-1.5 text-[12px] text-ink-1">
        <a
          href={`#lim-${d.criterion}`}
          className="inline-flex items-baseline gap-1 rounded-sm underline decoration-rule-3 underline-offset-4 transition-colors hover:text-ink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Tabular>{d.summary.limitations}</Tabular>{" "}
          {d.summary.limitations === 1 ? "caso declarado" : "casos declarados"}
          <span aria-hidden>↓</span>
        </a>
        <NoteRef n={noteNumber("known_limitations_counted")} id="known_limitations_counted" />
      </p>
    </article>
  );
}

function Reading({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="u-sublabel text-ink-1">{term}</dt>
      <dd className="mt-2 font-serif text-[38px] leading-none tabular-nums text-ink-0">{value}</dd>
    </div>
  );
}

function NoteRef({ n, id }: { n: number | null; id: CaveatId }) {
  if (n === null) return null;
  return (
    <sup className="ml-0.5 font-mono text-[9px] font-normal">
      <a
        href={`#nota-${id}`}
        className="rounded-sm text-ink-1 underline decoration-dotted underline-offset-2 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="sr-only">Nota de método </span>
        {n}
      </a>
    </sup>
  );
}

function Field({ term, value, big = false }: { term: string; value: string; big?: boolean }) {
  return (
    <div>
      <dt className={big ? "u-sublabel text-ink-1" : "font-mono text-[10.5px] tracking-tight text-ink-1"}>{term}</dt>
      <dd
        className={
          big
            ? "mt-2 font-serif text-[26px] leading-none tabular-nums text-ink-0"
            : "mt-1.5 font-mono text-[13px] tabular-nums tracking-tight text-ink-0"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function MonoTag({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-block rounded-[3px] bg-surface-3 px-1.5 py-px font-mono text-[10px] tracking-tight text-ink-1 ${className}`}
    >
      {children}
    </span>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-[0.92em] tracking-tight text-ink-0">{children}</code>;
}

function Tabular({ children }: { children: React.ReactNode }) {
  return <span className="tabular-nums">{children}</span>;
}

function Quoted({ children }: { children: string }) {
  return (
    <>
      <span aria-hidden className="text-ink-dim">
        “
      </span>
      {children}
      <span aria-hidden className="text-ink-dim">
        ”
      </span>
    </>
  );
}

function Incompatible({ found }: { found: number }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-desk px-4">
      <div className="w-full max-w-136 overflow-hidden rounded-xl border border-rule-1 bg-sheet px-6 py-9 shadow-(--shadow-sheet) sm:px-10">
        <p className="u-label flex items-center gap-2 text-ink-2">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden />
          Avaliação do motor
        </p>
        <h1 className="mt-6 font-serif text-[28px] leading-tight tracking-[-0.015em] text-ink-0">
          Artefato incompatível
        </h1>
        <p className="mt-5 text-[14px] leading-[1.7] text-ink-1">
          Esta página renderiza o esquema <Tabular>{SUPPORTED_SCHEMA_VERSION}</Tabular> do artefato de avaliação, e{" "}
          <Mono>eval/report.json</Mono> declara <Tabular>{found}</Tabular>.
        </p>
        <p className="mt-3.5 text-[13px] leading-relaxed text-ink-2">
          Nada é exibido a partir de um esquema que a página não conhece: renderizar parcialmente arriscaria mostrar
          número fora do significado que ele tem.
        </p>
        <Link
          href="/"
          className="mt-7 inline-block rounded-sm text-[12.5px] text-ink-2 underline decoration-rule-3 underline-offset-4 transition-colors hover:text-ink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          Voltar ao Lucid
        </Link>
      </div>
    </main>
  );
}

function AssistedBand({
  corpus,
  noteNumber,
}: {
  corpus: NonNullable<EvalArtifact["assistedCorpus"]>;
  noteNumber: (id: CaveatId) => number | null;
}) {
  const promoted = corpus.measuredAssisted.length;
  const models = [...new Set(corpus.labelers.map((l) => l.model))];

  return (
    <Band id="corpus" label="Corpus assistido" aside="medido contra texto que ninguém escreveu para o detector">
      <p className="max-w-[64ch] text-[15px] leading-[1.65] text-ink-1">
        O recall dos critérios de léxico curado acima é circular
        <NoteRef n={noteNumber("circular_recall_curated")} id="circular_recall_curated" /> — os positivos do golden
        saíram da mesma lista que o detector consulta. Esta faixa é a resposta a essa ressalva:{" "}
        <Tabular>{corpus.criteria.length}</Tabular> critérios medidos contra <Tabular>{corpus.passages}</Tabular>{" "}
        trechos de <Tabular>{corpus.documents}</Tabular> atos oficiais federais, rotulados por dois modelos
        independentes e adjudicados por pessoa onde divergiram.
      </p>

      <p className="mt-4 max-w-[64ch] text-[13px] leading-relaxed text-ink-1">
        Ela <span className="text-ink-0">não</span> se funde com a faixa autoral
        <NoteRef n={noteNumber("assisted_supervision")} id="assisted_supervision" />: a supervisão é de outra natureza,
        e um critério que apareça nas duas tem duas medições de origens diferentes — não uma medição mais forte.
      </p>

      <div className="mt-7 flex flex-wrap items-end gap-x-12 gap-y-5 border-y border-rule-1 py-5">
        <div>
          <p
            className={`font-serif text-[34px] leading-none tabular-nums ${promoted === 0 ? "text-ink-2" : "text-ink-0"}`}
          >
            {promoted}
          </p>
          <p className="mt-2 text-[12.5px] leading-snug text-ink-0">com métrica promovida</p>
          <p className="mt-1 max-w-[24ch] text-[11.5px] leading-snug text-ink-1">
            passou no piso de concordância e teve o consenso auditado
          </p>
        </div>
        <div>
          <p className="font-serif text-[34px] leading-none tabular-nums text-human">{corpus.withheld.length}</p>
          <p className="mt-2 text-[12.5px] leading-snug text-ink-0">medidos e retidos</p>
          <p className="mt-1 max-w-[24ch] text-[11.5px] leading-snug text-ink-1">
            a medição existe; o portão recusou publicá-la, e diz por quê
          </p>
        </div>
        <p className="ml-auto max-w-[30ch] text-[11.5px] leading-relaxed text-ink-1">
          Split <Mono>{corpus.split}</Mono>
          {corpus.sealed ? " · selado" : " · não selado"} · corpus <Mono>{corpus.corpusVersion}</Mono>
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {corpus.criteria.map((c) => (
          <AssistedCard key={c.criterion} m={c} />
        ))}
      </div>

      <div className="mt-9 rounded-lg border border-rule-2 bg-surface-2 px-5 py-5">
        <p className="u-sublabel text-ink-1">procedência dos rótulos</p>
        <p className="mt-2.5 max-w-[64ch] text-[12.5px] leading-relaxed text-ink-1">
          Rotuladores:{" "}
          {models.map((m, i) => (
            <span key={m}>
              {i > 0 && <span className="text-ink-dim"> · </span>}
              <MonoTag>{m}</MonoTag>
            </span>
          ))}{" "}
          · temperatura <Tabular>0</Tabular> · prompt versionado por critério. Nenhum arquivo do pipeline de rotulagem
          importa o detector — a cerca é verificada pelo <Mono>dependency-cruiser</Mono>.
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 border-t border-rule-1 pt-4 sm:grid-cols-2">
          <Field term="hash dos documentos" value={corpus.hashes.documents.slice(0, 16)} />
          <Field term="hash dos trechos" value={corpus.hashes.passages.slice(0, 16)} />
        </dl>
      </div>

      <ol className="mt-7 flex flex-col gap-3">
        {corpus.caveats.map((caveat) => (
          <li key={caveat.id} className="border-t border-rule-1 pt-3 first:border-t-0 first:pt-0">
            <p className="max-w-[68ch] text-[12.5px] leading-[1.6] text-ink-1">
              {caveat.text} <MonoTag className="ml-0.5 align-[1px]">{caveat.id}</MonoTag>
            </p>
          </li>
        ))}
      </ol>
    </Band>
  );
}

function AssistedCard({ m }: { m: AssistedMeasurement }) {
  const floorMet = m.agreement.gwetAc1 !== null && m.agreement.gwetAc1 >= m.agreementFloor;
  const silent = silentStratumReading(m.strata.random);

  return (
    <section
      className={`rounded-lg border px-5 py-4 ${m.promoted ? "border-rule-2 bg-surface" : "border-human-line bg-human-weak"}`}
    >
      <header className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5">
        <h3 className="text-[14px] text-ink-0">{metaFor(m.criterion).label}</h3>
        <MonoTag>{m.criterion}</MonoTag>
        <span
          className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] ${
            m.promoted ? "bg-surface-3 text-ink-0" : "border border-human-line text-human"
          }`}
        >
          {m.promoted ? "publicado" : "retido"}
        </span>
      </header>

      {m.withheldReason !== null && (
        <p className="mt-3 max-w-[62ch] text-[12.5px] leading-relaxed text-ink-1">
          <span className="u-sublabel text-ink-1">por que não sai</span>
          <br />
          {m.withheldReason}
        </p>
      )}

      {m.promoted && silent !== null && (
        <p className="mt-3 max-w-[62ch] text-[12.5px] leading-relaxed text-ink-1">
          <span className="u-sublabel text-ink-1">o que foi publicado</span>
          <br />O detector ficou calado nos <Tabular>{silent.cases}</Tabular> trechos do estrato aleatório, e o rótulo
          revisado concorda: <span className="text-ink-0">nenhum falso positivo</span>. Precisão e recall ficam sem
          denominador — o achado é a ausência, e uma taxa aqui seria inventada.
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-rule-1 pt-4 sm:grid-cols-4">
        <Field
          term={`AC1 de Gwet · piso ${decimal(m.agreementFloor, 1)}`}
          value={`${decimal(m.agreement.gwetAc1)}${floorMet ? "" : " ↓"}`}
        />
        <Field term="κ de Cohen" value={decimal(m.agreement.cohenKappa)} />
        <Field term="pares comparados" value={String(m.agreement.n)} />
        <Field term="rótulos: pessoa/consenso" value={`${m.composition.human}/${m.composition.consensus}`} />
      </dl>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <StratumBlock
          title="estrato aleatório"
          note="amostra sem viés de superfície — o único onde recall significa alguma coisa"
          s={m.strata.random}
          promoted={m.promoted}
          enriched={false}
        />
        <StratumBlock
          title="estrato enriquecido"
          note="entrou por cue de superfície: precisão é legítima, recall mediria a cue"
          s={m.strata.cued}
          promoted={m.promoted}
          enriched
        />
      </div>
    </section>
  );
}

function StratumBlock({
  title,
  note,
  s,
  promoted,
  enriched,
}: {
  title: string;
  note: string;
  s: AssistedStratum;
  promoted: boolean;
  enriched: boolean;
}) {
  return (
    <div>
      <p className="u-sublabel text-ink-1">{title}</p>
      <p className="mt-1.5 max-w-[34ch] text-[11.5px] leading-snug text-ink-1">{note}</p>
      <dl className="mt-3 flex flex-col gap-2 border-t border-rule-1 pt-3">
        <Row term="casos · negativos" value={`${s.cases} · ${s.negatives}`} />
        <Row term="tp · fp · fn" value={`${s.tp} · ${s.fp} · ${s.fn}`} />
        <RateRow term="precisão" state={precisionState(s, promoted)} interval={s.precisionInterval} />
        <RateRow term="recall" state={recallState(s, promoted, enriched)} interval={s.recallInterval} />
      </dl>
    </div>
  );
}

function RateRow({
  term,
  state,
  interval,
}: {
  term: string;
  state: RateState;
  interval: AssistedStratum["precisionInterval"];
}) {
  if (state.kind === "value") {
    const value =
      interval === null ? rate(state.value) : `${rate(state.value)} [${rate(interval.low)}–${rate(interval.high)}]`;
    return <Row term={term} value={value} />;
  }

  const label = state.kind === "withheld" ? "retido" : state.kind === "unmeasurable" ? "não se mede" : "—";
  const tone = state.kind === "withheld" ? "text-human" : "text-ink-1";
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
      <dt className="font-mono text-[10.5px] tracking-tight text-ink-1">{term}</dt>
      <dd className={`font-mono text-[12px] tracking-tight ${tone}`}>{label}</dd>
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
      <dt className="font-mono text-[10.5px] tracking-tight text-ink-1">{term}</dt>
      <dd className="font-mono text-[12px] tabular-nums tracking-tight text-ink-0">{value}</dd>
    </div>
  );
}
