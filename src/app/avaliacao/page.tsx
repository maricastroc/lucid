import type { Metadata } from "next";
import Link from "next/link";
import { coverageLabel, metaFor } from "../lib/criteria";
import rawReport from "../../../eval/report.json";
// Contrato compartilhado: o mesmo módulo que o tooling de eval usa para PRODUZIR o
// artefato. A página não redeclara a forma do que consome, e não depende de `test/`.
import { EVAL_SCHEMA_VERSION, type CaveatId, type DetectorReport, type EvalArtifact } from "@/report/eval/contract";

export const metadata: Metadata = {
  title: "Avaliação do motor — Lucid",
  description:
    "Precisão, recall e cobertura do motor determinístico do Lucid, com as limitações do método declaradas. Números lidos do artefato de eval, não recalculados.",
};

/**
 * Versão de esquema que este build sabe renderizar — vem do contrato, não de uma constante
 * própria: a página compila contra a MESMA forma que o emissor produz.
 */
export const SUPPORTED_SCHEMA_VERSION = EVAL_SCHEMA_VERSION;

const artifact = rawReport as unknown as EvalArtifact;

/**
 * O `as` é sustentado por teste, não por esperança: `test/eval/artifact-drift.test.ts`
 * garante que este JSON é byte-idêntico ao que `buildEvalArtifact()` produz.
 */

/* Microtipografia: página em português, decimal com VÍRGULA. `—` = ausência de medida. */
const comma = (s: string): string => s.replace(".", ",");
const rate = (v: number | null): string => (v === null ? "—" : `${comma((v * 100).toFixed(1))}%`);
const decimal = (v: number | null, places = 3): string => (v === null ? "—" : comma(v.toFixed(places)));

/** Descrição de cada camada — copy da página, não dado do artefato. */
const LAYER_NOTE = [
  "Precisão e recall contra golden que inclui casos negativos.",
  "Findings exatos fixados no golden: regressão quebra o build, mas não há taxa agregada.",
  "Confirma o que o autor previu; não mede recall sobre texto que ninguém antecipou.",
] as const;

export default function AvaliacaoPage() {
  if (artifact.schemaVersion !== SUPPORTED_SCHEMA_VERSION) return <Incompatible found={artifact.schemaVersion} />;

  const { stamp, method, detectors, services, criteriaCoverage } = artifact;

  /**
   * Rampa de tinta em vez de cor semântica: as três camadas são um gradiente de FORÇA DE
   * EVIDÊNCIA, não de qualidade. Verde aqui leria como aprovação — e medido não é aprovado.
   */
  const layers = [
    { key: "measured", label: "com métrica publicada", criteria: criteriaCoverage.measured, ink: "var(--ink-0)" },
    {
      key: "labelled",
      label: "rotulados, sem métrica",
      criteria: criteriaCoverage.goldenLabelledOnly,
      ink: "var(--ink-2)",
    },
    { key: "unit", label: "apenas teste unitário", criteria: criteriaCoverage.unitTestsOnly, ink: "var(--ink-dim)" },
  ] as const;

  /** Índice da nota, derivado da POSIÇÃO no artefato — a página não inventa numeração. */
  const noteNumber = (id: CaveatId): number | null => {
    const i = method.caveats.findIndex((c) => c.id === id);
    return i === -1 ? null : i + 1;
  };

  const regressions = detectors.flatMap((d) => d.regressions.map((r) => ({ ...r, criterion: d.criterion })));

  return (
    <main className="min-h-dvh bg-desk px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-[68rem]">
        <div className="fade-in overflow-hidden rounded-xl border border-rule-1 bg-sheet shadow-(--shadow-sheet)">
          {/* ── Abertura: o fato honesto como manchete ─────────────────────── */}
          <header className="px-6 py-9 sm:px-14 sm:py-14">
            <div className="u-label flex flex-wrap items-center gap-2 text-ink-3">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              Avaliação do motor
              <span className="text-ink-dim" aria-hidden>
                ·
              </span>
              <span className="font-mono text-[10px] tracking-normal">
                lucid {stamp.lucidVersion} · {stamp.localeId} · esquema {artifact.schemaVersion}
              </span>
            </div>

            <h1 className="mt-7 max-w-[30ch] font-serif text-[34px] leading-[1.12] tracking-[-0.018em] text-ink-0 sm:text-[44px]">
              <Tabular>{criteriaCoverage.measured.length}</Tabular> dos <Tabular>{criteriaCoverage.total}</Tabular>{" "}
              critérios têm métrica publicada.
              <span className="block text-ink-2">O resto está declarado como não medido.</span>
            </h1>

            <p className="mt-7 max-w-[62ch] text-[14.5px] leading-[1.7] text-ink-1">
              Precisão e recall medidos contra corpus rotulado à mão, com as falhas conhecidas contando contra o
              número. Todo valor desta página é lido de <Mono>eval/report.json</Mono> — nada é recalculado aqui.{" "}
              <strong className="font-semibold text-ink-0">Número alto aqui não é aprovação.</strong>
            </p>

            {/* Assinatura de dado do produto: barra segmentada + legenda com swatch. */}
            <div className="mt-10 max-w-[36rem]">
              <div
                className="flex h-1.5 gap-1"
                role="img"
                aria-label={layers.map((l) => `${l.criteria.length} ${l.label}`).join(", ")}
              >
                {layers.map((l) => (
                  <span
                    key={l.key}
                    className="rounded-full"
                    style={{ width: `${(l.criteria.length / criteriaCoverage.total) * 100}%`, background: l.ink }}
                  />
                ))}
              </div>
              <dl className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px]">
                {layers.map((l) => (
                  <div key={l.key} className="inline-flex items-center gap-2">
                    <span className="size-2.5 rounded-[3px]" style={{ background: l.ink }} aria-hidden />
                    <dd className="tabular-nums text-ink-0">{l.criteria.length}</dd>
                    <dt className="text-ink-2">{l.label}</dt>
                  </div>
                ))}
              </dl>
            </div>

            <nav aria-label="Seções" className="mt-9 flex flex-wrap items-center gap-2">
              {[
                ["metodo", "Método"],
                ["criterios", "Critérios medidos"],
                ["camadas", "Camadas de evidência"],
                ["limitacoes", "Falhas declaradas"],
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

          {/* ── Método: antes das métricas, por princípio ──────────────────── */}
          <Band id="metodo" label="Método" aside="o que os números podem significar">
            <p className="max-w-[64ch] text-[13.5px] leading-relaxed text-ink-2">
              Estes limites vêm do artefato e vêm antes dos números porque delimitam a leitura deles. Os cartões de
              critério remetem a eles pelos índices. Pontuação por <Mono>{method.scoring}</Mono>.
            </p>
            <ol className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-2">
              {method.caveats.map((caveat, i) => (
                <li
                  key={caveat.id}
                  id={`nota-${caveat.id}`}
                  className={`grid scroll-mt-6 grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 rounded-lg border border-rule-1 bg-surface px-4 py-3.5 transition-colors target:border-accent-line target:bg-accent-weak ${
                    i === method.caveats.length - 1 && method.caveats.length % 2 === 1 ? "lg:col-span-2" : ""
                  }`}
                >
                  <span
                    aria-hidden
                    className="mt-px grid size-5 place-items-center rounded-full bg-surface-3 font-mono text-[10.5px] tabular-nums text-ink-2"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[13px] leading-[1.6] text-ink-1">{caveat.text}</p>
                    <p className="mt-2 font-mono text-[10.5px] tracking-tight text-ink-3">{caveat.id}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Band>

          {/* ── Regressão: alarme, só existe se houver ─────────────────────── */}
          {regressions.length > 0 && (
            <Band id="regressoes" label="Regressões" aside="falha sem motivo declarado">
              <div className="rounded-lg border border-human-line bg-human-weak px-4 py-4">
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

          {/* ── Critérios medidos: cartões, não CSV ────────────────────────── */}
          <Band id="criterios" label="Critérios medidos" aside={`${detectors.length} de ${criteriaCoverage.total}`}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {detectors.map((d) => (
                <CriterionCard key={d.criterion} d={d} noteNumber={noteNumber} />
              ))}
            </div>
            <p className="mt-5 max-w-[68ch] text-[12.5px] leading-relaxed text-ink-2">
              <span className="text-ink-1">Casos</span> é o tamanho do corpus do critério e{" "}
              <span className="text-ink-1">negativos</span> é quantos deles exigem que o detector fique calado — sem
              eles, precisão seria 100% por construção. Um traço significa ausência de medida, nunca zero.
            </p>
          </Band>

          {/* ── Camadas de evidência ───────────────────────────────────────── */}
          <Band id="camadas" label="Camadas de evidência" aside="por que o silêncio não é aprovação">
            <div className="flex flex-col gap-3">
              {layers.map((l, i) => (
                <div
                  key={l.key}
                  className="grid grid-cols-1 gap-x-8 gap-y-3 rounded-lg border border-rule-1 px-4 py-4 sm:grid-cols-[12rem_minmax(0,1fr)]"
                >
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: l.ink }} aria-hidden />
                      <span className="font-serif text-[26px] leading-none tabular-nums text-ink-0">
                        {l.criteria.length}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] leading-snug text-ink-1">{l.label}</p>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-2">{LAYER_NOTE[i]}</p>
                  </div>
                  <ul className="flex flex-wrap content-start gap-1.5">
                    {l.criteria.map((c) => (
                      <li
                        key={c}
                        className="inline-flex items-baseline gap-1.5 rounded-full border border-rule-1 bg-surface px-2.5 py-1"
                      >
                        <span className="text-[12px] text-ink-1">{metaFor(c).label}</span>
                        <span className="font-mono text-[9.5px] tracking-tight text-ink-3">{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Band>

          {/* ── Falhas declaradas ──────────────────────────────────────────── */}
          <Band id="limitacoes" label="Falhas declaradas" aside="com motivo, contando contra a métrica">
            <div className="flex flex-col gap-8">
              {detectors.map((d) => (
                <section
                  key={d.criterion}
                  id={`lim-${d.criterion}`}
                  aria-labelledby={`lim-h-${d.criterion}`}
                  className="scroll-mt-6"
                >
                  <h3 id={`lim-h-${d.criterion}`} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="text-[14px] text-ink-0">{metaFor(d.criterion).label}</span>
                    <MonoTag>{d.criterion}</MonoTag>
                    <span className="text-[12px] text-ink-2">
                      <Tabular>{d.knownLimitations.length}</Tabular>{" "}
                      {d.knownLimitations.length === 1 ? "falha declarada" : "falhas declaradas"}
                    </span>
                  </h3>
                  <dl className="mt-3.5 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {d.knownLimitations.map((lim) => (
                      <div key={lim.texto} className="rounded-lg border border-rule-1 bg-surface px-4 py-3.5">
                        <dt className="font-serif text-[14.5px] leading-snug text-ink-0">
                          <Quoted>{lim.texto}</Quoted>
                        </dt>
                        <dd className="mt-2 text-[12.5px] leading-[1.6] text-ink-2">{lim.motivo}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          </Band>

          {/* ── Procedência: estampa densa, no fim, onde ela pertence ──────── */}
          <Band id="procedencia" label="Procedência" aside="identidade da rodada">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
              <Field term="configHash" value={stamp.configHash} />
              <Field term="dataHash" value={stamp.dataHash} />
              <Field term="goldenHash" value={stamp.goldenHash} />
            </dl>
            <p className="mt-5 max-w-[68ch] text-[12.5px] leading-relaxed text-ink-2">
              A estampa identifica a rodada: mesma estampa e mesmo corpus devem produzir os mesmos valores. Ela não
              cobre o código-fonte dos detectores — <Mono>lucidVersion</Mono> é declarada à mão —, e por isso o guard
              de atualidade compara byte a byte em vez de confiar nela. Para regenerar: <Mono>npm run eval</Mono>.
            </p>

            <div className="mt-8 border-t border-rule-1 pt-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5">
                <h3 className="text-[13.5px] text-ink-1">
                  Silabação
                  <span className="ml-2 text-[12px] text-ink-2">serviço interno, não critério da norma</span>
                </h3>
                <span className="text-[12px] text-ink-2">
                  <Tabular>{services.syllables.words}</Tabular> palavras ·{" "}
                  <Tabular>{services.syllables.limitations}</Tabular> declaradas
                </span>
              </div>
              <dl className="mt-4 flex flex-wrap gap-x-12 gap-y-4">
                <Field term="acerto exato" value={rate(services.syllables.exactRate)} big />
                <Field term="erro absoluto médio" value={decimal(services.syllables.meanAbsoluteError)} big />
              </dl>
            </div>
          </Band>

          <footer className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-rule-1 bg-surface px-6 py-4 text-[11.5px] text-ink-2 sm:px-14">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            Medição determinística e offline
            <span className="text-ink-dim" aria-hidden>
              ·
            </span>
            {stamp.standardVersion}
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

/* ─────────────────────────────── componentes ─────────────────────────────
 * Vocabulário emprestado das telas de referência: folha flutuante com sombra,
 * numeral serif como leitura principal, chips e pílulas, tag mono para id,
 * bolinha de accent no eyebrow. Escala: 10/10,5 (mono meta) · 11,5/12,5 (apoio) ·
 * 13/14,5 (corpo) · 26/30 (leitura) · 34/44 (manchete).
 */

/** Faixa interna da folha: rótulo à esquerda, conteúdo à direita, régua acima. */
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
      className="scroll-mt-4 border-t border-rule-1 px-6 py-9 sm:px-14 sm:py-11 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-x-10"
    >
      <div className="lg:pt-0.5">
        <h2 className="u-label text-ink-2">{label}</h2>
        {aside && <p className="mt-2 hidden max-w-[14ch] text-[11.5px] leading-snug text-ink-3 lg:block">{aside}</p>}
      </div>
      <div className="mt-5 lg:mt-0">{children}</div>
    </section>
  );
}

/** Cartão de critério: a leitura em destaque, o corpus como apoio. */
function CriterionCard({ d, noteNumber }: { d: DetectorReport; noteNumber: (id: CaveatId) => number | null }) {
  const curated = d.coverage === "curated";
  return (
    <article className="flex flex-col rounded-lg border border-rule-1 bg-surface px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[14.5px] leading-tight text-ink-0">{metaFor(d.criterion).label}</h3>
          <MonoTag className="mt-1.5">{d.criterion}</MonoTag>
        </div>
        <span className="shrink-0 rounded-full border border-rule-2 bg-surface-2 px-2 py-0.5 text-[10.5px] font-medium text-ink-2">
          {coverageLabel(d.coverage)}
          {curated && <NoteRef n={noteNumber("circular_recall_curated")} id="circular_recall_curated" />}
        </span>
      </div>

      <dl className="mt-6 flex items-end gap-7">
        <Reading term="precisão" value={rate(d.summary.precision)} />
        <Reading term="recall" value={rate(d.summary.recall)} />
      </dl>

      <dl className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-rule-1 pt-3.5 text-[11.5px]">
        <Pair term="casos" value={d.summary.cases} note={noteNumber("count_scoring")} noteId="count_scoring" />
        <Pair term="negativos" value={d.summary.negatives} />
        <Pair term="tp" value={d.summary.tp} />
        <Pair term="fp" value={d.summary.fp} dim={d.summary.fp === 0} />
        <Pair term="fn" value={d.summary.fn} dim={d.summary.fn === 0} />
      </dl>

      {/* Dois links IRMÃOS, nunca aninhados: `<a>` dentro de `<a>` é HTML inválido e
          quebra a hidratação — além de deixar o alvo ambíguo para teclado e leitor. */}
      <p className="mt-4 flex items-baseline gap-1.5 text-[12px] text-ink-2">
        <a
          href={`#lim-${d.criterion}`}
          className="inline-flex items-baseline gap-1 rounded-sm underline decoration-rule-3 underline-offset-4 transition-colors hover:text-ink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Tabular>{d.summary.limitations}</Tabular>{" "}
          {d.summary.limitations === 1 ? "falha declarada" : "falhas declaradas"}
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
      <dd className="font-serif text-[30px] leading-none tabular-nums text-ink-0">{value}</dd>
      <dt className="mt-1.5 text-[11.5px] text-ink-2">{term}</dt>
    </div>
  );
}

function Pair({
  term,
  value,
  dim = false,
  note,
  noteId,
}: {
  term: string;
  value: number;
  dim?: boolean;
  note?: number | null;
  noteId?: CaveatId;
}) {
  return (
    <div className="inline-flex items-baseline gap-1.5">
      <dt className="text-ink-3">
        {term}
        {noteId && <NoteRef n={note ?? null} id={noteId} />}
      </dt>
      <dd className={`tabular-nums ${dim ? "text-ink-3" : "text-ink-0"}`}>{value}</dd>
    </div>
  );
}

/** Referência à nota de método — âncora HTML pura, zero JS. */
function NoteRef({ n, id }: { n: number | null; id: CaveatId }) {
  if (n === null) return null;
  return (
    <sup className="ml-0.5 font-mono text-[9px] font-normal">
      <a
        href={`#nota-${id}`}
        className="rounded-sm text-ink-3 underline decoration-dotted underline-offset-2 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
      <dt className="font-mono text-[10.5px] tracking-tight text-ink-3">{term}</dt>
      <dd
        className={
          big
            ? "mt-1.5 font-serif text-[24px] leading-none tabular-nums text-ink-0"
            : "mt-1.5 font-mono text-[12.5px] tabular-nums tracking-tight text-ink-0"
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
      className={`inline-block rounded-[3px] bg-surface-3 px-1.5 py-px font-mono text-[10px] tracking-tight text-ink-3 ${className}`}
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
        <div className="u-label flex items-center gap-2 text-ink-3">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden />
          Avaliação do motor
        </div>
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
