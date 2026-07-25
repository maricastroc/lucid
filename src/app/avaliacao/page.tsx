import type { Metadata } from "next";
import Link from "next/link";
import { coverageLabel, metaFor } from "../lib/criteria";
import rawReport from "../../../eval/report.json";
// Contrato compartilhado: o mesmo módulo que o tooling de eval usa para PRODUZIR o
// artefato. A página não redeclara a forma do que consome, e não depende de `test/`.
import { EVAL_SCHEMA_VERSION, type EvalArtifact } from "@/report/eval/contract";

export const metadata: Metadata = {
  title: "Avaliação do motor — Lucid",
  description:
    "Precisão, recall e cobertura do motor determinístico do Lucid, com as limitações do método declaradas. Números lidos do artefato de eval, não recalculados.",
};

/**
 * Versão de esquema que este build sabe renderizar — vem do contrato, não de uma constante
 * própria: a página compila contra a MESMA forma que o emissor produz. O gate abaixo pega o
 * caso de o JSON em disco estar atrasado em relação ao código.
 */
export const SUPPORTED_SCHEMA_VERSION = EVAL_SCHEMA_VERSION;

const artifact = rawReport as unknown as EvalArtifact;

/**
 * O `as` é sustentado por teste, não por esperança: `test/eval/artifact-drift.test.ts`
 * garante que este JSON é byte-idêntico ao que `buildEvalArtifact()` produz, logo ele
 * satisfaz `EvalArtifact` por construção. Se divergir, a suíte quebra antes do deploy.
 */

/** `null` = não há medida. Nunca 0, nunca 100%. */
function rate(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function decimal(value: number | null, places = 3): string {
  return value === null ? "—" : value.toFixed(places);
}

export default function AvaliacaoPage() {
  if (artifact.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    return <Incompatible found={artifact.schemaVersion} />;
  }

  const { stamp, method, detectors, services, criteriaCoverage } = artifact;

  return (
    <main className="mx-auto max-w-[860px] px-6 py-16 md:px-10 md:py-24">
      <header>
        <Link
          href="/"
          className="u-label text-ink-3 transition-colors hover:text-ink-1"
          aria-label="Voltar para o Lucid"
        >
          Lucid
        </Link>
        <h1 className="mt-6 font-serif text-[40px] leading-[1.1] tracking-[-0.01em] text-ink-0 md:text-[52px]">
          Avaliação do motor
        </h1>
        <p className="mt-5 max-w-[62ch] text-[15px] leading-relaxed text-ink-1">
          Precisão e recall do motor determinístico, medidos contra corpus rotulado à mão. Todos os números desta
          página são lidos do artefato <code className="font-mono text-[13.5px] text-ink-0">eval/report.json</code> —
          nada é recalculado aqui, e o que não foi medido aparece como não medido.
        </p>
        <p className="mt-3 max-w-[62ch] text-[14px] leading-relaxed text-ink-2">
          Nenhum dado desta página vem de modelo de linguagem. Para reproduzir:{" "}
          <code className="font-mono text-[13px] text-ink-1">npm run eval</code>.
        </p>
      </header>

      <Section title="Identidade da rodada" id="identidade">
        <p className="max-w-[62ch] text-[14px] leading-relaxed text-ink-2">
          A estampa identifica exatamente a rodada que produziu os números abaixo. Mesma estampa e mesmo corpus
          devem produzir os mesmos valores — é o que permite conferir em vez de acreditar.
        </p>
        <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-rule-1 bg-rule-1 sm:grid-cols-2">
          <StampField label="Versão do Lucid" value={stamp.lucidVersion} />
          <StampField label="Locale" value={stamp.localeId} />
          <StampField label="Norma" value={stamp.standardVersion} span />
          <StampField label="configHash" value={stamp.configHash} mono />
          <StampField label="dataHash" value={stamp.dataHash} mono />
          <StampField label="goldenHash" value={stamp.goldenHash} mono />
          <StampField label="schemaVersion" value={String(artifact.schemaVersion)} mono />
        </dl>
        <p className="mt-4 max-w-[62ch] text-[13px] leading-relaxed text-ink-3">
          <span className="text-ink-2">Limite conhecido:</span> nenhum destes hashes cobre o código-fonte dos
          detectores — <code className="font-mono text-[12.5px]">lucidVersion</code> é declarada à mão. Duas rodadas
          de código diferente sob a mesma versão têm estampa idêntica, e é por isso que o guard de atualidade do
          artefato compara byte a byte em vez de confiar na estampa.
        </p>
      </Section>

      <Section title="Limitações do método" id="metodo">
        <p className="max-w-[62ch] text-[14px] leading-relaxed text-ink-2">
          Estes avisos vêm do artefato e vêm antes dos números de propósito: eles delimitam o que os números podem
          significar. Pontuação por{" "}
          <code className="font-mono text-[13px] text-ink-1">{method.scoring}</code>.
        </p>
        <ul className="mt-6 flex flex-col gap-px overflow-hidden rounded-lg border border-rule-2 bg-rule-1">
          {method.caveats.map((caveat) => (
            <li key={caveat.id} className="bg-surface-2 px-5 py-4">
              <p className="u-sublabel text-ink-3">{caveat.id}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-1">{caveat.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Cobertura" id="cobertura">
        <p className="max-w-[62ch] text-[14px] leading-relaxed text-ink-2">
          O motor tem <Num>{criteriaCoverage.total}</Num> critérios. Só os da primeira camada têm precisão e recall
          publicados; as outras duas aparecem aqui justamente para que o silêncio não seja lido como aprovação.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <CoverageLayer
            title="Com métricas publicadas"
            criteria={criteriaCoverage.measured}
            note="Precisão e recall medidos contra golden que inclui casos negativos (oportunidade real de falso positivo)."
            emphasis
          />
          <CoverageLayer
            title="Rotulados, sem métrica agregada"
            criteria={criteriaCoverage.goldenLabelledOnly}
            note="Findings exatos fixados no golden integrado — regressão quebra o build, mas não há precisão/recall calculados."
          />
          <CoverageLayer
            title="Apenas teste unitário"
            criteria={criteriaCoverage.unitTestsOnly}
            note="Teste escrito a partir da implementação: confirma o que o autor previu e não mede recall sobre texto que ninguém antecipou."
          />
        </div>
      </Section>

      <Section title="Por critério" id="criterios">
        <p className="max-w-[62ch] text-[14px] leading-relaxed text-ink-2">
          <span className="text-ink-1">Casos</span> é o tamanho do corpus do critério e{" "}
          <span className="text-ink-1">negativos</span> é quantos deles exigem que o detector fique calado. Um traço
          significa ausência de medida, não zero.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-rule-2">
                <Th align="left">Critério</Th>
                <Th align="left">Cobertura</Th>
                <Th>Casos</Th>
                <Th>Neg.</Th>
                <Th>TP</Th>
                <Th>FP</Th>
                <Th>FN</Th>
                <Th>Precisão</Th>
                <Th>Recall</Th>
                <Th>Limit.</Th>
              </tr>
            </thead>
            <tbody>
              {detectors.map((d) => (
                <tr key={d.criterion} className="border-b border-rule-1">
                  <td className="py-3 pr-4 align-top">
                    <span className="text-ink-0">{metaFor(d.criterion).label}</span>
                    <span className="mt-0.5 block font-mono text-[11.5px] text-ink-3">{d.criterion}</span>
                  </td>
                  <td className="py-3 pr-4 align-top text-ink-2">{coverageLabel(d.coverage)}</td>
                  <Td>{d.summary.cases}</Td>
                  <Td>{d.summary.negatives}</Td>
                  <Td>{d.summary.tp}</Td>
                  <Td dim={d.summary.fp === 0}>{d.summary.fp}</Td>
                  <Td dim={d.summary.fn === 0}>{d.summary.fn}</Td>
                  <Td>{rate(d.summary.precision)}</Td>
                  <Td>{rate(d.summary.recall)}</Td>
                  <Td>{d.summary.limitations}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-ink-3">
          Cobertura <span className="text-ink-2">curada</span>: o critério compara contra lista curada, então a
          contagem é piso e o recall é circular (ver{" "}
          <code className="font-mono text-[12.5px]">circular_recall_curated</code> acima). Cobertura{" "}
          <span className="text-ink-2">produtiva</span>: a regra casa qualquer ocorrência do padrão.
        </p>

        {detectors.some((d) => d.regressions.length > 0) && (
          <div className="mt-8 rounded-lg border border-human-line bg-human-weak px-5 py-4">
            <p className="u-sublabel text-human">Regressões não explicadas</p>
            <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-1">
              Estes casos estão marcados como corretos no corpus e falharam. Não há motivo declarado — e a página não
              inventa nenhum. Em build verde esta seção não existe.
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {detectors.flatMap((d) =>
                d.regressions.map((reg) => (
                  <li key={`${d.criterion}:${reg.texto}`}>
                    <p className="font-serif text-[15px] leading-snug text-ink-0">“{reg.texto}”</p>
                    <p className="mt-1 font-mono text-[12px] text-ink-2">
                      {metaFor(d.criterion).label} · esperado <Num>{reg.expectedCount}</Num> · obtido{" "}
                      <Num>{reg.actualCount}</Num>
                    </p>
                  </li>
                )),
              )}
            </ul>
          </div>
        )}

        <div className="mt-10 flex flex-col gap-3">
          {detectors.map((d) => (
            <details key={d.criterion} className="group rounded-lg border border-rule-1 bg-sheet px-5 py-4">
              <summary className="cursor-pointer list-none text-[14px] text-ink-1 marker:content-none">
                <span className="text-ink-0">{metaFor(d.criterion).label}</span>
                <span className="text-ink-3">
                  {" — "}
                  {d.knownLimitations.length === 1
                    ? "1 limitação declarada"
                    : `${d.knownLimitations.length} limitações declaradas`}
                </span>
                <span className="ml-2 font-mono text-[11.5px] text-ink-dim group-open:hidden">abrir</span>
              </summary>
              <ul className="mt-4 flex flex-col gap-4 border-t border-rule-1 pt-4">
                {d.knownLimitations.map((lim) => (
                  <li key={lim.texto}>
                    <p className="font-serif text-[15px] leading-snug text-ink-0">“{lim.texto}”</p>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{lim.motivo}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[12.5px] leading-relaxed text-ink-3">
                Estas entradas contam contra a precisão e o recall da tabela — não são exceções removidas da conta.
              </p>
            </details>
          ))}
        </div>
      </Section>

      <Section title="Silabação" id="silabacao">
        <p className="max-w-[62ch] text-[14px] leading-relaxed text-ink-2">
          A contagem de sílabas alimenta a leiturabilidade (Flesch-PT). É serviço interno, não critério da norma, e
          por isso é medida por acerto exato em vez de precisão e recall.
        </p>
        <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-rule-1 bg-rule-1 sm:grid-cols-3">
          <StampField label="Acerto exato" value={rate(services.syllables.exactRate)} />
          <StampField label="Erro absoluto médio" value={decimal(services.syllables.meanAbsoluteError)} mono />
          <StampField label="Palavras no corpus" value={String(services.syllables.words)} mono />
        </dl>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-3">
          {services.syllables.limitations === 1
            ? "1 palavra do corpus está declarada como limitação conhecida e conta contra o acerto."
            : `${services.syllables.limitations} palavras do corpus estão declaradas como limitações conhecidas e contam contra o acerto.`}
        </p>
      </Section>

      <footer className="mt-20 border-t border-rule-1 pt-8">
        <p className="max-w-[62ch] text-[13.5px] leading-relaxed text-ink-2">
          Esta página mede o motor; não atesta a clareza de nenhum texto. Números altos aqui não são aprovação — são
          o piso do que a ferramenta consegue afirmar sobre si mesma.
        </p>
        <p className="mt-3 max-w-[62ch] text-[13px] leading-relaxed text-ink-3">
          O artefato é regenerado por <code className="font-mono text-[12.5px]">npm run eval</code> e um teste da
          suíte falha se ele ficar desatualizado em relação ao código ou ao corpus.
        </p>
      </footer>
    </main>
  );
}

function Incompatible({ found }: { found: number }) {
  return (
    <main className="mx-auto max-w-[640px] px-6 py-24">
      <p className="u-label text-ink-3">Avaliação do motor</p>
      <h1 className="mt-5 font-serif text-[32px] leading-tight text-ink-0">Artefato incompatível</h1>
      <p className="mt-5 text-[15px] leading-relaxed text-ink-1">
        Esta página renderiza o esquema <Num>{SUPPORTED_SCHEMA_VERSION}</Num> do artefato de avaliação, e{" "}
        <code className="font-mono text-[13.5px] text-ink-0">eval/report.json</code> declara{" "}
        <Num>{found}</Num>.
      </p>
      <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
        Nada é exibido a partir de um esquema que a página não conhece: renderizar parcialmente arriscaria mostrar
        número fora do significado que ele tem. Atualize a página para o esquema novo — ou regenere o artefato, se o
        arquivo é que está atrasado.
      </p>
      <Link href="/" className="u-label mt-8 inline-block text-ink-3 transition-colors hover:text-ink-1">
        Voltar ao Lucid
      </Link>
    </main>
  );
}

function Section({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-16 border-t border-rule-1 pt-10 md:mt-20">
      <h2 className="u-label text-ink-3">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StampField({
  label,
  value,
  mono = false,
  span = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  span?: boolean;
}) {
  return (
    <div className={`bg-sheet px-5 py-4 ${span ? "sm:col-span-2" : ""}`}>
      <dt className="u-sublabel text-ink-3">{label}</dt>
      <dd className={`mt-1.5 text-[14px] text-ink-0 ${mono ? "font-mono tabular-nums" : ""}`}>{value}</dd>
    </div>
  );
}

function CoverageLayer({
  title,
  criteria,
  note,
  emphasis = false,
}: {
  title: string;
  criteria: readonly string[];
  note: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-5 py-4 ${emphasis ? "border-rule-2 bg-sheet" : "border-rule-1 bg-transparent"}`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className={`text-[14px] ${emphasis ? "text-ink-0" : "text-ink-1"}`}>{title}</h3>
        <span className="font-mono text-[12px] tabular-nums text-ink-3">{criteria.length}</span>
      </div>
      <p className="mt-1.5 max-w-[58ch] text-[13px] leading-relaxed text-ink-3">{note}</p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {criteria.map((criterion) => (
          <li key={criterion} className={`text-[13px] ${emphasis ? "text-ink-1" : "text-ink-2"}`}>
            {metaFor(criterion).label}
            <span className="ml-1.5 font-mono text-[11px] text-ink-dim">{criterion}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Th({ children, align = "right" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={`u-sublabel pb-2.5 text-ink-3 ${align === "left" ? "pr-4 text-left" : "pl-3 text-right"}`}
    >
      {children}
    </th>
  );
}

function Td({ children, dim = false }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <td className={`py-3 pl-3 text-right align-top tabular-nums ${dim ? "text-ink-3" : "text-ink-0"}`}>{children}</td>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return <span className="tabular-nums text-ink-0">{children}</span>;
}
