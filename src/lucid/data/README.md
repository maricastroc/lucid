# Dados versionados de `src/lucid/data`

Cada dataset aqui é consumido pela Camada 1 (`core`) como dado estático, carregado sem
rede e sem I/O assíncrono. Este README documenta proveniência e critério de curadoria
por arquivo — obrigatório por `docs/ARQUITETURA.md` §2 e §11.1 ("`principio` nunca é
inventado"; aqui, análogo: nenhum dado entra sem origem registrada).

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
`docs/DECISOES.md`, ADR-006); `Config.passiveVoice.treatEstarAsPassive` existe mas
ainda não é consultado por nenhum código.

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

**`feature` (ADR-011):** cada forma carrega o traço morfológico (`inf`, `pres.3s/3p`,
`pret.3s/3p`, `fut.3s/3p`, `impf.3s/3p`, `cond.3s/3p`, `subj.3s/3p`, `ger`). É a chave que
casa com a tabela `conjugations` de `nominalizacoes.pt.json` para reescrever a
nominalização quando o verbo leve é finito — preservando tempo/pessoa/número, sem
conjugador produtivo.

**Fora de escopo deliberado:** `dar`/`ter` como verbos-suporte de nominalização
("dar continuidade a") — regência e ambiguidade lexical próprias, não demonstradas
como seguras nesta etapa (ver `docs/DECISOES.md`, ADR-007). Regências alternativas de
`proceder` (`proceder com`) — só o padrão `à/ao/às/aos` foi implementado.

**Formato:** `{ "forms": LightVerbForm[] }` (cada forma com `feature`), comparação em
caixa invariante.

**Licença:** fatos de flexão verbal, curadoria própria.

## `nominalizacoes.pt.json`

**Usado por:** `src/lucid/core/passes/nominalization.ts`.

**Propósito:** mapeia nominalização → verbo-base + regência, para decidir se uma
construção `verbo-leve + determinante + nominalização` corresponde a um verbo único e
seguro para sugestão mecânica.

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

**Tabela `conjugations` (ADR-011) — reescrita de forma FINITA sem conjugador.** Bloco
`conjugations`: verbo-base → traço morfológico → forma finita, **cada forma verificada à
mão** (11 verbos-base seguros × 8 traços indicativos comuns). Quando o verbo leve é finito
("fez a análise"), o matcher escolhe a forma da sugestão por `conjugations[verbo][feature]`
("analisou"), preservando tempo/pessoa/número. Não é morfologia produtiva: um par
não cadastrado não gera sugestão. Só presente/pretérito/futuro/imperfeito do indicativo
(3ª pessoa sing/plural) estão cobertos; **condicional, subjuntivo e gerúndio ficam de
fora** (seguem `requiresHuman`). `revisar` não aparece na tabela (`safeForSuggestion:false`).

**Formato:** `{ "entries": NominalizationEntry[], "conjugations": Record<verbo, Record<feature, forma>> }`,
comparação em caixa invariante.

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
