# Lucid — Handoff de sessão (estado atual + próximos passos)

> Documento de continuidade. Para retomar numa sessão nova: **leia este arquivo primeiro**,
> depois `CLAUDE.md` (identidade do produto) e `docs/DECISOES.md` (ADRs). Última atualização
> ao fim da sessão de 2026-07-23.
>
> **⚠️ Mudança de direção (2026-07-23, ADR-054): a engine nunca escreve nem aplica texto.**
> Saíram: conversão passiva→ativa (ADR-032/033/034), `applySplitAt`, sugestão composta de
> nominalização, aplicação de sugestões (individual e em lote) e os sources `safe`/`split`/
> `passive` do ledger. Ficaram: detecção intacta, andaime da passiva (ADR-013),
> `clauseSplitPoints` como informação, equivalente de jargão como informação (Copiar, sem
> Aplicar), edição manual e reescrita por IA — ambas verificadas por `verifyRewrite`.
> As menções abaixo a "aplicação automática"/"insere a quebra" descrevem o estado ANTERIOR;
> onde houver conflito, vale o ADR-054.

---

## 1. O que é o Lucid (1 parágrafo)

Motor **determinístico** de auditoria de Linguagem Simples (ABNT NBR ISO 24495-1:2024).
Camada 1 (linter, zero LLM, zero rede) **detecta, explica, pergunta e verifica — nunca
escreve nem aplica** (ADR-054). Equivalente curado 1:1 (glossário) aparece como informação;
o resto é marcado como decisão humana. Toda produção de texto é do autor ou da IA, e passa
pelo verificador. Identidade: **instrumento honesto — marca em vez de inventar.**
Detalhes em `CLAUDE.md`.

---

## 2. Estado do ENGINE (Camada 1) — SÓLIDO, não mexer sem ADR

- 4 critérios implementados: `long_sentence` (5.3.4), `passive_voice` (5.3.3),
  `nominalization` (5.3.3), `jargon` (5.3.2). Ver `src/lucid/core/passes/`.
- Decisões fechadas: **ADR-001 a ADR-011** em `docs/DECISOES.md`. Destaques recentes:
  - **ADR-010** — expansão curada do glossário de jargão (lote 2): +13 termos seguros.
  - **ADR-011** — nominalização finita → verbo finito via **tabela de conjugação fechada**
    (`nominalizacoes.pt.json` → `conjugations`), sem conjugador produtivo. Passiva→ativa
    foi **avaliada e recusada** (exige reordenar sujeito/objeto = fora da garantia mecânica).
- **Disciplina inegociável:** precisão > recall; a métrica dura de cada eval é
  **0 sugestões inseguras**. Golden sets em `test/eval/*`. Toda entrada de dado é
  justificada individualmente (nunca "decorar o golden").
- **Cerca (I1):** `core/**` nunca importa `probe/**`, `react`, `next`, rede, `report/**`,
  `app/**`. Verificada por `dependency-cruiser` (`npm run depcheck`) + `test/boundary.test.ts`.
- **Verificação:** `npm run test` (≈711 testes, byte-idênticos/snapshots), `npm run typecheck`,
  `npm run lint`, `npm run depcheck`. Tudo verde ao fim desta sessão (engine).

---

## 3. PLANO ACORDADO — modelo de 3 níveis de ação (endossado nesta sessão)

Ideia do usuário, avaliada e aprovada. Reenquadra o LLM: **a geração nunca recebe confiança
cega — a engine determinística é o VERIFICADOR.**

- **Tier 1 · Correção segura** — ✅ já existe (jargão/nominalização seguros, aplicação automática).

- **Tier 2 · Ação estrutural assistida** — ✅ **FEITO** (determinístico, zero rede; ADR-012 + ADR-013):
  - Frase longa: **decompor em cláusulas** (`clauseSplitPoints`) + o usuário escolhe um ponto e o
    Lucid **insere a quebra** (`applySplitAt`: ponto final + maiúscula, conjunção preservada, sem
    apagar palavra) devolvendo um rascunho que o autor revisa e re-analisa. UI: botões na nota +
    undo + reanálise automática.
  - Passiva com agente: **Agente / Ação / Objeto** extraídos do texto (`passiveScaffold`) —
    agente = sintagma após "pela"; ação = particípio + verbo-base de **tabela fechada**
    (`participios-infinitivo.pt.json`); objeto = sujeito **antes de "ser"** (aproximado, rotulado
    "confira"). Nunca vira a frase; 0 conteúdo fabricado (todo campo é substring literal).
  - Núcleo em `src/lucid/core/actions/`; reexportado pelo barrel. 28 testes novos; suíte 739 verde.

- **Tier 3 · Reescrita proposta e verificada** — ⭐ o diferencial. Camada 2 (LLM) atrás da cerca,
  opt-in, com **stub determinístico** para os testes (CI segue byte-idêntica), `temperature 0`,
  modelo fixado, prompt versionado — vive em `report/`, nunca em `core/`.
  Fluxo: `Detecção determinística → Proposta (LLM) → Reanálise (analyze) → Diff + preservação → Decisão`.
  **Contrato de verificação (honestidade = tudo):** separar PROVA de SINAL, nunca carimbar selo verde.
  - **Determinístico (PROVA):** reanálise (a violação alvo some e `totalFindings` **não aumenta**);
    números/datas preservados (conjuntos idênticos); sem jargão novo; delta de métricas (Flesch/palavras).
  - **Heurístico (SINAL, não prova):** entidades/nomes preservados (heurística de maiúscula/sigla);
    sentido preservado → **sonda de compreensão** (o `probe/` do CLAUDE.md) como teste NEGATIVO
    (se a sonda extraía o fato do original e não da proposta, perdeu informação → bandeira). Piso, jamais aprovação.
  - Nunca aplica sozinha; sempre rotulada "gerada". Mesmo princípio do CLAUDE.md: "passar no piso é
    ausência de uma falha, não evidência positiva".

---

## 4. ESTADO DO TIER 3 (incremento 1 FEITO — falta LLM real + UI)

**Migração editorial + Tier 2 CONCLUÍDOS** (ADR-012/013). **Tier 3 · incremento 1 FEITO**
(ADR-014, `src/report/rewrite/` + `src/lucid/probe/`): o **contrato + o verificador
determinístico + stubs**, sem rede, CI byte-idêntica.
- `RewriteProposer` (interface) + `StubRewriteProposer` (fixtures, determinístico).
- `verifyRewrite` — PROVA (target_resolved, no_new_findings, numbers/dates_preserved,
  no_new_jargon, delta de métricas) × SINAL (entities_preserved; meaning_preserved via sonda
  como teste NEGATIVO). **Sem campo "aprovado" — travado no tipo e por teste.**
- `proposeAndVerify` (orquestrador; nunca aplica). Sonda religada: `interpret` (só flag|neutro)
  + `StubComprehensionProbe`. 23 testes novos; suíte **762 verde**; cerca intacta.

**Tier 3 · incremento 2 FEITO — fiação na UI (stub).** Cartão "Reescrita gerada · experimental"
na nota (`revision-note.tsx` → `GeneratedRewrite`, só para `long_sentence`): botão **Gerar e
verificar** → `app/lib/rewrite.ts` (`StubRewriteProposer` + fixture do texto-exemplo) →
`proposeAndVerify`. Mostra PROVA (✓/✗) e SINAL (○/⚠) separados, delta de métricas, caveat
"passar não é aprovação", e **Usar como rascunho** (aplica no editor com undo; bloqueado se
`hasBlockingFailure`). Verificado no browser: proposta do exemplo passa 5/5 PROVAS, total
13→8 ao aplicar. Consome `@/report/rewrite` (app→report permitido; cerca intacta).

**Tier 3 · incremento 3 FEITO — proposer LLM real (Groq).** ADR-015. `Provider → modelos`
server-side: `ChatProvider`/`GroqProvider` (fetch, sem SDK), `LlmRewriteProposer` (prompt
versionado blindado, id = `provider:model+prompt@ver`), rota `app/api/rewrite` (chave só
server-side, allow-list validada, nunca retorna a chave). UI ganhou seletor de modelo +
proveniência. Modelos free habilitados: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`,
`openai/gpt-oss-120b`, `openai/gpt-oss-20b` (DeepSeek não está no catálogo desta conta;
qwen3.6 falha JSON mode). Verificado ao vivo (Llama 70B: PROVA 5/5, total 13→10). Testes com
`MockChatProvider` (offline); rede nunca na CI.

**Tier 3 · incremento 4 FEITO — reescrita LIVRE + sonda real** (ADR-016). Alvo generalizado
`finding → Span` (`RewriteRequest={text,target,criterion?}`); prompt `rewrite@2` (contexto do
documento inteiro, reescreve só o parágrafo-alvo, liberdade para reorganizar, blindado contra
inventar agente/informação); verificação com `region_improved`; **sonda real** (`probe/llm-probe.ts`
+ `probe/prompt.ts`) ligada na rota → SINAL `meaning_preserved` populado. Infra de LLM movida
para **`src/llm`** (neutro; cerca reforçada: `core ⊄ src/llm`). UI: cartão reescreve o parágrafo
de QUALQUER finding, com contexto do documento. 782 testes verdes.

**Achado ao vivo (registrado no ADR-016):** GPT-OSS 120B reescreveu um parágrafo-monstro
(Flesch -106,8→20,4) mas foi **vetado** (findings 1→3) e **inventou o "nós"** — o juiz não se
seduz por prosa. Duas limitações reais a atacar: (a) contagem crua de findings é blunt para
reescrita radical → **veredito ponderado por severidade**; (b) agente inventado em 1ª pessoa não
é pego → **prova determinística de 1ª pessoa nova**.

**Tier 3 · incremento 5 FEITO — estratégias de prompt + benchmark de SISTEMAS** (ADR-017).
Eixo `RewriteStrategy = "correct" | "rewrite"` (ambas blindadas contra invenção);
`LlmRewriteProposer(provider, model, strategy)`, id = `provider:model+estratégia@versão`.
Benchmark gateado (`test/rewrite-benchmark.test.ts`, `BENCHMARK=1`, fora da CI) mede 6
dimensões por sistema. `GroqProvider` ganhou retry em 429 (free tier) + `lastUsage` (tokens).

**Resultado ao vivo (3 parágrafos/sistema, Groq):**

| Sistema | reescreveu% | ΔFlesch | Δpalav | findings(depois) | provas OK% | fidelidade% | s/nome% | sem veto% | latência ms | tokens |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| llama-3.3-70b · correct | 100 | +2.0 | -0 | 3.0 | 100 | 100 | 100 | **100** | 654 | 478 |
| llama-3.3-70b · rewrite | 100 | **+67.6** | -1 | 2.7 | 100 | 100 | 100 | **33** | 679 | 657 |
| gpt-oss-120b · correct | 100 | +4.3 | -1 | 3.3 | 100 | 100 | 100 | **100** | 1225 | 785 |
| gpt-oss-120b · rewrite | 100 | **+75.3** | -15 | 1.0 | 100 | 100 | 100 | **67** | 1033 | 829 |

**Leitura:** (1) `rewrite` é MUITO mais claro (ΔFlesch +68/+75 vs +2/+4) — confirma a hipótese
do usuário; (2) provas determinísticas (números/datas/jargão) preservadas 100% em todos —
blindagem segurou; (3) **a tensão medida:** o `rewrite`, mais claro, era **vetado com muito mais
frequência** (sem-veto 33–67% vs 100% do `correct`), porque a contagem crua de findings punia a
reorganização radical. Ressalva honesta (I5): fidelidade/nome 100% = "sem violação de piso
detectada" nesse golden pequeno, NÃO "provado fiel".

**Após o veredito por severidade (ADR-018) — re-execução:** o veto deixou de punir trocar 1
`error` por alguns `warning`s.

| Sistema | ΔFlesch | findings(depois) | provas OK% | **sem veto% (antes → depois)** |
|---|--:|--:|--:|--:|
| llama-3.3-70b · rewrite | +72.5 | 1.7 | 100 | **33 → 100** |
| gpt-oss-120b · rewrite | +72.8 | 1.0 | 100 | **67 → 67** |

llama saltou **33→100%** (o gargalo era exatamente o punir a divisão de frase); gpt-oss ficou
67% — 1 dos 3 trechos ainda aumentou o PESO (severidade) de verdade, então segue vetado, e é
certo que siga. Clareza intacta (ΔFlesch ~+72). (`correct` varia um pouco run-a-run: o LLM às
vezes devolve texto idêntico com temperature 0 → "reescreveu%" < 100; é não-determinismo do
modelo, não bug.)

**Benchmark multi-provider — Gemini na tabela (ADR-030).** O harness passou a inferir o provider
pelo id do modelo (Groq × Gemini) pela mesma interface `ChatProvider`; a sonda segue num modelo
grátis. Default agora inclui `gemini-2.5-flash` ao lado do `llama-3.3-70b`. Corrida ao vivo (3
trechos/sistema, mesmo verificador determinístico):

| Sistema | reescreveu% | ΔFlesch | Δpalav | findings(depois) | provas OK% | fidelidade% | s/nome% | sem veto% | latência ms | tokens |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| llama-3.3-70b · correct | 67 | +0.5 | -0 | 4.0 | 100 | 100 | 100 | 100 | 556 | 479 |
| llama-3.3-70b · rewrite | 100 | **+69.8** | -1 | 2.0 | 100 | 100 | 100 | 67 | 657 | 653 |
| gemini-2.5-flash · correct | 100 | +16.6 | -2 | 3.3 | 67 | 100 | 100 | 67 | 1440 | 377 |
| gemini-2.5-flash · rewrite | 100 | **+71.5** | -1 | 2.0 | 67 | 100 | 100 | 33 | 1263 | 537 |

**Leitura:** (1) `rewrite` compra MUITO mais clareza que `correct` (ΔFlesch ~+70 vs ~+10), nos dois
providers; (2) **o verificador fez o trabalho:** as reescritas mais ousadas do Gemini tiveram o
maior ΔFlesch **mas** `provas OK%` caiu para 67 — no trecho `numeros-datas-nomes` a prova
determinística pegou um número/data alterado ou jargão novo — e o veto subiu (sem-veto 33%). Prosa
mais clara nunca compra aprovação; quem decide é o portão de provas. (3) Latência do Gemini free ~2×
a do Groq free, com menos tokens de saída. **Ressalva honesta (I5):** 1 corrida, `temperature 0`
(saída ainda varia run-a-run → `reescreveu% < 100` quando `correct` devolve texto idêntico), 3
trechos = sinal de piso, não placar. Reproduzir: `BENCHMARK=1 npx vitest run test/rewrite-benchmark.test.ts`
(opcional `BENCHMARK_MODELS=...`, `BENCHMARK_OUT=arquivo.md`).

**Tier 3 · incremento 6 FEITO — gerador FORTE (Gemini) + prova de 1ª pessoa** (ADR-021).
Reenquadramento após comparação externa (Gemini-juiz) que via a reescrita perdendo para o GPT:
o Tier 3 estava sendo medido como REESCRITOR (eixo proibido pelo CLAUDE.md) e só tinha geradores
free da Groq. Tese reafirmada: **o Lucid AUDITA, não gera** — gerador forte propõe, o verificador
determinístico é o diferencial (arquitetura já pronta em `verify.ts`). Entregue:
- **`GeminiProvider`** (`src/llm/gemini.ts`) na mesma interface `ChatProvider` (cerca intacta);
  chave no header, nunca na URL; wired em `/api/rewrite` + seletor da UI. Em uso: **`gemini-2.5-flash`**
  (2.5-pro exige tier pago → `limit: 0` na chave free). **Thinking desligado** (`thinkingBudget: 0`):
  evita truncagem por thinking tokens + reforça anti-drift.
- **Nova PROVA `no_invented_first_person`** (blocking): pega o "nós"/"nossa" fabricado que a sonda
  não pega. Lista fechada de pronomes/possessivos, zero morfologia produtiva; diferencial contra o
  DOCUMENTO INTEIRO (não veta 1ª pessoa que já existe no fonte).
- Verificado ao vivo (`/api/rewrite`, Flesch −12,0→48,6; 6/6 provas; sem truncar). **794 testes verdes.**

**Falta no Tier 3 (próximos incrementos):**
- ✅ (a) veredito por severidade (ADR-018); ✅ (b) prova de 1ª pessoa nova (ADR-021); ✅ gerador forte (ADR-021).
- ✅ **Prova UI ao vivo com Gemini** (ADR-030) — fluxo exercido no browser com `gemini-2.5-flash`
  sobre a frase-monstro do exemplo: **6/6 PROVAS**, SINAIS neutros, Flesch-PT +18.1, "Usar como
  rascunho" habilitado, caveat honesto renderizado. `POST /api/rewrite → 200`.
- ✅ **Typo do `.env`** corrigido → `DEEPSEEK_API_KEY` (ADR-030).
- **Outros providers** — OpenAI/Anthropic pela mesma interface `ChatProvider` (ADIADO nesta sessão;
  a interface já os acomoda). São **APIs pagas** (sem free tier), ao contrário de Groq/Gemini-flash;
  não são necessários — o produto (Camada 1) é zero-LLM. 2.5-pro quando houver billing (chave free = `limit: 0`).
- ✅ **Gemini na tabela de benchmark** (ADR-030) — harness multi-provider + tabela acima. Ainda falta:
  golden de benchmark maior + casos que estressem a sonda.

---

## 4.5. Camada 1 — frente de EXTENSIBILIDADE (registry + morfologia)

Trilha nova, paralela ao Tier 3. Design docs: `DESIGN-camada1-teto-deterministico.md`,
`DESIGN-camada-anotacao.md`, `DESIGN-d1-lexico-morfologico.md`, `DESIGN-data-registry.md`,
`DESIGN-adr-modelo-anotacao.md`.

- **Data registry (ADR-022/023):** `core/data/registry.ts` é a **única porta de dados**; cada
  dataset tem `fingerprint`; `analyze` estampa `meta.dataHash` → reprodutibilidade =
  `(lucidVersion, configHash, dataHash)`. `PassContext.data` = `DataView` escopada aos `dataDeps`.
  Preparação (Set/Map) memoizada no registry; tipos/transforms em `core/data/{types,prepare}.ts`.
- **3 detectores morfológicos (ADR-024) — FATIA VERTICAL entregue:** `mais_que_perfeito_sintetico`
  (léxico PortiLexicon, ambiguidade podada em build-time), `gerundismo` (padrão puro), 
  `adverbio_mente_denso` (allowlist PortiLexicon, densidade ≥3/frase).
- **Lote juridiquês (ADR-025):** `redundancia` + `perifrase_inflada` (léxicos próprios, matcher de
  frase compartilhado `passes/phrase-match.ts`, flag+explica). Arcaísmos/anáfora já são cobertos
  pelo glossário de jargão — não fazer pass próprio.
- **Painel da sonda (ADR-025):** Camada 2 na UI (`ProbePanel` + `/api/probe`), opt-in, HONESTO
  (nunca check verde). A UI passou a expor 3 dos 4 princípios (P4 via proxy-piso com caveat).
- **Princípio 2 / camada de blocos (ADR-026):** `Document.paragraphs` (`segment-paragraphs.ts`,
  linha em branco) — primeira estrutura de documento. Detectores `paragraph_length` (>5 frases) +
  `prose_enumeration` (≥3 ordinais desde "primeiro").
- **Meta-eval da sonda (ADR-043):** golden rotulado à mão (`test/eval/probe-golden.ts`, 12 trechos) +
  harness de concordância (`probe-eval.test.ts`). CI offline prova golden+harness+ponte→`interpret`;
  camada ao vivo (`PROBE_EVAL=1`, `PROBE_EVAL_MODEL` opcional) roda a sonda LLM real, imprime matriz de
  confusão e trava piso de recall ≥0,6. **Fronteira honesta:** o piso é EXTRAÇÃO, não compreensão (carga
  é sinal à parte). Corrida Groq 8B: **recall 100%, precisão 55%** (leitor de piso pessimista demais no
  lado "claro"). Fecha a última lacuna da disciplina de eval do CLAUDE.md.
- **DOCX-first → estrutura de verdade (ADR-038→042):** modelo de blocos (`heading`/`list` + `analyzeDocument`),
  importador DOCX (`src/importers/docx.ts`, mammoth, fora do core) + upload na UI, e **3 detectores de
  Princípio 2 sobre estrutura**: `salto_de_nivel_titulo` (ADR-041), `long_heading` (título longo/em-forma-de-frase)
  e `single_item_list` (ADR-042). **Render de blocos na UI (ADR-042):** títulos viram `h2..h6` e listas viram
  `<ul>/<ol>` (só com documento importado); `segmentRange`+`Segments` compartilham a máquina de marcas entre
  linhas × blocos. Todos só disparam em documento estruturado (texto puro não tem título/lista de verdade).
- **`heading_body_mismatch` — primeiro detector do Princípio 1 (ADR-044).** Fecha a fase 2 do CLAUDE.md
  por completo. Proxy de sobreposição título↔corpo (dataset novo `stopwords.pt.json`, palavras função
  fechado/curado): zero palavra de conteúdo em comum entre título e corpo da seção → `info`,
  `requiresHuman`. Acende o grupo "Relevante · 5.1" da UI pela primeira vez (antes só existia morto em
  `principleGroupOf`). **Limitação conhecida e testada:** comparação exata sem lemas — plural/singular
  do mesmo termo não conta como eco (falso positivo aceito porque o sinal já nasce fraco).
- **Mais 2 de texto puro (ADR-028):** `mesoclise` (regex `far-se-á`/`dir-lhe-ia`, zero-FP) +
  `dupla_negacao` (litotes "não é incomum", léxico via phrase-match; NÃO marca negação simples).
- **19 critérios, 953 testes** (ADR-029: registro de critérios; ADR-041/042/044: +4 estruturais; ADR-043:
  meta-eval da sonda). Verificado ao
  vivo no browser (todos os detectores marcam; sonda trava e reporta sem selo; estruturais sob "Fácil de
  localizar"; mesóclise/dupla-negação sob "Frases claras").
- **Independência de formato (ADR-027):** `Document` é o `AnnotatedDocument` canônico; `buildDocument`
  é o importador de texto puro (fronteira de formato). Contrato para DOCX/PDF/HTML futuros em
  `DESIGN-modelo-independente-de-formato.md` — detectores já são cegos ao formato (auditado). SEM
  importadores; extensões (blocos com `kind`, `analyzeDocument`, source-map) são aditivas e adiadas.
- ✅ **Dívida RESOLVIDA (ADR-029):** `app/lib/criteria.ts` não é mais um registro paralelo. O
  engine publica `CRITERION_IDS`/`CriterionId` (`core/criteria.ts`, reexportado por `@/lucid`);
  `Pass.criterion: CriterionId` e `CRITERION_META: Record<CriterionId, …>` tornam a completude
  checada em compile-time; `test/criteria-registry.test.ts` trava a igualdade de conjuntos. Adicionar
  detector ainda pede a copy editorial — mas agora **falha alto** em vez de cair no meta de `jargon`.
- **Fonte de léxico (D1 fechado):** PortiLexicon-UD (CC-BY 4.0), HF `NILC-ICMC-USP/PortiLexicon-UD`,
  TSV `forma⇥lema⇥FEATS`. Só fatias filtradas são bundladas (VERB.tsv 71 MB → derivado 850 KB).
  Atribuição obrigatória em `data/README.md`.
- **ADIADO por disciplina (YAGNI):** a camada de anotação de RUNTIME (readings/certainty/
  disambiguation/query) NÃO foi construída — nenhum dos 3 detectores precisa dela em runtime (a
  ambiguidade se resolve no build). Construir só quando um detector exigir contexto em runtime
  (ex.: pronome ambíguo, sujeito longo → precisam de POS/chunking). Também adiado: pruning por
  frequência do léxico; MorphoBr como suplemento de cobertura.
- **Fatias baixadas** ficam no scratchpad da sessão (AUX/ADV/NOUN/ADJ.tsv + derivados) — não
  re-baixar se continuar na mesma sessão.

---

## 4.6. Fronteira de locale — pt-BR como primeiro `Locale` (ADR-031) — FEITO

Trilha nova: o Lucid virou **language-pluggable** com o português como o primeiro locale explícito,
**comportamentalmente neutro** (única mudança de resultado: `meta.localeId`).

- **Core neutro de idioma.** `analyzeWithLocale(text, locale)` + `createAnalyzer({locale})`
  (`core/analyzer.ts`), sem estado global, sem `if (locale===)`. `DataView` neutra (`get<T>`),
  registry como fábrica (`createRegistry`), `Pass.criterion`/`dataDeps` → `string`. O core não
  importa nada de PT (provado por grep + cerca).
- **Tudo que é PT** foi para `src/locales/pt-BR/**` (`passes/`, `datasets/`, `services/` sílabas,
  `readability/` flesch, `actions/`, `criteria.ts`, `tier3.ts`) via `git mv`. O default pt-BR
  (`analyze`, `localePtBR`) é composto no barrel `src/lucid/index.ts`.
- **Cerca** (`dependency-cruiser`): `core ⊄ locales` + pureza de `locales/**`. Fail-loud provado.
- **Neutralidade**: diff dos snapshots é só `+localeId`; teste strip-and-compare no
  `diagnostic-snapshot.test`.
- **Tier 3 anti-mistura**: `verifyRewrite({locale})` recusa proposta de outro `localeId`; pt-BR
  fornece o `RewriteLocale` sem importar `report`.
- **Locale sintético** (`test/support/test-locale.ts`) prova extensibilidade sem inglês
  (`test/locale-architecture.test.ts`).
- **App**: rota `/api/rewrite` aceita/valida `localeId` (recusa ≠ pt-BR); sem seletor, sem tradução.
- **Deferido (decisão do usuário):** genericizar `Config`, renomear `Metrics.fleschPt`, inglês.
- **859 testes verdes**, typecheck/lint/depcheck limpos.

## 5. Guardrails (não violar)

- Camada 1: zero LLM, zero rede, saída byte-idêntica. Não importar nada de `probe/`/`report/` no `core/`.
- Nunca inventar: sem sugestão insegura; na dúvida, marca e devolve ao humano.
- **A engine nunca escreve nem aplica (ADR-054):** todo texto exibido é citação do documento
  ou dado curado; toda alteração no documento parte do autor ou da IA verificada.
- LLM só na Camada 2, atrás de flag, com stub determinístico nos testes; verificação = piso, nunca selo.
- Toda mudança de dado/heurística: ADR + entrada no golden + eval mostrando **0 sugestões inseguras**.
- Rodar sempre no fim: `npm run test && npm run typecheck && npm run lint && npm run depcheck`.
