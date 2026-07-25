import type { Metadata } from "next";
import Link from "next/link";
import { coverageLabel, metaFor } from "../lib/criteria";
import rawReport from "../../../eval/report.json";
import { EVAL_SCHEMA_VERSION, type CaveatId, type EvalArtifact } from "@/report/eval/contract";

export const metadata: Metadata = {
  title: "Avaliação do motor — Lucid",
  description:
    "Precisão, recall e cobertura do motor determinístico do Lucid, com as limitações do método declaradas. Números lidos do artefato de eval, não recalculados.",
};

export const SUPPORTED_SCHEMA_VERSION = EVAL_SCHEMA_VERSION;

const artifact = rawReport as unknown as EvalArtifact;

const comma = (s: string): string => s.replace(".", ",");

function rate(value: number | null): string {
  return value === null ? "—" : `${comma((value * 100).toFixed(1))}%`;
}

function decimal(value: number | null, places = 3): string {
  return value === null ? "—" : comma(value.toFixed(places));
}

export default function AvaliacaoPage() {
  if (artifact.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    return <Incompatible found={artifact.schemaVersion} />;
  }

  const { stamp, method, detectors, services, criteriaCoverage } = artifact;

  const noteNumber = (id: CaveatId): number | null => {
    const i = method.caveats.findIndex((c) => c.id === id);
    return i === -1 ? null : i + 1;
  };

  const temRegressao = detectors.some((d) => d.regressions.length > 0);

  return (
    <main className="min-h-dvh bg-sheet">
      <div className="mx-auto w-full max-w-300 px-6 pb-32 pt-14 md:px-12 md:pt-20 lg:px-16">
        <header>
          <nav aria-label="Trilha" className="flex items-center gap-2 text-[12.5px] text-ink-2">
            <Link
              href="/"
              className="rounded-sm underline decoration-rule-3 decoration-1 underline-offset-4 transition-colors hover:text-ink-0 hover:decoration-ink-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-2"
            >
              Lucid
            </Link>
            <span aria-hidden className="text-ink-dim">
              /
            </span>
            <span className="text-ink-1">Avaliação do motor</span>
          </nav>

          <h1 className="mt-8 max-w-[26ch] text-balance font-serif text-[42px] leading-[1.06] tracking-[-0.022em] text-ink-0 md:text-[56px]">
            Avaliação do motor determinístico
          </h1>

          <p className="mt-7 max-w-[58ch] text-pretty text-[16.5px] leading-[1.65] text-ink-1">
            Precisão e recall medidos contra corpus rotulado à mão. Todo número desta página é lido do artefato{" "}
            <Mono>eval/report.json</Mono> — nada é recalculado aqui, e o que não foi medido aparece como não medido.
          </p>

          {/* Placa de aferição: a identidade da rodada, adjacente ao título porque
              identifica o documento inteiro. Verbatim, monoespaçada, densa. */}
          <section aria-labelledby="estampa" className="mt-12 border-y border-rule-2 py-5">
            <h2 id="estampa" className="sr-only">
              Identidade da rodada
            </h2>
            {/* Dois grupos: o que a rodada É, e o que a afere. Nomes de campo verbatim do
                artefato — o leitor pode procurar cada um no JSON. */}
            <dl className="flex flex-col gap-y-6">
              <div className="flex flex-wrap items-baseline gap-x-12 gap-y-5">
                <Plate term="lucidVersion" value={stamp.lucidVersion} />
                <Plate term="localeId" value={stamp.localeId} />
                <Plate term="standardVersion" value={stamp.standardVersion} />
              </div>
              <div className="flex flex-wrap items-baseline gap-x-12 gap-y-5">
                <Plate term="configHash" value={stamp.configHash} />
                <Plate term="dataHash" value={stamp.dataHash} />
                <Plate term="goldenHash" value={stamp.goldenHash} />
                <Plate term="schemaVersion" value={String(artifact.schemaVersion)} />
              </div>
            </dl>
          </section>

          <p className="mt-5 max-w-[70ch] text-[13.5px] leading-relaxed text-ink-2">
            A estampa identifica a rodada que produziu estes números: mesma estampa e mesmo corpus devem produzir os
            mesmos valores. Ela não cobre o código-fonte dos detectores — <Mono>lucidVersion</Mono> é declarada à mão —
            e é por isso que o guard de atualidade do artefato compara byte a byte em vez de confiar nela.
          </p>

          <nav aria-label="Seções" className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2">
            {[
              ["cobertura", "Cobertura"],
              ["metodo", "Método"],
              ["criterios", "Critérios"],
              ["limitacoes", "Limitações declaradas"],
              ["silabacao", "Silabação"],
            ].map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-sm text-[13px] text-ink-2 underline decoration-rule-2 decoration-1 underline-offset-4 transition-colors hover:text-ink-0 hover:decoration-ink-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-2"
              >
                {label}
              </a>
            ))}
          </nav>
        </header>

        {/* ── Cobertura ────────────────────────────────────────────────────── */}
        <Section id="cobertura" label="Cobertura">
          <p className="max-w-[56ch] text-pretty text-[15px] leading-[1.6] text-ink-1">
            O motor tem <Tabular>{criteriaCoverage.total}</Tabular> critérios em três camadas de evidência. Só a
            primeira tem precisão e recall publicados; as outras aparecem para que o silêncio não seja lido como
            aprovação.
          </p>

          <div className="mt-10 flex flex-col gap-y-10">
            <CoverageColumn
              n={criteriaCoverage.measured.length}
              title="Com métricas publicadas"
              note="Precisão e recall contra golden que inclui casos negativos — há oportunidade real de falso positivo."
              criteria={criteriaCoverage.measured}
              strong
            />
            <CoverageColumn
              n={criteriaCoverage.goldenLabelledOnly.length}
              title="Rotulados, sem métrica"
              note="Findings exatos fixados no golden integrado: regressão quebra o build, mas não há taxa calculada."
              criteria={criteriaCoverage.goldenLabelledOnly}
            />
            <CoverageColumn
              n={criteriaCoverage.unitTestsOnly.length}
              title="Apenas teste unitário"
              note="Escrito a partir da implementação: confirma o previsto e não mede recall sobre texto não antecipado."
              criteria={criteriaCoverage.unitTestsOnly}
            />
          </div>
        </Section>

        {/* ── Método: antes dos números, e referenciado de dentro deles ────── */}
        <Section id="metodo" label="Método">
          <p className="max-w-[56ch] text-pretty text-[15px] leading-[1.6] text-ink-1">
            Estes limites vêm do artefato e vêm antes dos números porque delimitam o que os números podem significar. A
            tabela remete a eles pelos índices. Pontuação por <Mono>{method.scoring}</Mono>.
          </p>

          <ol className="mt-9 flex flex-col">
            {method.caveats.map((caveat, i) => (
              <li
                key={caveat.id}
                id={`nota-${caveat.id}`}
                className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 border-t border-rule-1 py-5 first:border-t-0 first:pt-0 target:bg-surface-2"
              >
                <span aria-hidden className="pt-px font-mono text-[13px] tabular-nums text-ink-2">
                  {i + 1}
                </span>
                <div>
                  <p className="max-w-[68ch] text-pretty text-[14.5px] leading-[1.62] text-ink-1">{caveat.text}</p>
                  {/* Id VERBATIM, minúsculo: é o dado do artefato, não um rótulo nosso. */}
                  <p className="mt-2.5 font-mono text-[11.5px] tracking-tight text-ink-2">{caveat.id}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* ── Critérios ────────────────────────────────────────────────────── */}
        <Section id="criterios" label="Critérios">
          {temRegressao && (
            <div className="mb-10 border-l-2 border-human pl-5">
              <h3 className="u-sublabel text-human">Regressões não explicadas</h3>
              <p className="mt-2.5 max-w-[62ch] text-[14px] leading-relaxed text-ink-1">
                Casos marcados como corretos no corpus que falharam. Não há motivo declarado — e esta página não
                inventa nenhum. Em build verde esta seção não existe.
              </p>
              <ul className="mt-5 flex flex-col gap-4">
                {detectors.flatMap((d) =>
                  d.regressions.map((reg) => (
                    <li key={`${d.criterion}:${reg.texto}`}>
                      <p className="max-w-[62ch] font-serif text-[16px] leading-snug text-ink-0">
                        <Quoted>{reg.texto}</Quoted>
                      </p>
                      <p className="mt-1.5 font-mono text-[12px] text-ink-2">
                        {d.criterion} · esperado <Tabular>{reg.expectedCount}</Tabular> · obtido{" "}
                        <Tabular>{reg.actualCount}</Tabular>
                      </p>
                    </li>
                  )),
                )}
              </ul>
            </div>
          )}

          <div className="-mx-6 overflow-x-auto px-6 md:mx-0 md:px-0">
            <table className="w-full min-w-[46rem] border-collapse text-left">
              <caption className="sr-only">
                Precisão, recall e contagens por critério medido. Um travessão indica ausência de medida.
              </caption>
              <thead>
                <tr>
                  <th scope="col" rowSpan={2} className="u-sublabel w-[26%] pb-2.5 pr-6 align-bottom text-ink-2">
                    Critério
                  </th>
                  <th scope="col" rowSpan={2} className="u-sublabel pb-2.5 pr-6 align-bottom text-ink-2">
                    Cobertura
                    <NoteRef n={noteNumber("circular_recall_curated")} id="circular_recall_curated" />
                  </th>
                  <ColGroupHead span={2}>
                    Corpus
                    <NoteRef n={noteNumber("count_scoring")} id="count_scoring" />
                  </ColGroupHead>
                  <ColGroupHead span={3}>Contagens</ColGroupHead>
                  <ColGroupHead span={2}>Taxas</ColGroupHead>
                  <th scope="col" rowSpan={2} className="u-sublabel pb-2.5 pl-6 align-bottom text-right text-ink-2">
                    Limitações
                    <NoteRef n={noteNumber("known_limitations_counted")} id="known_limitations_counted" />
                  </th>
                </tr>
                <tr className="border-b border-rule-3">
                  <SubHead>Casos</SubHead>
                  <SubHead>Negativos</SubHead>
                  <SubHead>TP</SubHead>
                  <SubHead>FP</SubHead>
                  <SubHead>FN</SubHead>
                  <SubHead>Precisão</SubHead>
                  <SubHead>Recall</SubHead>
                </tr>
              </thead>
              <tbody>
                {detectors.map((d) => (
                  <tr key={d.criterion} className="border-b border-rule-1">
                    <th scope="row" className="py-5 pr-6 align-baseline font-normal">
                      <span className="block text-[15px] leading-tight text-ink-0">{metaFor(d.criterion).label}</span>
                      <span className="mt-1.5 block font-mono text-[11.5px] tracking-tight text-ink-2">
                        {d.criterion}
                      </span>
                    </th>
                    <td className="py-5 pr-6 align-baseline text-[14px] text-ink-1">{coverageLabel(d.coverage)}</td>
                    <Cell>{d.summary.cases}</Cell>
                    <Cell>{d.summary.negatives}</Cell>
                    <Cell>{d.summary.tp}</Cell>
                    <Cell muted={d.summary.fp === 0}>{d.summary.fp}</Cell>
                    <Cell muted={d.summary.fn === 0}>{d.summary.fn}</Cell>
                    <Reading>{rate(d.summary.precision)}</Reading>
                    <Reading>{rate(d.summary.recall)}</Reading>
                    <Cell pad>{d.summary.limitations}</Cell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 max-w-[70ch] text-[13.5px] leading-relaxed text-ink-2">
            <span className="text-ink-1">Casos</span> é o tamanho do corpus do critério;{" "}
            <span className="text-ink-1">negativos</span> é quantos deles exigem que o detector fique calado. Cobertura{" "}
            <span className="text-ink-1">curada</span> compara contra lista curada, então a contagem é piso; cobertura{" "}
            <span className="text-ink-1">produtiva</span> casa qualquer ocorrência do padrão.
          </p>
        </Section>

        {/* ── Limitações declaradas: visíveis, não colapsadas ──────────────── */}
        <Section id="limitacoes" label="Limitações declaradas">
          <p className="max-w-[56ch] text-pretty text-[15px] leading-[1.6] text-ink-1">
            Cada falha conhecida do corpus, com o motivo escrito na curadoria. Todas contam contra a precisão e o
            recall da tabela — nenhuma é exceção removida da conta.
          </p>

          <div className="mt-10 flex flex-col gap-14">
            {detectors.map((d) => (
              <section key={d.criterion} aria-labelledby={`lim-${d.criterion}`}>
                <h3 id={`lim-${d.criterion}`} className="flex items-baseline gap-3">
                  <span className="text-[15px] text-ink-0">{metaFor(d.criterion).label}</span>
                  <span className="font-mono text-[11.5px] tracking-tight text-ink-2">{d.criterion}</span>
                </h3>
                <dl className="mt-5 flex flex-col">
                  {d.knownLimitations.map((lim) => (
                    <div key={lim.texto} className="border-t border-rule-1 py-5 first:border-t-0 first:pt-0">
                      <dt className="max-w-[62ch] font-serif text-[16.5px] leading-snug text-ink-0">
                        <Quoted>{lim.texto}</Quoted>
                      </dt>
                      <dd className="mt-2.5 max-w-[70ch] text-pretty text-[14px] leading-[1.62] text-ink-1">
                        {lim.motivo}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </Section>

        {/* ── Silabação ────────────────────────────────────────────────────── */}
        <Section id="silabacao" label="Silabação">
          <p className="max-w-[56ch] text-pretty text-[15px] leading-[1.6] text-ink-1">
            A contagem de sílabas alimenta a leiturabilidade (Flesch-PT). É serviço interno, não critério da norma, e
            por isso é medida por acerto exato em vez de precisão e recall.
          </p>

          <dl className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-3">
            <ServiceReading term="Acerto exato" value={rate(services.syllables.exactRate)} />
            <ServiceReading term="Erro absoluto médio" value={decimal(services.syllables.meanAbsoluteError)} />
            <ServiceReading term="Palavras no corpus" value={String(services.syllables.words)} />
          </dl>

          <p className="mt-8 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-2">
            <Tabular>{services.syllables.limitations}</Tabular>{" "}
            {services.syllables.limitations === 1 ? "palavra do corpus está" : "palavras do corpus estão"} declaradas
            como limitação conhecida e {services.syllables.limitations === 1 ? "conta" : "contam"} contra o acerto.
          </p>
        </Section>

        {/* ── Colofão ──────────────────────────────────────────────────────── */}
        <footer className="mt-28 border-t border-rule-2 pt-10">
          <dl className="grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <dt className="u-sublabel pt-1 text-ink-3">O que mede</dt>
            <dd className="max-w-[62ch] text-[14px] leading-relaxed text-ink-1">
              O motor. Não atesta a clareza de nenhum texto: número alto aqui não é aprovação, é o piso do que a
              ferramenta consegue afirmar sobre si mesma.
            </dd>

            <dt className="u-sublabel pt-1 text-ink-3">Reprodução</dt>
            <dd className="max-w-[62ch] text-[14px] leading-relaxed text-ink-1">
              <Mono>npm run eval</Mono> regenera o artefato. Um teste da suíte falha se ele ficar desatualizado em
              relação ao código ou ao corpus.
            </dd>

            <dt className="u-sublabel pt-1 text-ink-3">Procedência</dt>
            <dd className="max-w-[62ch] text-[14px] leading-relaxed text-ink-1">
              Nenhum dado desta página vem de modelo de linguagem: a medição é determinística e offline.
            </dd>
          </dl>
        </footer>
      </div>
    </main>
  );
}

/* ───────────────────────────── componentes ─────────────────────────────
 * Escala tipográfica: 11,5 (mono meta) · 13,5 (nota) · 14/14,5 (secundário) ·
 * 15/16,5 (leitura) · 20 (número de serviço) · 32 (numeral de cobertura) · 42/56 (título).
 * Ritmo em base 8: 8 / 16 / 24 / 40 / 56 / 96 / 112.
 */

/**
 * Seção com grid editorial: trilha de rótulo à esquerda, conteúdo à direita. O alinhamento
 * vertical dos rótulos é o que agrupa a página — por isso não há régua de largura total
 * entre seções, só branco.
 */
function Section({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <section
      id={id}
      className="mt-24 grid scroll-mt-10 grid-cols-1 gap-x-10 gap-y-5 md:mt-32 md:grid-cols-[10rem_minmax(0,1fr)]"
    >
      <h2 className="u-sublabel pt-1.5 text-ink-2">{label}</h2>
      <div>{children}</div>
    </section>
  );
}

/** Par da placa de aferição. O termo é o nome do campo no artefato — nunca em caixa alta. */
function Plate({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[11px] tracking-tight text-ink-3">{term}</dt>
      <dd className="mt-1.5 font-mono text-[13.5px] tabular-nums tracking-tight text-ink-0">{value}</dd>
    </div>
  );
}

function CoverageColumn({
  n,
  title,
  note,
  criteria,
  strong = false,
}: {
  n: number;
  title: string;
  note: string;
  criteria: readonly string[];
  strong?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-x-8 gap-y-4 border-t pt-6 sm:grid-cols-[4.5rem_minmax(0,1fr)] ${
        strong ? "border-ink-2" : "border-rule-2"
      }`}
    >
      <p className={`font-serif text-[34px] leading-none tabular-nums ${strong ? "text-ink-0" : "text-ink-2"}`}>{n}</p>
      <div>
        <h3 className={`text-[15px] leading-snug ${strong ? "text-ink-0" : "text-ink-1"}`}>{title}</h3>
        <p className="mt-2 max-w-[64ch] text-[13.5px] leading-relaxed text-ink-2">{note}</p>
        <ul className="mt-5 flex flex-wrap gap-x-9 gap-y-3.5">
          {criteria.map((criterion) => (
            <li key={criterion}>
              <span className="block text-[13.5px] leading-snug text-ink-1">{metaFor(criterion).label}</span>
              <span className="mt-0.5 block font-mono text-[10.5px] tracking-tight text-ink-2">{criterion}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Referência à nota de método, âncora HTML pura (zero JS). */
function NoteRef({ n, id }: { n: number | null; id: CaveatId }) {
  if (n === null) return null;
  return (
    <sup className="ml-1 font-mono text-[10px] font-normal tracking-normal">
      <a
        href={`#nota-${id}`}
        className="rounded-sm text-ink-2 underline decoration-dotted decoration-1 underline-offset-2 transition-colors hover:text-ink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-2"
      >
        <span className="sr-only">Nota de método </span>
        {n}
      </a>
    </sup>
  );
}

function ColGroupHead({ span, children }: { span: number; children: React.ReactNode }) {
  return (
    <th
      scope="colgroup"
      colSpan={span}
      className="u-sublabel border-b border-rule-2 px-6 pb-1.5 text-center align-bottom text-ink-2"
    >
      {children}
    </th>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="pb-2 pl-6 text-right align-bottom text-[11.5px] font-medium text-ink-2">
      {children}
    </th>
  );
}

/** Contagem bruta: tabular, discreta. Zero em `ink-3` para o não-zero ficar localizável. */
function Cell({ children, muted = false, pad = false }: { children: React.ReactNode; muted?: boolean; pad?: boolean }) {
  return (
    <td
      className={`py-5 text-right align-baseline text-[14px] tabular-nums ${pad ? "pl-6" : "pl-6"} ${
        muted ? "text-ink-3" : "text-ink-1"
      }`}
    >
      {children}
    </td>
  );
}

/** A LEITURA do instrumento: maior elemento da linha, porque é o que a página mede. */
function Reading({ children }: { children: React.ReactNode }) {
  return (
    <td className="py-5 pl-6 text-right align-baseline font-serif text-[19px] tabular-nums text-ink-0">{children}</td>
  );
}

function ServiceReading({ term, value }: { term: string; value: string }) {
  return (
    <div className="border-t border-rule-2 pt-5">
      <dt className="u-sublabel text-ink-3">{term}</dt>
      <dd className="mt-2.5 font-serif text-[26px] leading-none tabular-nums text-ink-0">{value}</dd>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-[0.92em] tracking-tight text-ink-0">{children}</code>;
}

function Tabular({ children }: { children: React.ReactNode }) {
  return <span className="tabular-nums">{children}</span>;
}

/** Aspas curvas fora da caixa de texto, à moda editorial. */
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
    <main className="grid min-h-dvh place-items-center bg-sheet px-6">
      <div className="max-w-[46ch]">
        <p className="u-sublabel text-ink-3">Avaliação do motor</p>
        <h1 className="mt-5 font-serif text-[34px] leading-tight tracking-[-0.02em] text-ink-0">
          Artefato incompatível
        </h1>
        <p className="mt-6 text-[15.5px] leading-[1.65] text-ink-1">
          Esta página renderiza o esquema <Tabular>{SUPPORTED_SCHEMA_VERSION}</Tabular> do artefato de avaliação, e{" "}
          <Mono>eval/report.json</Mono> declara <Tabular>{found}</Tabular>.
        </p>
        <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
          Nada é exibido a partir de um esquema que a página não conhece: renderizar parcialmente arriscaria mostrar
          número fora do significado que ele tem. Atualize a página para o esquema novo — ou regenere o artefato, se o
          arquivo é que está atrasado.
        </p>
        <Link
          href="/"
          className="mt-9 inline-block rounded-sm text-[13px] text-ink-2 underline decoration-rule-3 decoration-1 underline-offset-4 transition-colors hover:text-ink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-2"
        >
          Voltar ao Lucid
        </Link>
      </div>
    </main>
  );
}
