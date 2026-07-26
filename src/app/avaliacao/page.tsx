import type { Metadata } from "next";
import Link from "next/link";
import { coverageLabel, metaFor } from "../lib/criteria";
import rawReport from "../../../eval/report.json";
import { EVAL_SCHEMA_VERSION, type CaveatId, type DetectorReport, type EvalArtifact } from "@/report/eval/contract";

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

  const { stamp, method, detectors, services, criteriaCoverage } = artifact;

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

  return (
    <main className="min-h-dvh bg-desk px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-272">
        <div className="fade-in overflow-hidden rounded-xl border border-rule-1 bg-sheet shadow-(--shadow-sheet)">
          <header className="px-6 py-10 sm:px-14 sm:py-16">
            <p className="u-label flex items-center gap-2 text-ink-2">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              Avaliação do motor
            </p>

            <h1 className="mt-8 max-w-[28ch] font-serif text-[36px] leading-[1.08] tracking-[-0.02em] text-ink-0 sm:text-[50px]">
              O Lucid só publica métricas onde a medição é sustentada.
              <span className="mt-1 block text-ink-2">O resto ele declara como não medido.</span>
            </h1>

            <p className="mt-8 max-w-[60ch] text-[14.5px] leading-[1.7] text-ink-1">
              Cada taxa desta página vem de corpus rotulado à mão, com as falhas conhecidas contando contra o número em
              vez de serem excluídas. Todo valor é lido de <Mono>eval/report.json</Mono> — nada é recalculado aqui, e o
              que não foi medido aparece como não medido.
            </p>

            <p className="mt-6 flex max-w-[60ch] items-start gap-2.5 text-[13.5px] leading-relaxed text-ink-1">
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

            <nav aria-label="Seções" className="mt-10 flex flex-wrap items-center gap-2">
              {[
                ["metodo", "Método"],
                ["camadas", "Camadas de evidência"],
                ["criterios", "Critérios medidos"],
                ["falhas", "Falhas declaradas"],
                ["procedencia", "Procedência"],
              ].map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="inline-flex items-center rounded-full border border-rule-2 px-3 py-1 text-[12px] font-medium text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {label}
                </a>
              ))}
            </nav>
          </header>

          <Band id="metodo" label="Método" aside="o que os números podem significar">
            <p className="max-w-[64ch] text-[13.5px] leading-relaxed text-ink-2">
              Limites do método, do próprio artefato. Os cartões de critério remetem a eles pelos índices. Pontuação
              por <Mono>{method.scoring}</Mono>.
            </p>
            <ol className="mt-5 grid grid-cols-1 gap-x-10 lg:grid-cols-2">
              {method.caveats.map((caveat, i) => (
                <li
                  key={caveat.id}
                  id={`nota-${caveat.id}`}
                  className="grid scroll-mt-6 grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 border-t border-rule-1 py-3 transition-colors first:border-t-0 target:bg-accent-weak lg:[&:nth-child(2)]:border-t-0"
                >
                  <span aria-hidden className="pt-px font-mono text-[11px] tabular-nums text-ink-2">
                    {i + 1}
                  </span>
                  <p className="text-[12.5px] leading-[1.6] text-ink-2">
                    {caveat.text} <MonoTag className="ml-0.5 align-[1px]">{caveat.id}</MonoTag>
                  </p>
                </li>
              ))}
            </ol>
          </Band>

          <Band id="camadas" label="Camadas de evidência" aside="três regimes, não um placar">
            <p className="max-w-[62ch] text-[15px] leading-[1.65] text-ink-1">
              <Tabular>{criteriaCoverage.measured.length}</Tabular> dos{" "}
              <Tabular>{criteriaCoverage.total}</Tabular> critérios do motor têm métrica publicada. Os demais aparecem
              nas camadas abaixo, com a evidência que de fato existe para cada um — a régua enfraquece junto.
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
                      <p className="mt-1.5 max-w-[58ch] text-[12.5px] leading-relaxed text-ink-2">{TIERS[i].note}</p>
                      <ul className="mt-4 flex flex-wrap gap-1.5">
                        {l.criteria.map((c) => (
                          <li
                            key={c}
                            className="inline-flex items-baseline gap-1.5 rounded-full border border-rule-1 bg-surface px-2.5 py-1"
                          >
                            <span className="text-[12px] text-ink-1">{metaFor(c).label}</span>
                            <span className="font-mono text-[9.5px] tracking-tight text-ink-2">{c}</span>
                          </li>
                        ))}
                      </ul>
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
                      <p className="mt-1 font-mono text-[11px] text-ink-2">
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
            <p className="mt-6 max-w-[68ch] text-[12.5px] leading-relaxed text-ink-2">
              <span className="text-ink-1">Casos</span> é o tamanho do corpus do critério e{" "}
              <span className="text-ink-1">negativos</span> é quantos deles exigem que o detector fique calado — sem
              eles, precisão seria 100% por construção. Um traço significa ausência de medida, nunca zero.
            </p>
          </Band>

          <Band id="falhas" label="Falhas declaradas" aside="com motivo, contando contra a métrica">
            <div className="flex flex-col gap-11">
              {detectors.map((d) => (
                <section key={d.criterion} id={`lim-${d.criterion}`} className="scroll-mt-6">
                  <h3 className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-rule-2 pb-2.5">
                    <span className="text-[14px] text-ink-0">{metaFor(d.criterion).label}</span>
                    <MonoTag>{d.criterion}</MonoTag>
                    <span className="ml-auto text-[12px] tabular-nums text-ink-2">
                      {d.knownLimitations.length}{" "}
                      {d.knownLimitations.length === 1 ? "caso declarado" : "casos declarados"}
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
                        <div>
                          <p className="wrap-break-word border-l-2 border-rule-3 pl-4 font-serif text-[16.5px] leading-snug text-ink-0">
                            <Quoted>{lim.texto}</Quoted>
                          </p>
                          <p className="mt-3 max-w-[58ch] wrap-break-word pl-4 text-[12.5px] leading-[1.65] text-ink-2">
                            {lim.motivo}
                          </p>
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
              <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                <Field term="lucidVersion" value={stamp.lucidVersion} />
                <Field term="localeId" value={stamp.localeId} />
                <Field term="schemaVersion" value={String(artifact.schemaVersion)} />
                <Field term="configHash" value={stamp.configHash} />
                <Field term="dataHash" value={stamp.dataHash} />
                <Field term="goldenHash" value={stamp.goldenHash} />
              </dl>
              <p className="mt-5 border-t border-rule-1 pt-4 text-[12px] leading-relaxed text-ink-2">
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
                  <span className="ml-2 text-[12px] text-ink-2">serviço interno, não critério da norma</span>
                </h3>
                <dl className="mt-3.5 flex flex-wrap gap-x-10 gap-y-4">
                  <Field term="acerto exato" value={rate(services.syllables.exactRate)} big />
                  <Field term="erro absoluto médio" value={decimal(services.syllables.meanAbsoluteError)} big />
                </dl>
              </div>
              <p className="text-[12px] text-ink-2">
                <Tabular>{services.syllables.words}</Tabular> palavras ·{" "}
                <Tabular>{services.syllables.limitations}</Tabular> declaradas
              </p>
            </div>
          </Band>

          <footer className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-rule-1 bg-surface px-6 py-4 text-[11.5px] text-ink-2 sm:px-14">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            Medição determinística e offline
            <span className="text-ink-dim" aria-hidden>
              ·
            </span>
            Nenhum dado desta página vem de modelo de linguagem
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
      className="scroll-mt-4 border-t border-rule-1 px-6 py-10 sm:px-14 sm:py-12 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-x-10"
    >
      <div className="lg:pt-0.5">
        <h2 className="u-label text-ink-2">{label}</h2>
        {aside && <p className="mt-2 hidden max-w-[14ch] text-[11.5px] leading-snug text-ink-2 lg:block">{aside}</p>}
      </div>
      <div className="mt-5 lg:mt-0">{children}</div>
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
        <span className="shrink-0 rounded-full border border-rule-2 bg-surface-2 px-2 py-0.5 text-[10.5px] font-medium text-ink-2">
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
            <dt className="font-mono text-[10.5px] tracking-tight text-ink-2">
              {c.term}
              {c.note && <NoteRef n={noteNumber(c.note)} id={c.note} />}
            </dt>
            <dd className={`text-[12.5px] tabular-nums ${c.dim ? "text-ink-2" : "text-ink-0"}`}>{c.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 flex items-baseline gap-1.5 text-[12px] text-ink-2">
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
      <dt className="u-sublabel text-ink-2">{term}</dt>
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
        className="rounded-sm text-ink-2 underline decoration-dotted underline-offset-2 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
      <dt className={big ? "u-sublabel text-ink-2" : "font-mono text-[10.5px] tracking-tight text-ink-2"}>{term}</dt>
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
      <div className="w-full max-w-[34rem] overflow-hidden rounded-xl border border-rule-1 bg-sheet px-6 py-9 shadow-(--shadow-sheet) sm:px-10">
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
