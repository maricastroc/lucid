# DESIGN DOC — O teto determinístico da Camada 1

> **Status:** proposta / levantamento (não implementa nada).
> **Escopo:** o que uma engine **100% determinística, zero LLM, zero rede** consegue detectar
> em texto PT-BR, e como estruturar a Camada 1 para absorver esses detectores como simples
> *passes*. **Não-objetivo:** propor qualquer uso de LLM — este documento trata exclusivamente
> do potencial máximo da camada determinística. A Camada 2 (sonda) e o `requiresHuman` aparecem
> só para **demarcar a fronteira**, nunca como solução.
> **Autoridade de princípios:** ABNT NBR ISO 24495-1:2024. Style guides e literatura de NLP/
> readability entram como fonte de **detectores e exemplos**, nunca de princípios (mesma regra
> do `CLAUDE.md`).

---

## 1. Objetivo

Responder, com rigor, a uma pergunta de arquitetura: **qual é o teto real de uma análise de
Linguagem Simples feita sem nenhuma compreensão semântica?** Hoje a Camada 1 detecta 4 coisas
(frase longa, passiva, nominalização, jargão). Este documento mapeia o espaço inteiro de
detectores determinísticos, classifica cada um, e propõe uma arquitetura em que **adicionar um
detector no futuro seja só escrever um novo `Pass`** — sem tocar no núcleo.

Não é um plano de implementação nem um backlog priorizado para execução imediata. É o mapa do
território e a fundação para os ADRs que virão.

---

## 2. A régua: o que "determinístico" quer dizer aqui (e o que não quer)

O erro conceitual mais comum neste tema é confundir **determinismo** com **correção**. Eles são
ortogonais, e a distinção é a espinha deste documento.

- **Determinístico** = mesma entrada → mesma saída, byte a byte, sempre. É uma propriedade de
  *reprodutibilidade*. Uma regra idiota ("toda frase com a palavra 'banco' é jargão") é 100%
  determinística e 100% inútil.
- **Correto** = o finding corresponde a uma violação real. É uma propriedade de *precisão/recall*.

Quase tudo em linguagem é computável de forma determinística **se você aceitar erro suficiente**.
Logo, o teto da Camada 1 **não** é "o que dá para computar sem LLM" — é **"o que dá para computar
sem LLM a uma precisão aceitável, sob a disciplina precisão > recall"**. Essa é a régua real.

### 2.1 Os três níveis de classificação

Cada detector do catálogo é marcado com um destes:

- 🟢 **Determinístico total.** Opera sobre estrutura/string pura ou léxico fechado com
  correspondência exata. A correção é essencialmente a própria definição da regra; falso positivo
  ≈ 0 por construção. Ex.: comprimento de frase, espaço duplo, hierarquia de títulos.
- 🟡 **Determinístico com heurística.** A **saída** é byte-determinística (reproduzível), mas a
  **correção** é aproximada: a regra modela um fenômeno linguístico por padrões/léxicos que erram
  em casos de fronteira. Precisa de curadoria e de `requiresHuman`/`severity` calibrados. É onde
  vive a maior parte do valor — e do risco. Ex.: passiva, nominalização, sujeito longo, referente
  a distância. **Heurístico ≠ não-determinístico:** o pass roda igual toda vez; ele só pode estar
  *errado*, nunca *instável*.
- 🔴 **Depende de compreensão semântica — fora da Camada 1.** Exige entender o *sentido* para não
  ser ruído: correferência real, "uma ideia por parágrafo", "o título responde à pergunta do
  leitor", preservação de sentido numa troca. Vira `requiresHuman` (trabalho de autor) ou é o
  território-piso da Camada 2. Frequentemente existe um **proxy 🟡** estrutural do fenômeno 🔴 —
  o proxy pertence à C1; a coisa real, não.

A honestidade do produto depende de nunca promover um 🔴 a 🟢 disfarçado. O `requiresHuman` e a
separação PROVA/SINAL existem exatamente para isso.

### 2.2 Consequência de custo

Determinismo e baixo custo andam juntos: quase todo detector aqui é uma varredura **linear O(n)**
sobre tokens/frases, com lookups O(1) em léxicos. Os únicos que fogem disso são os de
**consistência** e **referência cruzada**, que são *two-pass* (coletar → comparar), ainda O(n).
Nada exige análise superlinear. Custo, portanto, quase nunca é o fator limitante — **o fator
limitante é sempre o falso positivo.**

---

## 3. Fontes do levantamento

- **Norma:** ABNT NBR ISO 24495-1:2024 (Princípios 1–4; Anexo B, lista de verificação).
- **Readability (clássico + PT):** Flesch, Flesch-Kincaid, Gunning Fog, SMOG, Coleman-Liau, ARI,
  Índice Gulpease (IT/PT-friendly, base em caracteres); **Flesch-PT de Martins et al. (1996)** e o
  ecossistema **NILC-Metrix / PorSimples (USP)**.
- **Plain language / style guides:** *Federal Plain Language Guidelines* (plainlanguage.gov),
  **GOV.UK style guide**, **Microsoft Writing Style Guide**, **Google developer documentation
  style guide**, **NIH/CDC Plain Language**, *The Elements of Plain Language*; no Brasil, os guias
  gov.br, LAB.mg, TCE-PE, Rede Nacional de Linguagem Simples (só como fonte de exemplos/glossário).
- **NLP clássico baseado em regras:** tokenização, segmentação de sentenças, análise morfológica
  por léxico finito (linhagem DELAF-PB / Unitex-PB), *chunking* raso por autômatos, casamento de
  padrões POS, detecção de negação, *style checkers* pré-neurais (Writer's Workbench da Bell Labs,
  `diction`/`style` do GNU, `proselint`, `write-good`, `retext`, LanguageTool baseado em regras).
- **Mentalidade de compilador/linter:** ESLint/Clippy — regras plugáveis, severidades, *autofix*
  seguro vs sugestão, metadados por regra, configuração por regra, ordenação estável de
  diagnósticos, proveniência por offset.

---

## 4. Estado atual (linha de base)

O que já existe e é sólido (não mexer sem ADR):

| Pass | Critério | Tier | Princípio ISO |
|---|---|---|---|
| `sentence-length` | `long_sentence` | 🟢 | 5.3.4 |
| `passive-voice` | `passive_voice` | 🟡 | 5.3.3 |
| `nominalization` | `nominalization` | 🟡 | 5.3.3 / 5.3.4 |
| `jargon` | `jargon` | 🟡 | 5.3.2 |

Infra existente relevante para a arquitetura (§9):
- `Pass = { criterion, category, principle, run(ctx) }` → `Finding[]`; registry é um array plano.
- `PassContext = { doc, config, data }` — **`data` (LoadedData) já existe, mas hoje chega vazio**;
  cada pass importa seus próprios dados. É um gancho de extensibilidade subutilizado.
- `Document = { source, sentences[], tokens[] }`. `Token = {text, lower, start, end, isWord}`.
  **Sem parágrafos, sem blocos estruturais, sem anotação morfológica.**
- Ordenação canônica de findings por `(start, end, criterion, principle)`, independente da ordem
  de execução. Determinismo travado por snapshot + boundary tests + depcheck.

Guardar isto: **o modelo de documento atual é o principal gargalo de extensibilidade** — vários
detectores do catálogo precisam de parágrafos e de anotação lexical que o `Document` não carrega.
A §9 ataca isso.

---

## 5. O catálogo de detectores

**Legenda.** Tier: 🟢 total · 🟡 heurística · 🔴 semântico (fora da C1).
Impl. (dificuldade) / Custo / FP (falso positivo) / Clareza (impacto): **B**aixo · **M**édio ·
**A**lto (FP também **N**ulo). ISO: subseção-âncora, ou "—" quando o detector vem de style guide
sem correspondente direto na norma.

### A. Estrutura sintática (nível da frase) → ISO 5.3.3 / 5.3.4

| Detector | Descrição | Tier | Impl. | Custo | FP | Clareza | ISO |
|---|---|---|---|---|---|---|---|
| `long_sentence` *(existe)* | frase acima do limiar de palavras | 🟢 | B | B | N | A | 5.3.4 |
| `sentence_length_syllables` | variante por sílabas/caracteres (pega frase densa e curta) | 🟢 | B | B | N | M | 5.3.4 |
| `subordination_depth` | nº de orações por frase (subordinadas encaixadas) | 🟡 | M | B | M | A | 5.3.4 |
| `coordination_chain` | encadeamento "e… e… e…" / polissíndeto | 🟡 | B | B | M | M | 5.3.4 |
| `passive_voice` *(existe)* | ser/estar + particípio | 🟡 | M | B | M | M | 5.3.3 |
| `nominalization` *(existe)* | verbo pesado escondido em substantivo | 🟡 | M | B | M | A | 5.3.3 |
| `long_preverbal_subject` | sujeito longo antes do verbo (segurar o sujeito) | 🟡 | A | B | M | A | 5.3.3 |
| `subject_verb_distance` | distância grande sujeito→verbo (aposto/inciso no meio) | 🟡 | A | B | M | M | 5.3.3 |
| `embedded_clause_interruption` | inciso longo entre vírgulas partindo a frase | 🟡 | M | B | M | M | 5.3.4 |
| `front_loaded_subordinate` | frase que abre com subordinada longa antes da principal | 🟡 | M | B | B | M | 5.3.4 |
| `multiple_negation` | dupla/tripla negação, negação aninhada | 🟡 | B | B | B | A | 5.3.3 |
| `parenthetical_density` | excesso de incisos (vírgulas/parênteses/travessões) por frase | 🟢 | B | B | B | M | 5.3.4 |
| `prepositional_chain` | cadeia "de X de Y de Z" (encaixe nominal à direita) | 🟡 | M | B | M | M | 5.3.4 |
| `heavy_verb_periphrasis` | locução verbal longa / tempo raro (fut. do subjuntivo, mais-que-perfeito) | 🟡 | M | B | B | M | 5.3.3 |
| `gerundism` | "vou estar fazendo" (ir + estar + gerúndio) | 🟢 | B | B | N | M | 5.3.3 |
| `mesoclisis` | mesóclise ("far-se-á", "dir-lhe-ia") — arcaísmo sintático | 🟢 | B | B | N | M | 5.3.2 |
| `hedging_modality` | empilhamento de modalizadores ("poder-se-ia eventualmente") | 🟡 | B | B | M | M | 5.1 |
| `run_on_sentence` | período sem pontuação com múltiplas orações independentes | 🟡 | M | B | M | A | 5.3.4 |
| `impersonal_construction` | "há que se", "tratar-se de", "cumpre" (apaga o agente) | 🟡 | M | B | M | M | 5.3.3 |

**Notas.**
- `long_preverbal_subject` / `subject_verb_distance` são de alto valor e alta dificuldade porque
  exigem **saber onde está o verbo** — ou seja, alguma anotação POS-lite (§8). São o caso-modelo
  de por que investir na camada de anotação compartilhada.
- `multiple_negation` é a "desfazer negação aninhada" da própria sonda do `CLAUDE.md` — proxy
  estrutural de carga de leitura, aqui detectável por léxico fechado de negadores.
- `run_on_sentence` e `subordination_depth` se sobrepõem parcialmente a `long_sentence`; o valor
  de separá-los é **apontar o princípio certo** (uma frase pode ser curta em palavras e ainda ter
  3 orações encaixadas).
- **🔴 fora daqui:** ambiguidade de escopo/aposição real ("garden-path"), decidir se uma frase é
  *semanticamente* ambígua. Existe proxy 🟡 fraco (múltiplos pontos de anexação), mas o veredito
  é semântico.

### B. Estrutura documental → ISO 5.2 (Localizável)

| Detector | Descrição | Tier | Impl. | Custo | FP | Clareza | ISO |
|---|---|---|---|---|---|---|---|
| `paragraph_length` | parágrafo acima de N frases/palavras | 🟢 | B | B | N | M | 5.2 |
| `heading_hierarchy_skip` | pula nível de título (H1→H3) | 🟢 | B | B | N | M | 5.2 |
| `orphan_heading` | título sem corpo / seção vazia | 🟢 | B | B | N | B | 5.2 |
| `prose_enumeration` | enumeração em prosa que caberia em lista ("primeiro… segundo…") | 🟡 | M | B | M | A | 5.2 |
| `list_parallelism` | itens de lista com abertura gramatical divergente | 🟡 | A | B | M | M | 5.2 |
| `list_punctuation_consistency` | pontuação/maiúscula inconsistente entre itens | 🟢 | B | B | B | B | 5.2 |
| `deep_nesting` | aninhamento de listas/seções além de N níveis | 🟢 | B | B | N | M | 5.2 |
| `section_length_balance` | seções radicalmente desiguais / "paredão" sem subtítulo | 🟢 | B | B | B | M | 5.2 |
| `numbering_consistency` | numeração quebrada (1,2,4) ou reiniciada | 🟢 | B | B | N | B | 5.2 |
| `table_opportunity` | padrão repetido "chave: valor" que caberia em tabela | 🟡 | M | B | A | M | 5.2 |
| `cross_reference_integrity` | "ver seção 5" onde a seção 5 não existe | 🟢 | M | M | B | M | 5.2 |

**Notas.**
- Toda a categoria B **pressupõe estrutura de entrada** (títulos, listas, parágrafos). Em texto
  cru sem marcação, o máximo é heurística de bloco por linhas em branco/numeração. Isso empurra
  uma decisão de arquitetura: a C1 precisa de um **parser de blocos leve** (§9.1) para desbloquear
  a categoria inteira. Sem ele, B fica quase toda inacessível.
- **🔴 fora daqui:** "uma ideia por parágrafo" (segmentação de tópico), "o título responde à
  pergunta do leitor" (relevância). Proxies 🟡: `paragraph_length`; "título é frase nominal curta
  vs pergunta"; sobreposição de termos título↔corpo. Úteis como **flag fraca, nunca score** — o
  `CLAUDE.md` já marca o detector de título como heurística fraca.

### C. Complexidade lexical → ISO 5.3.2 (palavras familiares)

| Detector | Descrição | Tier | Impl. | Custo | FP | Clareza | ISO |
|---|---|---|---|---|---|---|---|
| `jargon` *(existe)* | termo técnico com equivalente comum no glossário | 🟡 | M | B | M | A | 5.3.2 |
| `long_word` | palavra com ≥ N sílabas | 🟢 | B | B | N | M | 5.3.2 |
| `rare_word` | palavra fora das N mais frequentes do PT-BR (lista de frequência) | 🟡 | M | M | M | M | 5.3.2 |
| `latinism_archaism` | "outrossim", "destarte", "consoante", "data venia", "in casu" | 🟢 | B | B | N | A | 5.3.2 |
| `bureaucratic_formula` | "vimos por meio desta", "cumpre-nos informar", "sirvo-me" | 🟢 | B | B | N | A | 5.3.2 |
| `redundant_doublet` | duplas legais ("nula e sem efeito", "penas e sanções") | 🟢 | B | B | B | M | 5.3.4 |
| `pleonasm` | "elo de ligação", "planejar antecipadamente", "certeza absoluta" | 🟢 | B | B | B | M | 5.3.4 |
| `wordy_phrase` | perífrase inflada ("no sentido de"→"para", "com relação a"→"sobre") | 🟢 | B | B | B | A | 5.3.4 |
| `abstract_suffix_density` | densidade de -ção/-mento/-dade (estilo nominal abstrato) | 🟡 | B | B | M | M | 5.3.3 |
| `adverb_mente_overuse` | excesso de advérbios em -mente | 🟢 | B | B | B | B | 5.3.4 |
| `intensifier_overuse` | "muito", "extremamente", "absolutamente" em excesso | 🟢 | B | B | B | B | 5.3.4 |
| `undefined_acronym` | sigla usada antes de ser expandida na 1ª ocorrência | 🟡 | M | M | M | M | 5.3.2 |
| `unadapted_loanword` | estrangeirismo cru ("compliance", "deadline") com equivalente | 🟡 | B | B | A | M | 5.3.2 |
| `polysemy_flag` | palavra de sentido múltiplo ("banco", "manga") — **só sinaliza** | 🟡 | B | B | A | B | 5.3.2 |
| `spelled_out_number` | número por extenso onde dígito seria mais legível (guia de estilo) | 🟡 | B | B | M | B | — |

**Notas.**
- **O naipe de ouro do português burocrático/jurídico** está aqui: `latinism_archaism`,
  `bureaucratic_formula`, `redundant_doublet`, `pleonasm`, `wordy_phrase`. São 🟢 (léxico fechado,
  curado), FP baixíssimo, e impacto de clareza altíssimo no *público-alvo real* da Lei 15.263.
  São as vitórias mais óbvias do catálogo — muito valor, quase sem risco.
- `rare_word` é o detector previsto em `5.3.2` mas **restringido do runtime pelo ADR-008**: o
  mecanismo de raridade por frequência ficou fora desta etapa. Reintroduzi-lo é uma decisão
  aberta (precisa de lista de frequência versionada como dado; FP médio porque frequência ≠
  dificuldade).
- `polysemy_flag` obedece à regra dura do `CLAUDE.md`: **nunca trocar** palavra de sentido
  múltiplo — só sinalizar. Por isso FP "alto" é aceitável (o custo do erro é baixo: uma flag, não
  uma edição).
- `unadapted_loanword` tem FP alto porque muitos estrangeirismos já são a forma comum ("site",
  "online"); precisa de léxico curado com equivalente seguro, senão vira ruído.
- **🔴 fora daqui:** decidir se *neste contexto* "banco" é a instituição ou o assento. A
  desambiguação é semântica; a C1 só marca o risco.

### D. Referência e coesão → ISO 5.3.3

| Detector | Descrição | Tier | Impl. | Custo | FP | Clareza | ISO |
|---|---|---|---|---|---|---|---|
| `distant_antecedent` | pronome longe do único antecedente candidato | 🟡 | A | M | M | M | 5.3.3 |
| `ambiguous_pronoun` | ≥2 antecedentes candidatos compatíveis (gênero/número) | 🟡 | A | M | A | M | 5.3.3 |
| `anaphoric_legalese` | "o referido", "o supracitado", "o mencionado", "o mesmo" | 🟢 | B | B | B | M | 5.3.3 |
| `vague_this` | "isso/isto/este" sem núcleo nominal explícito perto | 🟡 | M | B | A | M | 5.3.3 |
| `demonstrative_overuse` | densidade alta de demonstrativos (métrica de carga) | 🟢 | B | B | B | B | 5.3.3 |
| `heavy_connective` | conectivo pesado ("outrossim", "não obstante", "por conseguinte") | 🟢 | B | B | N | M | 5.3.2 |

**Notas.**
- Esta categoria é onde a fronteira 🟡/🔴 é mais escorregadia. **Resolver** a quem "ele" se refere
  é 🔴 (correferência). Mas **medir a distância** até o candidato mais próximo e **contar candidatos
  compatíveis** é 🟡 estrutural — é exatamente a operação de leitura "resolver referente a
  distância" que a própria sonda do `CLAUDE.md` lista como carga. A C1 mede a *demanda*, não
  resolve a *referência*.
- `anaphoric_legalese` e `heavy_connective` são 🟢 por léxico fechado — outra vitória barata do
  domínio jurídico.
- `ambiguous_pronoun` tem FP alto: exige concordância de gênero/número (⇒ anotação morfológica,
  §8) e ainda assim erra quando o antecedente real está fora da janela. Bom candidato a `severity:
  info` + `requiresHuman`.

### E. Terminologia e consistência → ISO 5.2 / 5.3.2 (+ mentalidade de linter)

| Detector | Descrição | Tier | Impl. | Custo | FP | Clareza | ISO |
|---|---|---|---|---|---|---|---|
| `term_spelling_variant` | mesmo termo grafado de formas diferentes ("e-mail"/"email") | 🟢 | M | M | B | M | 5.2 |
| `acronym_defined_twice` | sigla expandida de duas formas diferentes no doc | 🟢 | M | M | B | B | 5.2 |
| `casing_inconsistency` | mesmo termo ora maiúsculo ora minúsculo | 🟢 | M | M | M | B | 5.2 |
| `number_format_consistency` | "R$ 1.000" vs "1000 reais" vs "mil reais" no mesmo doc | 🟢 | M | M | B | M | 5.2 |
| `date_format_consistency` | formatos de data misturados | 🟢 | M | M | N | M | 5.2 |
| `orthography_agreement` | mistura pré/pós Acordo Ortográfico ("idéia"/"ideia") | 🟢 | M | M | B | B | 5.3.2 |
| `controlled_vocab_deviation` | termo divergente de um vocabulário controlado fornecido | 🟡 | M | M | M | M | 5.2 |
| `elegant_variation` | mesmo conceito nomeado de formas diferentes (variação "elegante") | 🔴 | — | — | — | — | 5.2 |

**Notas.**
- Categoria estrutural de "linter": tudo é **two-pass** (coletar todas as ocorrências → comparar).
  Determinístico total quando o critério de "mesmo termo" é a **forma** (string). FP baixo.
- **Inversão importante vs. o senso comum de redação:** em Linguagem Simples, **repetir o mesmo
  termo é bom**; a "variação elegante" (chamar a mesma coisa de nomes diferentes) é o defeito. Ou
  seja, `elegant_variation` é desejável detectar, mas decidir que dois termos **são o mesmo
  conceito** é 🔴 sem um vocabulário controlado. Com um termbase fornecido, vira `controlled_vocab_
  deviation` (🟡, lookup). Sem ele, fica fora da C1.
- `term_spelling_variant`/`orthography_agreement` precisam de tabelas de variantes versionadas
  (dado), na mesma disciplina de curadoria do glossário de jargão.

### F. Legibilidade — MÉTRICAS de apoio (nunca selo) → ISO 5.4

| Métrica | Descrição | Tier | Impl. | Custo | FP | Clareza | ISO |
|---|---|---|---|---|---|---|---|
| `flesch_pt` *(existe)* | Flesch adaptado ao PT-BR (Martins 1996) | 🟢 | B | B | — | — | 5.4 |
| `flesch_kincaid_pt` | grau escolar adaptado | 🟢 | B | B | — | — | 5.4 |
| `gunning_fog_pt` | % de palavras longas + comprimento de frase | 🟢 | B | B | — | — | 5.4 |
| `gulpease` | índice base-caractere (robusto p/ PT) | 🟢 | B | B | — | — | 5.4 |
| `coleman_liau` / `ari` | grau por caracteres (sem contagem de sílabas) | 🟢 | B | B | — | — | 5.4 |
| `ttr_lexical_diversity` | type-token ratio / diversidade lexical | 🟢 | B | B | — | — | 5.4 |
| `sentence_length_variance` | ritmo: variância do comprimento de frase | 🟢 | B | B | — | — | 5.4 |
| `nilc_metrix_bundle` | reusar ~200 métricas do NILC-Metrix (PorSimples/USP) | 🟢 | A | M | — | — | 5.4 |

**Notas.**
- Métricas **não geram finding por span** — geram números globais. No modelo atual são `Metrics`,
  computadas fora do pipeline de passes. A §9.3 propõe formalizar **metric passes**.
- Regra inegociável do `CLAUDE.md`: **leiturabilidade é sinal de apoio, jamais aprovação.** Flesch
  bom não é check verde. Toda métrica aqui é subordinada aos Princípios 2–3.
- `nilc_metrix_bundle` é alto esforço porque é integração/port de um corpus grande de métricas;
  o retorno é ter as ~200 métricas de coesão/complexidade sem reinventá-las (o `CLAUDE.md` já manda
  reusar, não recalcular).

### G. Métricas globais / agregados de documento

| Métrica | Descrição | Tier | ISO |
|---|---|---|---|
| contagens | palavras, frases, parágrafos, sílabas | 🟢 | — |
| médias | palavras/frase, sílabas/palavra, frases/parágrafo | 🟢 | 5.3.4 |
| densidades | passiva, nominalização, advérbio, jargão por 100 palavras | 🟢 | 5.3.x |
| distribuição | percentis de comprimento de frase (não só a média) | 🟢 | 5.3.4 |
| carga de vocabulário | % de palavras fora do top-N de frequência | 🟡 | 5.3.2 |

**Nota.** Densidades são **agregações dos detectores 🟡** — herdam o FP deles, mas como número
global (não como acusação pontual) o custo do erro é menor. `CriterionScore.densityPer100Words` já
existe; dá para generalizar.

### H. Direção ao leitor, voz e registro → ISO 5.3 / 5.1

| Detector | Descrição | Tier | Impl. | Custo | FP | Clareza | ISO |
|---|---|---|---|---|---|---|---|
| `second_person_absent` | ausência de fala direta (você/tu) onde é esperada | 🟡 | M | B | A | M | 5.3 |
| `treatment_inconsistency` | mistura de tratamento (você/senhor/Vossa Senhoria) | 🟢 | B | B | B | M | 5.3 |
| `impersonality_overuse` | documento que nunca se dirige ao leitor (agregado) | 🟡 | M | B | M | M | 5.1 |
| `instruction_circumlocution` | instrução dada por rodeio em vez de imperativo direto | 🟡 | A | B | A | M | 5.3 |

**Notas.**
- `second_person_absent`/`impersonality_overuse` são **contextuais por natureza** (nem todo texto
  deve falar "você") → FP alto, `requiresHuman`, e melhor como sinal de documento do que como
  finding pontual. É o item "fala direta ao leitor ausente" da fase 2 do `CLAUDE.md`.
- `instruction_circumlocution` beira o 🔴: reconhecer que uma frase *é uma instrução* dada de forma
  indireta exige quase-semântica. Manter como heurística fraca ou deixar fora.

### I. Formatação de dados (números, datas, unidades) → ISO 5.2 / 5.4 (usabilidade micro)

| Detector | Descrição | Tier | Impl. | Custo | FP | Clareza | ISO |
|---|---|---|---|---|---|---|---|
| `date_format_style` | data fora do padrão recomendado / ambígua (01/02) | 🟢 | B | B | B | M | 5.2 |
| `currency_unit_format` | moeda/unidade formatada de forma inconsistente ou densa | 🟢 | B | B | B | M | 5.2 |
| `excessive_precision` | precisão desnecessária ("37,4826%") | 🟢 | B | B | M | B | 5.4 |
| `large_number_readability` | número grande sem separador/por extenso onde ajudaria | 🟢 | B | B | M | B | 5.4 |
| `domain_id_format` | CPF/CNPJ/CEP/processo fora do formato canônico | 🟢 | M | B | B | B | — |

**Nota.** Categoria de altíssima previsibilidade (regex + regra de estilo). Baixo impacto de
clareza individual, mas **polimento cumulativo** e FP baixo. Bom "primeiro pass" para exercitar a
arquitetura.

### J. Ortografia e mecânica (escopo a decidir)

| Detector | Descrição | Tier | Impl. | Custo | FP | Clareza | ISO |
|---|---|---|---|---|---|---|---|
| `whitespace_punctuation` | espaço antes de vírgula, espaço duplo, ponto faltando | 🟢 | B | B | N | B | — |
| `typographic_consistency` | aspas retas vs curvas, hífen vs travessão | 🟢 | B | B | B | B | — |
| `spelling_error` | erro ortográfico via dicionário (estilo Hunspell) | 🟢 | A | M | M | M | 5.3.2 |
| `agreement_error` | concordância nominal/verbal quebrada | 🟡 | A | M | A | M | 5.3.3 |

**Notas.**
- `whitespace_punctuation`/`typographic_consistency` são 🟢 triviais — bom higienizador, fora do
  coração da Linguagem Simples.
- `spelling_error` é 🟢 **em princípio** (dicionário finito) mas é uma dependência de dados grande
  (léxico completo do PT-BR + morfologia) e reimplementa um corretor ortográfico — provavelmente
  **fora de escopo** (existe ferramenta madura; não é o diferencial do Lucid). Registrado por
  completude.
- `agreement_error` é 🟡 e **difícil de verdade** em PT (exige análise morfológica robusta de
  gênero/número/pessoa); FP alto. Território clássico de *rule-based grammar checker* (LanguageTool)
  — grande empreitada. Fora do MVP; anotado como teto teórico.

---

## 6. Síntese: onde está o teto

Somando o catálogo, o teto determinístico da Camada 1 para PT-BR é **muito mais alto do que os 4
detectores atuais** — dá para triplicar ou quadruplicar a cobertura sem tocar em LLM. Mas o teto
tem uma forma específica:

**A C1 alcança bem (fica forte):**
- Tudo que é **forma, estrutura e mecânica** (Princípio 2 — Localizável; e a mecânica do 3).
- Tudo que é **léxico fechado e curado** — especialmente o **naipe jurídico/burocrático**
  (latinismos, arcaísmos, fórmulas de cortesia, duplas redundantes, perífrases infladas, anáfora
  legalesa, conectivos pesados). Este é, provavelmente, o **maior retorno sobre investimento** de
  todo o documento: 🟢, FP mínimo, impacto enorme no público real da Lei 15.263.
- **Padrões sintáticos** de superfície (passiva, nominalização, gerundismo, mesóclise, negação
  múltipla, cadeias preposicionais) — 🟡, dependentes de curadoria.
- **Consistência** (terminologia, formatos, numeração) — 🟢, two-pass.
- **Métricas** de leiturabilidade — 🟢, mas só como apoio, nunca selo.

**A C1 nunca alcança (a parede semântica):**
- **Princípio 1 (Relevante):** o texto entrega o que o leitor veio buscar? Modelar o leitor,
  cortar o supérfluo, decidir o que entra. É trabalho de autor **antes** de escrever → `requiresHuman`.
- **Princípio 4 (Usável):** o leitor real consegue usar? Só teste com leitores responde →
  território-piso da Camada 2, jamais aprovação.
- **Correferência real, topicalidade ("uma ideia por parágrafo"), preservação de sentido, "o
  título responde à pergunta", varição elegante conceitual.** Todos 🔴.

O padrão que emerge: **para quase todo fenômeno 🔴 existe um proxy 🟡 estrutural que mede a
*demanda de leitura* sem entender o *conteúdo*.** A C1 mede demanda; ela nunca julga compreensão.
Essa é a definição operacional do teto — e é exatamente a divisão de trabalho que a norma
canoniza (mecânico na C1; leitor real no Princípio 4).

Corolário honesto: **a C1 pode ficar muito rica e ainda assim um texto "verde" pode ser ruim.** O
produto tem que continuar dizendo isso. Mais detectores aumentam a *sensibilidade*, nunca
transformam ausência-de-falha em prova-de-qualidade.

---

## 7. Recorte PT-BR (o que dos style guides EN transfere)

Aviso metodológico para não importar ruído: boa parte das regras de style guides anglófonos **não
mapeia** para o português.

- **Não transfere:** split infinitives, "-ing" progressivo, apóstrofo/possessivo saxão, "which vs
  that", contrações (don't/do not), maiúscula de título estilo inglês. Detectá-las em PT é ruído.
- **Transfere com adaptação:** voz passiva (existe, mas a morfologia é ser/estar+particípio, não
  "be"+PP), nominalização (sufixos diferentes), advérbios (–mente, não –ly), sentença longa,
  palavra rara, jargão.
- **Só existe em PT (alto valor, ignorado pelos guias EN):** mesóclise, gerundismo, futuro do
  subjuntivo raro, próclise/ênclise, o inteiro **juridiquês/burocratês** brasileiro, o Acordo
  Ortográfico. É aqui que o Lucid tem espaço próprio — nenhuma ferramenta anglófona cobre.

**Implicação de arquitetura:** os léxicos e regras são **inerentemente PT-BR e curados**, não
portáveis. Isso reforça a disciplina de dados versionados + ADR por lote (já praticada no glossário
de jargão e nas tabelas de conjugação).

---

## 8. A decisão arquitetural central: uma camada de anotação determinística

Relendo o catálogo, um padrão salta: **os detectores 🟡 de maior valor sintático precisam saber
coisas que o `Document` atual não carrega** — se um token é verbo, particípio, substantivo, se tem
gênero/número, qual seu lema. Hoje cada pass reimplementa isso ad hoc (o `passive-voice` detecta
particípio por conta própria; o `nominalization` tem sua tabela). Isso não escala: o quinto pass
que precisa de "onde está o verbo" vai recopiar a lógica do primeiro.

**A bifurcação:**

- **Opção A — status quo:** cada pass carrega sua própria mini-morfologia por regex/léxico. Barato
  por pass, teto baixo (detectores que precisam de sintaxe ficam frágeis), duplicação crescente.
- **Opção B — camada de anotação compartilhada:** um módulo determinístico, **guiado por léxico
  finito e curado** (linhagem DELAF-PB/Unitex-PB), que anota cada token com `{lemma, pos, morph}`
  de forma reproduzível, e um *chunker* raso (autômato) que marca sintagmas nominais/verbais. Os
  passes **consomem** essa anotação em vez de recalcular.

**Recomendação: Opção B, mas fiel ao ADR-001** — a anotação vem de **léxico + regras finitas**, não
de um tagger estatístico treinado. Um POS tagger neural/estatístico *pode* ser determinístico
(argmax, modelo fixo), mas é dependência pesada e **não-auditável** — contra a identidade do
produto. Um dicionário morfológico finito é auditável célula a célula, versionável, e mantém a
saída byte-idêntica. É a mesma filosofia das tabelas de conjugação fechadas do ADR-011, generalizada.

Trade-off honesto: a Opção B tem custo de dados alto (montar/curar o dicionário morfológico) e
ambiguidade morfológica ("casa" = verbo ou substantivo?) que, sem desambiguação, gera múltiplas
tags → o pass tem que lidar com anotação ambígua (ou aplicar regras de desambiguação também
finitas). Mas **desbloqueia uma categoria inteira** (sujeito longo, distância sujeito-verbo,
concordância, aposição, pronome ambíguo) que a Opção A nunca alcança com precisão.

Essa é a decisão que este design doc quer forçar. Ela pode ser **incremental**: a anotação começa
mínima (só o que o próximo lote de passes exige) e cresce por ADR.

---

## 9. Arquitetura extensível proposta

Meta declarada: **adicionar um detector = escrever um `Pass` novo + fornecer seus dados + seus
testes. Zero alteração no núcleo.** Isso só é verdade se o núcleo oferecer, de antemão, um modelo
de documento rico o bastante e um contrato de pass uniforme. As mudanças abaixo são o que torna
essa promessa real. Todas preservam determinismo/cerca.

### 9.1 Modelo de documento enriquecido (`AnnotatedDocument`)

Evoluir `Document` de `{source, sentences, tokens}` para camadas empilhadas, cada uma opcional e
construída uma única vez em `buildDocument`:

```
AnnotatedDocument
├── source            // texto normalizado (NFC) — âncora de todos os offsets (já existe)
├── blocks            // NOVO: árvore estrutural (parágrafos, títulos+nível, listas+itens,
│                     //       tabelas) via parser de blocos leve (desbloqueia a categoria B)
├── sentences[]       // já existe; passa a referenciar o bloco que a contém
├── tokens[]          // já existe
└── annotations?      // NOVO (Opção B, §8): por token → {lemma, pos, morph}; e chunks NP/VP.
                      //   Opcional: passes que não precisam simplesmente ignoram.
```

Princípios: **imutável e congelado** (já é), **construído uma vez** (já é), **cada camada é
determinística e independente** — um pass declara de quais camadas depende e recebe só um
`AnnotatedDocument` congelado. Camadas caras (annotations) são *lazy*/opt-in por configuração para
não pagar custo quando nenhum pass ativo as usa.

### 9.2 Contrato de pass uniforme + taxonomia por escopo

Manter **uma única interface** `Pass` (o registry continua um array plano — essa é a chave da
extensibilidade), mas reconhecer que passes têm **escopos** diferentes. O escopo é só uma
convenção de *como* o `run` percorre o doc, não um tipo novo:

| Escopo | Percorre | Exemplos |
|---|---|---|
| token | `doc.tokens` | `latinism`, `long_word`, `adverb_mente` |
| span/frase | `doc.sentences` | `long_sentence`, `passive`, `multiple_negation` |
| parágrafo | `doc.blocks` (parágrafos) | `paragraph_length` |
| documento/estrutural | `doc.blocks` (árvore) | `heading_hierarchy`, `numbering_consistency` |
| referência cruzada | doc inteiro, resolve alvos | `cross_reference_integrity` |
| consistência (two-pass) | coleta → compara | `term_spelling_variant`, `casing_inconsistency` |

Todos implementam `run(ctx): Finding[]`. Passes de consistência fazem o *collect→reduce* **dentro**
do próprio `run` (têm `doc` inteiro no contexto) — não precisam de barrier no orquestrador. Isso
mantém o `analyzeWithPasses` atual praticamente intacto: ele continua um `flatMap` sobre passes.

### 9.3 Metric passes (formalizar o que hoje é à parte)

Hoje `Metrics` é computado por `runMetrics`, fora do pipeline. Propõe-se um segundo registry
paralelo, `METRIC_PASSES`, com interface irmã `MetricPass.run(ctx): Metric[]`, rodado pelo mesmo
orquestrador. Ganho: adicionar uma métrica (Gulpease, TTR, variância) vira "novo metric pass",
mesma ergonomia dos detectores, e o `analyze` agrega ambos. Métricas continuam **fora** do conceito
de finding e **nunca** viram aprovação.

### 9.4 Registry de dados (ativar o `PassContext.data` que já existe)

O slot `data: LoadedData` já está no contexto, mas chega vazio. Propõe-se:
- Cada pass declara `dataDeps: readonly string[]` (ex.: `["nominalizacoes.pt", "frequencia.pt"]`).
- Um **data registry** central carrega cada dataset **uma vez**, versionado, e injeta em `ctx.data`.
- O **hash dos datasets entra no `configHash`** → snapshot quebra se um léxico mudar sem ADR
  (governança automática, alinhada à disciplina "todo dado tem ADR + entrada no golden").

Isso tira o carregamento de dados de dentro de cada pass (hoje acoplado), centraliza a curadoria, e
torna a proveniência de dados auditável — sem violar a cerca (dados são arquivos locais, zero rede).

### 9.5 Configuração por pass (mentalidade ESLint)

Generalizar `Config` para um mapa `rules: { [criterion]: { enabled, severity, options } }`, com
defaults por pass. Habilitar/desabilitar e ajustar limiares por regra, como um linter. O
`configHash` já cobre isso para o determinismo do snapshot.

### 9.6 Contrato de determinismo (o que todo pass novo deve honrar)

Checklist que vira teste de fronteira, não convenção informal:
1. **Puro e síncrono.** Sem `Date`, sem `Math.random`, sem rede, sem I/O (a cerca I1 já proíbe).
2. **Ordenação por code unit** (`<`/`>`), nunca `localeCompare` — já é a regra do `sortFindings`.
3. **Offsets sempre sobre `source` normalizado.**
4. **Precisão > recall.** Na dúvida, `severity: info` + `requiresHuman: true`; nunca uma sugestão
   insegura. A métrica dura de eval continua **0 sugestões inseguras**.
5. **`requiresHuman` para tudo que precise de julgamento** (agente omitido, sentido múltiplo,
   relevância). O pass marca; não resolve.
6. **Snapshot byte-idêntico** + entrada no golden justificada individualmente (não "decorar o
   golden").
7. **Sugestão mecânica só quando o mapeamento é único e seguro.**

### 9.7 O que muda no núcleo (uma vez) vs. o que nunca mais muda

- **Muda uma vez (investimento):** `AnnotatedDocument` (blocks + annotations), data registry,
  metric-pass registry, config por regra. Depois disso, estabiliza.
- **Nunca mais muda (a promessa):** o orquestrador `analyzeWithPasses`, a ordenação canônica, o
  tipo `Finding`, a cerca. Adicionar o detector nº 30 é: escrever o pass, registrar no array,
  declarar `dataDeps`, adicionar dados+golden+snapshot. Ponto.

Ou seja: a extensibilidade que o pedido quer **não é grátis hoje** — ela exige pagar
adiantado o modelo de documento e o data registry. Pago isso, a promessa "novo detector = novo
pass" se sustenta.

---

## 10. Matriz de priorização (para os ADRs futuros)

Ordenando por **valor / (risco × esforço)**, sem compromisso de execução:

**Vitórias rápidas (🟢, FP baixo, alto impacto no público-alvo) — fazer primeiro:**
`latinism_archaism`, `bureaucratic_formula`, `redundant_doublet`, `pleonasm`, `wordy_phrase`,
`heavy_connective`, `anaphoric_legalese`, `gerundism`, `mesoclisis`, `multiple_negation`. Todos
por léxico/regra fechada, sem depender da camada de anotação. **Maior retorno imediato.**

**Estruturais de baixo risco (🟢) — exercitam a categoria B:** `paragraph_length`,
`heading_hierarchy_skip`, `numbering_consistency`, `whitespace_punctuation`,
`date_format_consistency`. Exigem o parser de blocos (§9.1) como pré-requisito.

**Alto valor, exigem a camada de anotação (§8) — decidir a Opção B antes:**
`long_preverbal_subject`, `subject_verb_distance`, `subordination_depth`, `ambiguous_pronoun`.

**Alto FP / contextuais — só como sinal + `requiresHuman`:** `second_person_absent`,
`rare_word`, `unadapted_loanword`, `table_opportunity`, `polysemy_flag`.

**Provavelmente fora de escopo:** `spelling_error` (reimplementa corretor), `agreement_error`
(empreitada de grammar checker), `nilc_metrix_bundle` (port grande — reusar só se/quando valer).

**Fora da C1 por definição (🔴):** relevância (P1), usabilidade (P4), correferência, topicalidade,
"título responde à pergunta", variação elegante conceitual.

---

## 11. Riscos e questões em aberto

1. **Opção A vs B (§8)** — a decisão de fundo. Sem a camada de anotação, o teto sintático fica
   baixo; com ela, paga-se curadoria de dicionário morfológico. **Decisão de ADR própria.**
2. **Reintroduzir `rare_word`/frequência** (revisitar ADR-008) — precisa de lista de frequência
   versionada; FP médio porque frequência ≠ dificuldade de leitura.
3. **Entrada estruturada** — a categoria B pressupõe marcação (títulos/listas). Definir o formato
   de entrada aceito (texto cru? Markdown? HTML?) e o parser de blocos.
4. **Explosão de léxicos** — cada detector 🟢 de domínio é um dataset a curar e manter. Governança
   (ADR + golden por lote) precisa escalar; o data registry (§9.4) é o mecanismo.
5. **Sobreposição de findings** — `run_on`, `subordination_depth` e `long_sentence` podem apontar o
   mesmo trecho por princípios diferentes. Definir política de deduplicação/coexistência (hoje a
   ordenação canônica acomoda, mas a UI precisa de regra de agrupamento).
6. **Calibração de severidade** — sem um golden grande por detector, os limiares são arbitrários.
   Cada pass novo deveria vir com seu golden rotulado (disciplina já existente).

---

## 12. Próximos ADRs sugeridos (quando for implementar)

- **ADR — Modelo `AnnotatedDocument`:** blocks + parser de blocos; formato de entrada.
- **ADR — Camada de anotação morfológica determinística** (a decisão Opção B): dicionário finito,
  desambiguação por regras, versionamento.
- **ADR — Data registry + `dataDeps` + hash no `configHash`.**
- **ADR — Metric-pass registry** (formalizar métricas como passes).
- **ADR — Config por regra** (severidade/enable/options por critério).
- **ADR — Lote 1 de detectores "juridiquês"** (léxico fechado; as vitórias rápidas da §10).

---

### Apêndice — resumo da classificação

- **🟢 Determinístico total (≈ metade do catálogo):** estrutura, mecânica, léxico fechado curado,
  consistência, métricas. FP baixo/nulo. É o chão sólido.
- **🟡 Determinístico com heurística:** padrões sintáticos e de coesão que aproximam um fenômeno
  linguístico; reproduzíveis mas aproximados; muitos precisam da camada de anotação (§8). É onde
  está o valor incremental — e o risco a gerenciar com `requiresHuman`/severidade.
- **🔴 Semântico (fora da C1):** relevância, usabilidade, correferência, topicalidade, preservação
  de sentido. A parede. Vira trabalho de autor (`requiresHuman`) ou piso da Camada 2 — nunca um
  check verde.

O teto determinístico é alto e largamente inexplorado — sobretudo no português jurídico/
burocrático, onde nenhuma ferramenta anglófona chega. Mas ele tem um formato fixo: **a Camada 1
mede a demanda estrutural do texto; ela nunca certifica que o leitor entendeu.** Toda a arquitetura
acima existe para subir esse teto sem nunca fingir que ele é o céu.
