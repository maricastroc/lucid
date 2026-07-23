# Dados versionados de `src/lucid/data`

Cada dataset aqui é consumido pela Camada 1 (`core`) como dado estático, carregado sem
rede e sem I/O assíncrono. Este README documenta proveniência e critério de curadoria
por arquivo — obrigatório por `docs/ARQUITETURA.md` §2 e §11.1 ("`principio` nunca é
inventado"; aqui, análogo: nenhum dado entra sem origem registrada).

## Data registry e `dataHash` (ADR-022)

Além do consumo direto, cada dataset é registrado em `core/data/registry.ts` com um
`fingerprint` estável do conteúdo. O `analyze` estampa um `meta.dataHash` derivado dos
datasets em jogo (dados de estágio de documento + `dataDeps` dos passes), de modo que a
reprodutibilidade de um `Diagnostic` seja `(lucidVersion, configHash, dataHash)`. **Mexer
em qualquer JSON aqui muda o `fingerprint` → muda o `dataHash` → quebra o snapshot de
propósito** (governança automática, ver `docs/DESIGN-data-registry.md`). Adicionar um
dataset novo = novo id em `DatasetId` + entrada no registry + este README + golden.

## `abreviacoes.pt.json`

**Usado por:** `src/lucid/core/document/segment-sentences.ts` (etapa de segmentação de
frases — Fase 1).

**Propósito:** lista fechada de abreviações PT-BR que, seguidas de `.`, **não** marcam
fim de frase (ex.: `"Sr. Silva chegou"` não quebra depois de `Sr.`).

**Critério de curadoria:**
- Formas de tratamento (`Sr., Sra., Dr., Dra., Prof., Exmo.…`).
- Abreviações jurídico-administrativas comuns em textos de linguagem simples do setor
  público (`art., inc., cf., p.ex.` — domínio citado em `CLAUDE.md` como público-alvo da
  Lei 15.263/2025) — escolhidas por serem as mais citadas nos guias de referência do
  `CLAUDE.md` (LAB.mg, gov.br/Roedel, TCE-PE) como jargão típico de texto oficial.
- Abreviações de logradouro (`Av., Al., R.`), de unidades de medida (`kg, km, cm, mm, m,
  h, min`) e de meses (`jan.…dez.`) — classes fechadas, baixo risco de ambiguidade.
- Abreviações bibliográficas/editoriais (`pág., vol., cap., ed., org., trad., coord.`) —
  incluídas por serem comuns em textos normativos citando fontes.

**Fora de escopo deliberado (Fase 1):** abreviações regionais raras, siglas de
instituições específicas (essas são tratadas pela regra genérica de sigla — sequência de
maiúsculas isoladas por ponto — não pelo léxico), e gírias. Adicionar exige avaliação de
impacto no golden set (`docs/ARQUITETURA.md` §8) antes de entrar.

**Formato:** `{ "abbreviations": string[] }`. Cada entrada é a forma **sem** o ponto final,
em minúsculas (comparação em caixa invariante — `toLowerCase()`, nunca
`toLocaleLowerCase()`, por I4). Entradas com ponto interno (`p.ex`) representam
abreviações compostas e são comparadas contra o texto que precede o último `.` do
grupo.

**Licença:** lista de curadoria própria (fatos de língua, não copiáveis de terceiros);
sem dependência de fonte externa com licença restritiva.

## `verbos-ser.pt.json`

**Usado por:** `src/lucid/core/passes/passive-voice.ts` (pass de voz passiva — Fase 1).

**Propósito:** âncora do matcher — o pass só considera candidato a voz passiva o que
vem logo depois de uma destas formas. Lista fechada, não um conjugador.

**Critério de curadoria:** paradigma completo de `ser` (indicativo, subjuntivo,
infinitivo pessoal/impessoal, gerúndio, particípio, imperativo). Deliberadamente
**não** inclui formas de `estar`/`ficar` — fora de escopo nesta etapa (ver
`docs/DECISOES.md`, ADR-006/ADR-052). O placeholder `Config.passiveVoice.treatEstarAsPassive`
foi removido (ADR-052): `estar`/`ficar` + particípio é predominantemente resultativo/adjetival,
não passiva de ação, e um flag que os tratasse igual a `ser` teria alto risco de falso positivo.

**Fora de escopo deliberado:** `estar`/`ficar` (Fase 2, se algum dia — exige separar
leitura resultativa de leitura passiva genuína, uma heurística própria).

**Formato:** `{ "forms": string[] }`, comparação em caixa invariante.

**Licença:** fatos de flexão verbal, curadoria própria.

## `participios-irregulares.pt.json`

**Usado por:** `src/lucid/core/passes/passive-voice.ts`.

**Propósito:** reconhece particípios que não seguem o sufixo regular `-ado/-ido` — ou
cujo radical é curto demais para o padrão regular do matcher (`dado`, de "dar").

**Critério de curadoria:** ~20 verbos de alta frequência em texto administrativo/
jurídico (domínio-alvo do `CLAUDE.md`), formas flexionadas por gênero/número. Curado e
extensível — **não** é uma lista morfologicamente completa da língua. Adicionar uma
entrada exige confirmar que ela não colide com um substantivo/adjetivo lexicalizado
mais comum (nesse caso pertence a um dos dois léxicos de exclusão abaixo).

**Fora de escopo deliberado:** verbos irregulares raros ou regionais; formas com baixa
probabilidade de aparecer em texto administrativo/jurídico.

**Formato:** `{ "forms": string[] }`, comparação em caixa invariante.

**Licença:** fatos de flexão verbal, curadoria própria.

## `participios-ambiguos.pt.json`

**Usado por:** `src/lucid/core/passes/passive-voice.ts` — para **suprimir** o finding,
nunca para emitir.

**Propósito:** particípios genuínos (têm verbo de origem real) que, na posição "ser +
particípio", leem-se quase sempre como adjetivo predicativo de estado psicológico ou
relacional ("ela é dedicada", "ele é casado", "ele está envolvido no caso") — não como
voz passiva de uma ação praticada por um agente.

**Critério de curadoria:** julgamento linguístico de que a leitura adjetival domina
esmagadoramente sobre a leitura de ação passiva. Curado e extensível — cada entrada
nova (ver `docs/DECISOES.md`, ADR-006, para o exemplo de `envolvido`) precisa da mesma
justificativa: pertencer à mesma classe semântica das entradas já presentes
(psicológico/relacional), não ser um ajuste pontual para um único exemplo.

**Fora de escopo deliberado:** particípios dual-use onde a leitura passiva é tão
plausível quanto a adjetival dependendo de contexto (ex.: "surpreendido") — entram na
lista só quando o desequilíbrio a favor do adjetivo é claro.

**Formato:** `{ "forms": string[] }`, comparação em caixa invariante.

**Licença:** julgamento linguístico próprio, curadoria própria.

## `verbos-leves.pt.json`

**Usado por:** `src/lucid/core/passes/nominalization.ts` (pass de nominalização —
Fase 1).

**Propósito:** ancora o matcher da construção `[verbo leve] + [determinante] +
[nominalização]`. Cada entrada associa a forma superficial ao lema e marca se é a
forma infinitiva — a trava que decide se uma sugestão mecânica pode ser gerada
(nunca se reconjuga o verbo-base para uma forma finita).

**Critério de curadoria:** os 5 verbos-suporte demonstrados como seguros no pedido de
implementação (`fazer, realizar, efetuar, promover, proceder`), com cobertura de
infinitivo, presente do indicativo (3ª pessoa), pretérito perfeito, futuro do
presente, pretérito imperfeito, futuro do pretérito, presente do subjuntivo e
gerúndio — 14 formas por verbo. Deliberadamente **não** cobre 1ª/2ª pessoa,
imperativo nem pretérito mais-que-perfeito simples.

**Histórico (`feature`/`infinitive`, ADR-011 → ADR-054):** cada forma já carregou o traço
morfológico que casava com a tabela `conjugations` de `nominalizacoes.pt.json` para compor a
sugestão finita. Os dois campos foram **removidos** com o compositor (ADR-054): a detecção só
precisa de `form`, `lemma` e `pattern`.

**Fora de escopo deliberado:** `dar`/`ter` como verbos-suporte de nominalização
("dar continuidade a") — regência e ambiguidade lexical próprias, não demonstradas
como seguras nesta etapa (ver `docs/DECISOES.md`, ADR-007). Regências alternativas de
`proceder` (`proceder com`) — só o padrão `à/ao/às/aos` foi implementado.

**Formato:** `{ "forms": [{ "form", "lemma", "pattern" }] }`, comparação em caixa
invariante.

**Licença:** fatos de flexão verbal, curadoria própria.

## `nominalizacoes.pt.json`

**Usado por:** `src/locales/pt-BR/passes/nominalization.ts`.

**Propósito:** mapeia nominalização → verbo-base, para o pass detectar a construção
`verbo-leve + determinante + nominalização`, **classificar** o mapeamento
(`safeForSuggestion` ⇒ `requiresHuman = false`: único e defensável) e **informar** o
verbo-base curado. Desde o ADR-054 nada aqui alimenta composição de texto — a engine
não sugere a troca, só a classifica e nomeia.

**Critério de curadoria:** só nominalizações com mapeamento verbo único e defensável,
relevantes ao domínio administrativo (`CLAUDE.md`). Formas singular e plural são
listadas explicitamente — sem regra de pluralização/singularização no matcher, porque
"-ção" → "-ções" não é uma simples remoção de "s", e o projeto não introduz
morfologia produtiva nem para desfazer flexão.

**Fora de escopo deliberado:** `formação`, `administração`, `operação`, `edição`,
`condução` — nenhuma tem mapeamento verbo único defensável (lexicalizaram para
sentido institucional/concreto) e nenhuma aparece nos exemplos-alvo desta etapa;
completamente omitidas, não incluídas com `safeForSuggestion:false`. `revisão` é a
exceção: cadastrada (aparece nos exemplos de detecção do pedido) mas com
`safeForSuggestion:false` (mapeamento genuinamente não-único — "revisar" ou "rever").

**Histórico (ADR-011 → ADR-054):** este dataset já carregou uma tabela `conjugations`
(verbo-base → traço → forma finita, verificada à mão) para compor sugestões finitas
("fez a análise" → "analisou"). A tabela foi **removida** junto com o compositor: compor
a troca é escrever, e a engine não escreve. Também saíram os campos
`sourcePreposition`/`targetPreposition`, que só o compositor consumia.

**Formato:** `{ "entries": [{ "noun", "verb", "safeForSuggestion" }] }`, comparação em
caixa invariante.

**Licença:** julgamento linguístico próprio, curadoria própria.

## `jargao.pt.json`

**Usado por:** `src/lucid/core/passes/jargon.ts` (pass de jargão — Fase 1, ver
`docs/DECISOES.md`, ADR-008).

**Propósito:** mapeia termo/expressão de linguagem administrativa e jurídica ao
equivalente em linguagem simples, quando existe um equivalente único e defensável.
É a **autoridade exclusiva de runtime** para este critério — nenhuma lista de
frequência participa da decisão de emitir finding (ver ADR-008).

**Critério de curadoria:** cada entrada passou por 4 perguntas antes de entrar — (1) é
realmente pouco familiar para o leitor-alvo; (2) tem sentido estável no domínio
administrativo/jurídico; (3) o equivalente preserva o significado; (4) a substituição
local não quebra a gramática da frase. Unigramas fortemente polissêmicos (mais de um
sentido comum, sem contexto que desambigue) são **excluídos por princípio** — nunca
cadastrados como unigrama isolado, mesmo com `safeForSuggestion:false`. Expressões
multipalavra são preferidas exatamente porque a própria expressão desambigua o sentido
("em sede de" não compete com o sentido comum de "sede"), o que abre espaço para
cadastrar termos que, isolados, seriam ambíguos demais.

**Formas flexionadas são listadas explicitamente**, sem regra de flexão produtiva no
matcher — mesma disciplina de `verbos-leves.pt.json`/`nominalizacoes.pt.json`.
`fazer jus a` tem 11 formas cadastradas (infinitivo + 3ª pessoa singular/plural em
presente/pretérito perfeito/futuro/imperfeito + 1ª pessoa singular presente/pretérito),
recorte de frequência de uso em texto administrativo — não é conjugação completa do
verbo "fazer".

**`safeForSuggestion:false` não significa "não cadastrar".** Diferente da guarda de
unigrama polissêmico (que impede o cadastro), aqui a expressão já está desambiguada por
ser multipalavra — o bloqueio é sobre a TROCA, não sobre a detecção: `na hipótese de` e
`de acordo com o disposto` são detectadas normalmente, mas a substituição depende do que
vem depois na frase (sintagma nominal vs. oração com "que", ou regência da preposição
seguinte) — risco de regência quebrada, não de sentido incerto. `plain` continua
preenchido nesses casos para alimentar a `justification`, nunca a `suggestion`.

**Lote 2 (ADR-010) — expansão curada para subir a taxa de auto-fix no domínio.** 13
entradas novas, todas `safeForSuggestion:true` (troca 1:1 invariante), em três famílias:
(a) conectores/advérbios formais invariantes e monossêmicos (`destarte`→"assim",
`conquanto`→"embora", `porquanto`→"porque", `mormente`→"principalmente"); (b) MWEs fixas
desambiguadas pela própria expressão (`tão logo`→"assim que", `via de regra`→"em geral",
`por derradeiro`→"por fim", `de per si`→"por si só"); (c) família `com fulcro …`→`com
base …`, cadastrando as contrações (`em/no/na/nos/nas`) explicitamente porque elas fazem
parte do span casado e são preservadas 1:1 na troca. Nenhuma exige reconjugação nem muda
regência. Candidatos `context_dependent` (`nos termos de`, `à luz de`, `em que pese`)
foram deliberadamente adiados: o equivalente muda regência/estrutura, então entrariam só
como detecção-sem-sugestão — sem ganho de auto-fix.

**Fora de escopo deliberado (ver ADR-008 para o raciocínio completo):**
- `consoante` — substantivo comum (letra do alfabeto) tão frequente quanto o uso
  conjuntivo formal; nenhum contexto sintático barato o bastante para desambiguar sem
  parser. Omitida, não cadastrada com `safeForSuggestion:false`.
- Frequência lexical (`frequencia.pt.json`, previsto em `docs/ARQUITETURA.md` §2) —
  vira ferramenta de curadoria offline (achar candidatos para humano avaliar antes de
  entrar aqui), nunca dispara finding em runtime.
- Siglas, nomes próprios, NER, aprendizado por corpus, embeddings, LLM — fora do MVP
  deste critério inteiro.
- "Termo definido localmente" (`"X (doravante 'Y')"`) — generalizar essa detecção com
  segurança exigiria mais do que casamento local de tokens; deixada fora do matcher
  inicial e registrada como limitação (ADR-008), não improvisada.

**Formato:** `{ "entries": JargonEntry[] }` — `term` (minúsculo, palavras separadas por
um único espaço para `kind:"phrase"`), `kind` (`"word" | "phrase"`), `domain`
(`"administrative" | "legal" | "general"`, metadado descritivo), `plain` (string ou
`null`), `safeForSuggestion` (boolean), `reason`
(`"polysemous" | "context_dependent" | "institutional" | null`). Comparação em caixa
invariante.

**Licença:** julgamento linguístico próprio, curadoria própria.

## `participios-falsos-nominais.pt.json`

**Usado por:** `src/lucid/core/passes/passive-voice.ts` — para **suprimir** o finding,
nunca para emitir.

**Propósito:** palavras com sufixo `-ado/-ido` (formato de particípio regular) que, na
prática, são substantivos lexicalizados — funcionam como palavra independente,
frequentemente com plural nominal próprio ("foi resultado de", "foi pedido dela").

**Critério de curadoria:** mesma lógica de `participios-ambiguos.pt.json`, mas para a
leitura nominal em vez de adjetival. Curado e extensível.

**Fora de escopo deliberado:** substantivos deverbais raros; casos em que o artigo já
precede a palavra (`"foi o resultado"`) — esses já são barrados pelo próprio matcher
(artigo não é conector reconhecido entre `ser` e o candidato), sem precisar do léxico.

**Formato:** `{ "forms": string[] }`, comparação em caixa invariante.

**Licença:** julgamento linguístico próprio, curadoria própria.

## `mais-que-perfeito.pt.json` e `adverbios-mente.pt.json` — DERIVADOS de PortiLexicon-UD

**Usados por:** `passes/mais-que-perfeito.ts` (`mais_que_perfeito_sintetico`, 5.3.3) e
`passes/adverbio-mente-denso.ts` (`adverbio_mente_denso`, 5.3.4). Primeiros datasets derivados
de um léxico externo reusado (fatia vertical da Camada 1; ver ADR-024 e docs/DESIGN-d1-*).

**Fonte:** **PortiLexicon-UD** (Lopes, Duran, Fernandes, Pardo — ICMC-USP/NILC), TSV por classe
`forma ⇥ lema ⇥ FEATS` (Universal Dependencies), em
huggingface.co/spaces/NILC-ICMC-USP/PortiLexicon-UD.

**Derivação (determinística, build-time):**
- `mais-que-perfeito.pt.json`: de `VERB.tsv`, formas com `Tense=Pqp`, **menos** toda forma que
  também apareça com qualquer outra leitura em qualquer classe (`VERB` não-Pqp, `NOUN`, `ADJ`,
  `ADV`, …). Essa poda em build-time é o que garante precisão sem camada de anotação em runtime:
  `fora` (advérbio), `vira` (verbo virar), `foram` (pretérito) são removidos; irregulares opacos
  (`fizera`, `dissera`, `coubera`, `requerera`) permanecem. 57.384 formas.
- `adverbios-mente.pt.json`: de `ADV.tsv`, formas terminadas em `mente` (allowlist para não
  marcar `semente`/`mente`). 2.403 formas.

**Formato:** `{ "forms": string[] }`, membership em caixa invariante. Não são conjugadores.

**Licença / atribuição (OBRIGATÓRIA):** PortiLexicon-UD é distribuído sob **CC-BY 4.0**. Estes
arquivos são obras derivadas e devem creditar a fonte:

> Contém dados derivados de **PortiLexicon-UD** (Lucelene Lopes, Magali Duran, Paulo Fernandes,
> Thiago Pardo), licenciado sob Creative Commons Attribution 4.0 International (CC-BY 4.0).
> https://portilexicon.icmc.usp.br/ · https://aclanthology.org/2022.lrec-1.715/

## `redundancias.pt.json` e `perifrases.pt.json` — lote juridiquês

**Usados por:** `passes/redundancia.ts` (`redundancia`, 5.3.4) e `passes/perifrase-inflada.ts`
(`perifrase_inflada`, 5.3.4). Casamento de frase contígua via matcher compartilhado
(`passes/phrase-match.ts`), longest-match-first, sem sobreposição — mesma disciplina do jargão.

**Propósito:**
- `redundancias.pt.json`: pleonasmos e duplas em que um termo repete o sentido do outro sem
  acrescentar informação ("nula e sem efeito", "planejar antecipadamente", "certeza absoluta").
- `perifrases.pt.json`: locuções que ocupam o lugar de uma preposição/conjunção simples
  ("no sentido de"→"para", "com relação a"→"sobre", "a fim de"→"para").

**Critério de curadoria:** frases feitas de alta frequência em texto burocrático/jurídico. O campo
`plain` é a forma enxuta **citada na justificativa** — a ferramenta NÃO aplica sozinha (cortar/trocar
depende do contexto → `requiresHuman`). **Deliberadamente sem colisão com o glossário de jargão:**
as locuções já cobertas por `jargao.pt.json` ("em sede de", "na hipótese de", "sem prejuízo de",
"de acordo com o disposto") e os arcaísmos já cobertos ("outrossim", "destarte", "conquanto",
"mormente", "porquanto") ficam FORA destes léxicos, para não haver dupla marcação.

**Formato:** `{ "entries": [{ "phrase": string, "plain": string | null }] }`, caixa invariante.

**Licença:** curadoria própria (fatos de língua), sem dependência de fonte externa.

## `duplas-negacoes.pt.json` — dupla negação (litotes)

**Usado por:** `passes/dupla-negacao.ts` (`dupla_negacao`, 5.3.3). Matcher de frase compartilhado
(`phrase-match.ts`), longest-match-first.

**Propósito:** expressões que afirmam negando o negativo ("não é incomum" = "é comum") — o leitor
tem de desfazer a negação aninhada (a operação `desfazer_negacao_aninhada` da sonda). `plain` = a
forma direta, citada na justificativa (a ferramenta não troca sozinha → `requiresHuman`).

**Fora de escopo deliberado:** negação simples e concordância negativa ("não vi ninguém") — normais
e claras em PT, **não** entram. Sem colisão com o glossário de jargão.

**Formato:** `{ "entries": [{ "phrase": string, "plain": string | null }] }`, caixa invariante.

**Licença:** curadoria própria (fatos de língua).

## `subordinadores.pt.json` — densidade de subordinação (ADR-035)

**Usado por:** `passes/subordinacao.ts` (`subordinacao_densa`, 5.3.4). Matcher de frase compartilhado
(`phrase-match.ts`, single + multipalavra), longest-match-first.

**Propósito:** membership para **contar** orações subordinadas por frase (conectivos subordinativos)
como proxy determinístico de "orações por frase", sem parser. **Não é troca:** `plain` é sempre
`null` — o léxico só conta.

**Critério de curadoria (PRECISÃO > recall):** entram (a) conjunções-função de baixa colisão com
substantivo (`embora`, `porque`, `enquanto`, `conquanto`, `porquanto`, `quando`) + relativos seguros
(`cujo/a/s`); (b) locuções auto-desambiguadas pela própria expressão (`uma vez que`, `para que`,
`à medida que`, `desde que`, `ainda que`…) — o mesmo argumento das MWEs do jargão. **Ficam DE FORA,
de propósito, os subordinadores polissêmicos** que exigiriam análise sintática para não gerar
falso-positivo: `que`/`se`/`como` (integrante vs. relativo vs. comparativo), `caso`/`segundo`
(também substantivo/ordinal), `conforme`/`onde` (também preposição/advérbio), `qual/quais/quem/quanto`.
Contar `que` cru inflaria a densidade em toda oração relativa. Consequência assumida: a contagem
**subestima** a subordinação real — piso honesto, nunca exagero.

**Formato:** `{ "entries": [{ "phrase": string, "plain": null }] }`, caixa invariante.

**Licença:** curadoria própria (fatos de língua).

## `substantivos-leitor.pt.json` — fala indireta ao leitor (ADR-036)

**Usado por:** `passes/leitor-terceira-pessoa.ts` (`leitor_terceira_pessoa`, 5.3.3). Matcher LOCAL por
tokens (como `passive-voice`), NÃO o de frase contígua.

**Propósito:** membership dos substantivos que **nomeiam o leitor** (interessado, requerente, cidadão,
usuário…). O pass marca quando um deles aparece como **sujeito** (precedido de artigo definido
`o/a/os/as` **ou** no início da frase) e recebe uma **obrigação** (verbo deôntico `deve/deverá/
poderá/precisa`, lista fechada inline no pass, numa janela local). O texto fala SOBRE o leitor em 3ª
pessoa em vez de falar COM ele.

**Precisão pela dupla exigência (sujeito + deôntico):** `o cidadão tem direitos` (sem obrigação) não
marca; `ao interessado` / `do interessado` (oblíquo, não-sujeito) não marca; `está interessado`
(leitura adjetival) não marca; conjunção entre o leitor e o verbo (`…venceu e deve…`) barra o match
(outra oração). Sinal FRACO por natureza (`info`): mudar a pessoa é escolha de estilo → **nunca**
reescreve (`requiresHuman`, sem `suggestion`).

**Formato:** `{ "forms": string[] }` (singular/plural/feminino explícitos), caixa invariante.

**Licença:** curadoria própria (fatos de língua + alinhamento aos guias gov.br/LAB.mg "fale com o leitor").

## `ser-tempos.pt.json` e `conjugacoes-ativas.pt.json` — REMOVIDOS (ADR-054)

Existiam exclusivamente para a conversão determinística voz passiva→ativa (ADR-032/033/034),
removida por completo: a engine não escreve. `participios-infinitivo.pt.json` sobrevive
(alimenta o andaime do ADR-013, direção de análise) e sua validação contra o
PortiLexicon-UD vive em `scripts/validate-participios.mjs`.

## `stopwords.pt.json` — filtro de palavras funcionais (ADR-044)

**Usado por:** `passes/heading-body-mismatch.ts` (`heading_body_mismatch`, **5.1** — o PRIMEIRO
critério a citar o Princípio 1/Relevante; todos os anteriores citam 5.2/5.3).

**Propósito:** membership para separar palavra de CONTEÚDO de palavra FUNCIONAL, na comparação
heurística título↔corpo. Nunca dispara finding sozinho — só filtra o que entra na comparação.

**Critério de curadoria:** classes fechadas de função do português (artigos, contrações
preposição+artigo, preposições, conjunções coordenativas/subordinativas, pronomes pessoais/
oblíquos/possessivos/demonstrativos/relativos, advérbios de baixo conteúdo semântico, e formas de
alta frequência de `ser`/`estar`/`ter`/`haver` como cópula/auxiliar). Fatos de língua — mesma
disciplina de `verbos-ser.pt.json`: fechado, curado, não é um stopword list genérico importado de
biblioteca de NLP.

**Fora de escopo deliberado:** verbos de conteúdo (mesmo frequentes) e substantivos — mantidos como
conteúdo de propósito, mesmo quando muito frequentes, porque o objetivo aqui não é "frequência
lexical" (essa é a `frequência PT-BR` prevista e não construída, ver ADR-008), é filtrar só a
função gramatical.

**Formato:** `{ "forms": string[] }`, comparação em caixa invariante. Entradas repetidas (ex.: "o"/
"a" servem de artigo E de pronome oblíquo) são inofensivas — o dado vira `Set`.

**Licença:** curadoria própria (fatos de língua), sem dependência de fonte externa.

## `substantivos-acao.pt.json` — nominalização encadeada (ADR-051)

**Usado por:** `passes/nominalizacao-encadeada.ts` (`nominalizacao_encadeada`, `5.3.3`).

**Propósito:** allowlist de substantivos deverbais cuja leitura dominante é ATO/PROCESSO
("nominalizações nuas": `realização`, `verificação`, `encaminhamento`…). Serve de CABEÇA
da cadeia `[cabeça] + de/da/do/das/dos (+ 1 palavra opcional) + [substantivo com sufixo
deverbal]` e de unidade da densidade por frase. É o complemento do par
`verbos-leves.pt.json`/`nominalizacoes.pt.json`: aquele detecta a nominalização COM
verbo-suporte (e pode sugerir); este detecta a nominalização SEM âncora de verbo leve
(e nunca sugere — `requiresHuman` sempre).

**Critério de curadoria (precisão > recall):** só entra palavra (a) transparentemente
deverbal e (b) cuja leitura dominante é ação — nunca entidade, artefato, lugar ou sentido
lexicalizado. Formas singular e plural listadas explicitamente (membership, caixa
invariante), mesma disciplina anti-morfologia-produtiva de `nominalizacoes.pt.json`.
Plural fica de fora quando lexicalizou sozinho: `prestações` (parcelas), `cumprimentos`
(saudação).

**Fora de escopo deliberado:** `informação`/`documentação` (dado/conjunto de documentos),
`organização`/`administração`/`coordenação`/`direção` (entidade), `procedimento`/
`documento`/`regulamento`/`requerimento` (artefato), `manutenção` (serviço),
`situação`/`condição`/`relação`/`atenção`/`exceção`/`opção`/`seção`/`função`
(lexicalizados), `decisão`/`ocorrência`/`providência`/`pendência` (artefato/estado),
`habilitação` (CNH), `classificação`/`seleção`/`promoção`/`liquidação`/`conferência`
(polissemia forte). O SUFIXO do elo (cauda) da cadeia não vem deste arquivo — é uma
lista fechada de terminações no próprio pass; este léxico só governa as cabeças.

**Formato:** `{ "forms": string[] }`, caixa invariante.

**Licença:** curadoria própria (fatos de língua), sem dependência de fonte externa.
