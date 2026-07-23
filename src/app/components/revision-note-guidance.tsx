"use client";

import { type ReactNode } from "react";
import { isCriterionId, passiveScaffold, type Finding } from "@/lucid";
import { longSentenceGuidance } from "../lib/narrative";

export function Guidance({ finding, source }: { finding: Finding; source: string }) {
  const c = finding.criterion;
  if (!isCriterionId(c)) return <GenericGuide />;
  switch (c) {
    case "long_sentence":
      return <LongSentenceGuide finding={finding} source={source} />;
    case "passive_voice":
      return <PassiveGuide finding={finding} source={source} />;
    case "nominalization":
      return <NominalizationGuide finding={finding} />;
    case "nominalizacao_encadeada":
      return (
        <GuideText>
          Procure o verbo escondido no substantivo e devolva a ação a ele (“a verificação das informações” → “verificar as
          informações”). Quem pratica a ação — e qual nominalização vale desfazer — é decisão sua.
        </GuideText>
      );
    case "jargon":
      return <JargonGuide />;
    case "subordinacao_densa":
      return <SubordinacaoGuide finding={finding} />;
    case "leitor_terceira_pessoa":
      return <LeitorGuide finding={finding} />;
    case "redundancia":
      return (
        <GuideText>
          Corte o termo que repete o sentido do outro — a forma enxuta está na justificativa acima. Qual dos dois remover é
          decisão sua.
        </GuideText>
      );
    case "perifrase_inflada":
      return (
        <GuideText>
          Troque a locução pela forma enxuta equivalente (na justificativa). Confira só se a regência do que vem depois
          continua certa.
        </GuideText>
      );
    case "dupla_negacao":
      return (
        <GuideText>
          Diga direto o que a dupla negação afirma — a forma direta está na justificativa. Confirme que a nuance que você
          quis dar não se perde.
        </GuideText>
      );
    case "mais_que_perfeito_sintetico":
      return (
        <GuideText>
          Prefira a forma composta, mais clara: “tinha feito” no lugar de “fizera”. A troca pede reconjugar com o
          auxiliar — a frase final é sua.
        </GuideText>
      );
    case "gerundismo":
      return (
        <GuideText>
          Troque o gerúndio encadeado pelo futuro simples ou o presente: “enviaremos” / “enviamos” no lugar de “vamos
          estar enviando”.
        </GuideText>
      );
    case "adverbio_mente_denso":
      return (
        <GuideText>
          Corte ou substitua parte dos advérbios em -mente — o excesso pesa a leitura. Quais tirar depende da ênfase que
          você quer.
        </GuideText>
      );
    case "mesoclise":
      return (
        <GuideText>
          Reescreva sem a mesóclise: “será feito” ou “vai fazer” no lugar de “far-se-á”. Muda a construção, então a frase
          final é sua.
        </GuideText>
      );
    case "paragraph_length":
      return (
        <GuideText>
          Quebre o parágrafo em blocos menores, um grupo de ideias por vez. Onde cortar depende da organização do texto —
          decisão sua.
        </GuideText>
      );
    case "prose_enumeration":
      return (
        <GuideText>
          Transforme os itens embutidos no texto numa lista com marcadores — fica mais fácil localizar cada um. É uma
          decisão de formatação sua.
        </GuideText>
      );
    case "salto_de_nivel_titulo":
      return (
        <GuideText>
          A hierarquia de títulos pulou um nível. Rebaixe este título para o nível logo abaixo do anterior, ou crie o
          título intermediário que falta — assim o sumário e a leitura por estrutura ficam previsíveis.
        </GuideText>
      );
    case "long_heading":
      return (
        <GuideText>
          Encurte o título até virar um rótulo que o leitor use para localizar a seção — e, se ele fechou como frase,
          tire o ponto final e reduza à etiqueta essencial. O corte é seu.
        </GuideText>
      );
    case "single_item_list":
      return (
        <GuideText>
          Uma lista de um item só não separa nada: acrescente os itens que faltam, ou traga o conteúdo de volta para o
          texto corrido. A escolha depende do conteúdo — sua.
        </GuideText>
      );
    case "heading_body_mismatch":
      return (
        <GuideText>
          Releia o título e a seção juntos: ele antecipa o que o leitor vai encontrar aqui? Se não, ajuste o título ou
          confirme que a palavra em comum só mudou de forma (plural/singular) — a ferramenta não decide por você.
        </GuideText>
      );
    default:
      return assertNever(c);
  }
}

function assertNever(value: never): never {
  throw new Error(`critério sem guia de orientação: ${String(value)}`);
}

function GuideText({ children }: { children: ReactNode }) {
  return <p className="text-[12.5px] leading-relaxed text-ink-1">{children}</p>;
}

function GenericGuide() {
  return (
    <GuideText>
      A ferramenta apontou a construção, mas a correção depende de julgamento seu — ela não reescreve por conta própria.
    </GuideText>
  );
}

function LeitorGuide({ finding }: { finding: Finding }) {
  const noun = typeof finding.meta?.readerNoun === "string" ? finding.meta.readerNoun : null;
  return (
    <p className="text-[12.5px] leading-relaxed text-ink-1">
      O texto fala {noun ? <>de “<span className="text-ink-0">{noun}</span>” </> : "do leitor "}em terceira pessoa. Para
      aproximar, <span className="text-ink-0">fale com o leitor</span>: troque por “você deve…” ou use o imperativo
      (“apresente…”, “compareça…”). A ferramenta não faz a troca porque mudar a pessoa muda o registro — a escolha é sua.
    </p>
  );
}

function SubordinacaoGuide({ finding }: { finding: Finding }) {
  const clauses = typeof finding.meta?.clauses === "number" ? finding.meta.clauses : null;
  return (
    <p className="text-[12.5px] leading-relaxed text-ink-1">
      {clauses != null && (
        <>
          <span className="font-medium text-ink-0">{clauses} orações subordinadas</span> presas numa frase só.{" "}
        </>
      )}
      Separe em frases mais curtas, uma ideia por vez — o começo de cada oração subordinada costuma ser o corte natural. A
      ferramenta não reescreve: decidir o que vira frase própria e reconjugar é decisão sua.
    </p>
  );
}

function LongSentenceGuide({ finding, source }: { finding: Finding; source: string }) {
  const g = longSentenceGuidance(finding, source);
  return (
    <div>
      <p className="text-[12.5px] leading-relaxed text-ink-1">
        A ferramenta não reescreve — mas mede o esforço e <span className="text-ink-0">localiza onde a frase pode se
        dividir</span>. Use os pontos abaixo na sua edição, ou peça uma reescrita à IA e deixe a engine verificar.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="palavras" value={g.words != null ? String(g.words) : "—"} />
        <Stat label="acima de" value={g.over != null ? `+${g.over}` : "—"} />
        <Stat label="meta" value={g.targetSentences != null ? `${g.targetSentences} frases` : "—"} />
      </div>

      {g.candidates.length > 0 && (
        <div className="mt-4">
          <p className="u-sublabel mb-2 text-ink-3">
            pontos de divisão possíveis · informação, não ação
          </p>
          <ul className="flex flex-col gap-1.5">
            {g.candidates.map((c) => (
              <li
                key={c.offset}
                className="flex w-full items-baseline gap-1.5 rounded-lg border border-rule-1 bg-sheet px-3 py-2 text-left font-serif text-[13px] leading-snug"
              >
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-ink-2">…{c.before}</span>
                  <span className="mx-1.5 text-human" aria-hidden>
                    ⁝
                  </span>
                  <span className="text-ink-0">{c.after}…</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
            Fronteiras detectadas por pontuação e conjunção — a ferramenta aponta, não divide. A frase nova é sua.
          </p>
        </div>
      )}
    </div>
  );
}

function PassiveGuide({ finding, source }: { finding: Finding; source: string }) {
  const scaffold = passiveScaffold(finding, source);

  if (!scaffold) {
    if (finding.meta?.hasAgent === true) {
      return (
        <GuideText>
          O agente está no texto, então a informação existe — reordene para “quem faz → ação → o quê” e reconjugue o
          verbo. A ferramenta não monta a frase: reescreva abaixo ou peça a reescrita à IA; a engine verifica o
          resultado.
        </GuideText>
      );
    }
    return (
      <p className="text-[12.5px] leading-relaxed text-ink-1">
        <span className="font-medium text-ink-0">O texto não diz quem praticou a ação.</span> Para escrever na voz
        ativa, responda: <span className="text-ink-0">quem pratica essa ação?</span> Essa informação só você tem — a
        ferramenta não a inventa, nem monta a frase por você. Com a resposta em mãos, reescreva abaixo ou peça a
        reescrita à IA; a engine verifica o resultado.
      </p>
    );
  }

  return (
    <div>
      <p className="text-[12.5px] leading-relaxed text-ink-1">
        A ferramenta identifica os papéis no texto para você montar a voz ativa. É um{" "}
        <span className="text-ink-0">andaime, não a frase</span> — confira cada campo; a versão final é sua.
      </p>

      <div className="mt-3 flex flex-col gap-1.5">
        <RoleRow label="Agente" hint="vira o sujeito" value={scaffold.agent} />
        <RoleRow
          label="Ação"
          hint="vira o verbo"
          value={scaffold.action.participle}
          note={scaffold.action.baseVerb ? `→ ${scaffold.action.baseVerb}` : "→ escolha o verbo"}
        />
        <RoleRow label="Objeto" hint="o que sofreu a ação" value={scaffold.object} placeholder="você preenche" />
      </div>

      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
        Estrutura identificada · confira. A ferramenta não vira a frase: reordenar e reconjugar é escrever — e quem
        escreve é você (ou a IA, que a engine então verifica).
      </p>
    </div>
  );
}

function RoleRow({
  label,
  hint,
  value,
  note,
  placeholder,
}: {
  label: string;
  hint: string;
  value: string | null;
  note?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex items-baseline gap-3 rounded-lg border border-rule-1 bg-sheet px-3 py-2">
      <span className="u-sublabel w-16 shrink-0 text-human">{label}</span>
      <span className="min-w-0 flex-1">
        {value ? (
          <span className="font-serif text-[14px] text-ink-0">{value}</span>
        ) : (
          <span className="text-[12.5px] italic text-ink-3">— {placeholder}</span>
        )}
        {note && value && <span className="ml-1.5 font-sans text-[11.5px] text-ink-2">{note}</span>}
      </span>
      <span className="shrink-0 text-[10.5px] text-ink-3">{hint}</span>
    </div>
  );
}

function NominalizationGuide({ finding }: { finding: Finding }) {
  const base = typeof finding.meta?.baseVerb === "string" ? finding.meta.baseVerb : null;
  return (
    <p className="text-[12.5px] leading-relaxed text-ink-1">
      {base && (
        <>
          <span className="font-medium text-ink-0">Verbo-base: “{base}”.</span>{" "}
        </>
      )}
      Reescreva com o verbo direto (ex.: “fazer a análise” → “analisar”). A troca automática exigiria reconjugar o verbo
      ou ajustar o complemento — passos que só você deve decidir.
    </p>
  );
}

function JargonGuide() {
  return (
    <p className="text-[12.5px] leading-relaxed text-ink-1">
      Há um equivalente mais simples no glossário, mas a troca depende do que vem a seguir. Confirme que o contexto é um
      sintagma nominal (não uma oração) antes de substituir.
    </p>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-rule-1 bg-sheet px-2 py-2 text-center shadow-(--shadow-card)">
      <div className="text-[15px] tabular-nums text-ink-0">{value}</div>
      <div className="u-sublabel mt-0.5 font-medium text-ink-3">{label}</div>
    </div>
  );
}
