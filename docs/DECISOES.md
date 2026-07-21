# Lucid — Log de decisões (ADR curto)

> Registro das decisões técnicas fechadas durante a implementação. Cada ADR é curto:
> contexto, decisão, consequências. Ver `docs/ARQUITETURA.md` para o raciocínio completo
> por trás de cada uma — este arquivo é o registro formal, não a discussão.

---

## ADR-001 — Análise morfológica por regras + léxico, não POS tagger

**Status:** aceito · Fase 0

**Contexto.** Passiva e nominalização em PT-BR exigem alguma análise morfológica.
`CLAUDE.md` propõe duas opções: (a) regras + léxico de particípios/sufixos
(determinístico, zero-dep, teto de precisão menor) ou (b) um POS tagger leve embutido
(mais robusto, mais dependência, mais superfície de não-determinismo/opacidade).

**Decisão.** Opção (a) — regras + léxico — para o MVP inteiro (Fase 1 e Fase 2).

**Justificativa.**
- Mantém `src/lucid/core` 100% auditável linha a linha: qualquer finding é rastreável
  a uma regra explícita, não a pesos de um modelo.
- Zero dependência pesada, alinhado a I1 (sem framework/rede) e ao teto de
  determinismo do produto (I2) — um POS tagger não-trivial tende a carregar
  bibliotecas maiores ou modelos treinados, que são harder to audit e mais difíceis de
  manter 100% determinísticos entre versões.
- Passiva (`ser` + particípio) e a construção verbo-leve + nominalização são
  detectáveis com precisão aceitável via padrões morfossintáticos fechados + listas de
  particípios irregulares, verbos auxiliares e verbos leves — ver
  `docs/ARQUITETURA.md` §6.1–6.3.

**Consequências.**
- Recall menor que um POS tagger daria; alguns falsos negativos são esperados e
  aceitos (preferir precisão a recall — ver a regra transversal do §6).
- Falsos positivos residuais são mitigados por severidade calibrada e por
  `requiresHuman` generoso, nunca por adivinhação.
- Porta de saída registrada: se a eval (golden set + contra-exemplos) mostrar que a
  precisão do modo-regras trava abaixo do aceitável, um POS tagger leve vira candidato
  de Fase 2 — sem quebrar a API pública (`Pass` já isola a implementação de cada
  critério).

---

## ADR-002 — Vitest como test runner

**Status:** aceito · Fase 0

**Contexto.** O produto depende de disciplina de eval: snapshots byte-idênticos (I2),
testes de reconstrução de span (I3) e testes de fronteira arquitetural (I1). Era preciso
escolher um runner sem abrir mão de nenhuma dessas garantias.

**Decisão.** Vitest.

**Justificativa.**
- Snapshots nativos (`toMatchSnapshot`), suficientes para os testes de determinismo
  byte-a-byte que a Camada 1 exige.
- Roda TypeScript diretamente, sem etapa de build separada — os testes exercitam o
  mesmo código-fonte que a lib exporta.
- Config mínima (`vitest.config.ts`), sem framework de teste concorrente já presente no
  repo (o scaffold Next.js não trazia nenhum).

**Consequências.**
- Uma devDependency nova no projeto (`vitest`). Aceito: o projeto já depende de
  `eslint`/`typescript` como tooling de desenvolvimento; `vitest` é da mesma classe
  (não entra no bundle de produção, não é dependência do `core` em runtime).
- `test/boundary.test.ts` invoca o binário `dependency-cruiser` via `execFileSync` em
  vez de sua API programática, porque o pacote é ESM-only e o projeto roda em modo que
  não suporta `require()` de um grafo com top-level await; o binário evita esse atrito
  e é a mesma via que `npm run depcheck` usa.

---

## ADR-003 — Empacotamento: `src/lucid/**` dentro do app Next, sem monorepo

**Status:** aceito · Fase 0

**Contexto.** O repositório já existe como app Next.js 16 (scaffold `create-next-app`).
Era preciso decidir se a biblioteca nasce como package isolado (workspace/monorepo) ou
como árvore de módulos dentro do próprio app.

**Decisão.** `src/lucid/**` vive dentro do app Next, importado diretamente
(`@/lucid`, via o path alias já configurado em `tsconfig.json`). Sem monorepo no MVP.

**Justificativa.**
- Menos cerimônia: nenhum setup de workspace, nenhuma etapa de build/publish
  intermediária antes de a lib ser consumida pela UI.
- A fronteira que realmente importa (`core` ↛ `probe`, `core` ↛ `react`/`next`) já é
  garantida por `dependency-cruiser` + `boundary.test.ts` — um workspace separado
  adicionaria isolamento de *packaging*, não de *arquitetura*, e o projeto ainda não
  tem um segundo consumidor que justifique esse custo.
- A CLI (`cli/lucid.ts`, Fase 1) importa a mesma árvore `src/lucid/**` diretamente,
  sem precisar de um pacote publicado.

**Consequências.**
- Extrair `src/lucid` para um package próprio (workspace npm/pnpm ou pacote publicado)
  fica mais barato de fazer depois — os `import type`/`import` já usam caminhos
  relativos internos e um único ponto de entrada (`src/lucid/index.ts`) — do que
  desfazer um monorepo prematuro.
- Gatilho explícito para revisitar: aparecimento de um segundo consumidor real (ex.:
  um `cli` publicado separadamente, ou uso do `core` fora deste repositório).

---

## ADR-004 — Heurística de silabação: grupos vocálicos + 4 regras ortográficas locais + léxico mínimo de exceções

**Status:** aceito · Fase 1 (revisão pós-auditoria de `countSyllables()`)

**Contexto.** A primeira versão de `countSyllables()` (contagem de grupos vocálicos com
só duas exceções — `í`/`ú` acentuado e vogal repetida) subestimava sílabas de forma
severa em um padrão estrutural comum do português: hiato entre duas vogais "fortes"
(a/e/o) sem acento diferenciador (`poesia`, `teatro`, `oceano`, `real`, `aéreo`). Por ser
um padrão frequente (não um caso raro de dicionário) e por multiplicar pelo coeficiente
de maior peso da fórmula de Flesch-PT (−84.6 para sílabas/palavra), o erro inflava
sistematicamente o índice de leiturabilidade — o oposto do que a ferramenta deveria
garantir (ver `CLAUDE.md`, "marcar em vez de inventar" / nunca virar selo de aprovação
por engano).

**Decisão.** Auditoria completa (classes de erro, impacto no Flesch-PT, regras
ortográficas aplicáveis, ambiguidades irredutíveis) seguida de revisão da heurística,
mantendo grupos vocálicos como base, mas adicionando, nesta ordem de prioridade:

1. `ão`/`ãe`/`õe` — nunca hiato (protege o ditongo nasal antes de qualquer outra regra).
2. `í`/`ú` acentuado — hiato explícito (já existia).
3. `i`/`u` átono imediatamente antes de `nh` — hiato sem marca gráfica (rainha, moinho).
4. Duas vogais "fortes" (a/e/o, com ou sem acento — exceto í/ú) adjacentes — hiato.
5. Vogal idêntica à anterior — hiato (já existia).
6. Léxico fechado de 4 palavras (`ruim`, `ruins`, `cruel`, `cruéis`) para o único padrão
   de hiato sem sinal ortográfico local identificado que é ao mesmo tempo frequente e
   pedagogicamente documentado — não um catálogo crescente de exceções.
7. Siglas 100% maiúsculas sem nenhuma vogal (CPF, FGTS, RG) contam 1 unidade por letra
   (impossível pronunciar como palavra) — corrige o piso-de-1-sílaba genérico, que as
   tratava incorretamente como uma "palavra" de 1 sílaba.

**Regras avaliadas e descartadas** (registradas para não serem retentadas sem motivo):
- Cap de comprimento de núcleo vocálico (no máx. 2 letras): quebra tritongos genuínos
  (`Uruguai`, `saguão`) sem resolver de forma confiável o problema que motivou (cadeia de
  3+ vogais como em `ideia`).
- Regra de prefixo `re-` + vogal ⇒ hiato (para `reunião`/`união`): quebra palavras não
  prefixadas com a mesma grafia (`reino` = rei-no, ditongo genuíno). Descartada por
  risco de regressão maior que o ganho.
- `qu`/`gu` + `e`/`i` com tratamento especial de "u mudo": investigada e descartada por
  ser **irrelevante para a contagem** — o número de sílabas é o mesmo esteja o "u"
  mudo+fundido ou pronunciado como parte do ditongo; só afetaria identificação fonética
  do núcleo, não a contagem, que é tudo que este módulo precisa.

**Consequências — avaliação (golden set em `test/eval/silabas-golden.ts`, 56 palavras).**
Taxa de acerto exata: **91.1%** · erro absoluto médio: **0.143** sílaba/palavra. Casos
que permanecem incorretos (marcados `limitacao_conhecida`, nunca testados como se
fossem corretos — ver `test/eval/silabas-eval.test.ts`): `poesia`, `alegria`, `ideia`
(hiato final átono dependente de tonicidade não recuperável da grafia), `reunião`
(hiato de fronteira de prefixo/morfema), `INSS` (sigla com vogal mas convencionalmente
soletrada — indistinguível de `ONU`/`PIB` pela grafia). Impacto medido em 3 textos de
exemplo: o algoritmo antigo subestimava o Flesch-PT em **13 a 34 pontos** nesses textos
(quanto mais denso em hiatos comuns ou siglas soletradas, maior o desvio) — sempre na
direção de parecer mais legível do que é.

**Fica valendo até nova auditoria.** Qualquer nova exceção lexical precisa do mesmo
padrão desta ADR: motivo documentado, tentativa de regra geral registrada e descartada
com justificativa, e entrada correspondente no golden set.

---

## ADR-005 — Nomenclatura interna da Camada 1 padronizada em inglês

**Status:** aceito · Fase 1 (refatoração transversal, sem mudança de comportamento)

**Contexto.** Até este ponto, tipos/campos/ids internos da Camada 1 misturavam
português (`criterio`, `principio`, `trecho`, `severidade`, `sugestao`,
`justificativa`, `Metricas`, `Placar`, `palavrasPorFrase`, `vozPassiva`,
`alertaAcimaDe` etc.) com inglês (`Sentence`, `Token`, `Document`, `wordCount`,
`isWord`). A inconsistência dificultava previsibilidade de nomenclatura em código novo
e destoava da convenção usual de bibliotecas TypeScript.

**Decisão.** Toda a nomenclatura interna da Camada 1 — tipos, interfaces, campos,
valores de enum/união, ids de critério, nomes de função e variáveis locais — passa a
ser em inglês. Mapa principal:

| Antes (PT) | Depois (EN) |
|---|---|
| `Categoria` | `Category` |
| `Severity` valores `alerta`/`erro` | `warning`/`error` (`info` inalterado) |
| `Finding.criterio/categoria/principio/trecho/severidade/sugestao/justificativa` | `criterion/category/principle/span/severity/suggestion/justification` |
| `Metricas` (`palavras/frases/silabas/palavrasPorFrase/silabasPorPalavra`) | `Metrics` (`words/sentences/syllables/wordsPerSentence/syllablesPerWord`) |
| `Placar`/`PlacarCriterio` | `Score`/`CriterionScore` |
| `Diagnostic.texto/placar/metricas` | `Diagnostic.text/score/metrics` |
| `Config.frase.{alertaAcimaDe,erroAcimaDe}` | `Config.sentenceLength.{warnAbove,errorAbove}` |
| `Config.vozPassiva.{habilitado,estarComoPassiva}` | `Config.passiveVoice.{enabled,treatEstarAsPassive}` |
| `Config.nominalizacao.{habilitado,sugerir}` | `Config.nominalization.{enabled,suggest}` |
| `Config.jargao.{habilitado,ranqueFrequenciaCorte,sugerirDoGlossario}` | `Config.jargon.{enabled,frequencyRankCutoff,suggestFromGlossary}` |
| `Config.metrics.decimais` | `Config.metrics.decimalPlaces` |
| id `frase_longa` | `long_sentence` |

**O que NÃO mudou (fronteira deliberada):**
- **Mensagens para o usuário final continuam em português.** `Finding.justification`
  (o texto que o pass produz) é a string em PT-BR de sempre — só o NOME do campo virou
  inglês, o CONTEÚDO da mensagem não. `sentence-length.ts` traduz `severity` de volta
  para "alerta"/"erro" só na hora de montar a frase final, especificamente para isso.
- **Camada 2 (`src/lucid/probe/**`) não foi tocada** — fora do escopo ("nomenclatura
  interna da Camada 1"); `ProbeInput.trecho`, `ProbeResult.podeResponder` etc.
  permanecem em português até uma decisão equivalente for tomada para a Camada 2.
- **Nomes de arquivo de dado (`abreviacoes.pt.json` etc.) não foram renomeados** — o
  sufixo `.pt.` marca deliberadamente que o CONTEÚDO é um recurso linguístico PT-BR,
  uma preocupação distinta de nomenclatura de código. Só a CHAVE JSON acessada pelo
  código (`abreviacoes` → `abbreviations`) foi traduzida, por ser efetivamente um
  "campo" lido programaticamente.
- **Exemplos de palavras/frases em português dentro de comentários e testes** (ex.:
  "guarda-chuva", "Sr.", "poesia") não foram traduzidos — são dados de domínio sendo
  analisados pelo linter, não nomenclatura de software.
- **Textos de `describe`/`it` nos arquivos de teste continuam em português** — são
  documentação de teste, não a API pública nem nomenclatura interna do pacote.

**Consequências.** Mudança puramente de nomenclatura — nenhuma regra de negócio, span,
severidade calculada ou saída de `justification` mudou de valor. Toda a suíte de testes
(192 testes) foi atualizada para os novos nomes e permanece verde sem alteração de
comportamento; `npm run typecheck`/`lint`/`depcheck` continuam limpos.

---

## ADR-006 — Voz passiva: matcher local por tokens, sem parser, precisão sobre recall

**Status:** aceito · Fase 1 (`passiveVoicePass`, critério `passive_voice`, `5.3.3`)

**Contexto.** `5.3.3` (frases claras, quem faz o quê) exige detectar voz passiva
analítica em PT-BR. O `core` não tem — e por ADR-001 não vai ter — um parser sintático
ou POS tagger. A questão era se dava para detectar essa construção com precisão
aceitável só com regras + léxico + varredura de tokens.

**Decisão: matcher local ancorado em formas de `ser`, sem parser.** A passiva
analítica em PT-BR é uma construção *local*: `ser` (léxico fechado, `verbos-ser.pt.json`)
seguido de particípio dentro de uma janela curta de tokens. Ancorar no auxiliar — não
"varrer atrás de qualquer -ado/-ido" — é o que torna o matcher preciso sem precisar de
sujeito, concordância a distância ou fronteira de cláusula formal:

- **Por que ancorar em `ser`:** classe fechada e pequena (~55 formas), teste de
  pertinência a `Set` é 100% determinístico e não gera falso positivo por si só — todo
  o trabalho de precisão fica concentrado no segundo gate (formato de particípio).
- **`sido`/`ser` (infinitivo) já resolvem os casos compostos** ("tinha sido aprovado",
  "vai ser analisado") **sem precisar reconhecer `tinha`/`vai` como auxiliar** — ambos
  já são âncoras do léxico de `ser` por si só. Isso evita exatamente o "detector
  genérico de segundo verbo" que dependeria de POS tagging.
- **Barreiras (pontuação de oração + conjunções fechadas `que/mas/e/porque/quando`)
  substituem fronteira de cláusula formal:** aproximação suficiente para uma
  construção local, sem custo de parser.

**Por que prioriza precisão sobre recall.** Um falso positivo sistemático (ex.:
sinalizar "ele é interessado no assunto" como passiva, ou "isso foi resultado de" como
voz passiva) corrói a confiança na ferramenta mais rápido do que um falso negativo
pontual — mesmo raciocínio de `CLAUDE.md`/ADR-001. Por isso:
- qualquer token não reconhecido entre âncora e particípio **aborta a busca** — o
  matcher nunca "pula" tokens desconhecidos torcendo para achar um particípio mais à
  frente;
- vírgula entre auxiliar e particípio é tratada como barreira dura, mesmo sabendo que
  isso descarta casos genuínos como "foi, segundo consta, aprovado" (falso negativo
  aceito, medido no golden set — ver `test/eval/passive-voice-golden.ts`);
- dois léxicos de exclusão (`participios-ambiguos.pt.json`,
  `participios-falsos-nominais.pt.json`) suprimem candidatos previsivelmente não-passivos
  em vez de deixar o matcher arriscar.

**Por que não detecta passiva sintética (`se`).** "Vendem-se casas" é outra
construção, com outro conjunto de falsos positivos (reflexivo, recíproco, `se`
inerente ao verbo) — já registrado como Fase 2 em `docs/ARQUITETURA.md` §6.2. Detectar
as duas construções no mesmo pass misturaria dois problemas de precisão diferentes.

**Por que `estar`/`ficar` não são detectados nesta etapa**, apesar de `Config.passiveVoice.treatEstarAsPassive` já existir (default `false`, criado numa etapa anterior antecipando isso): `estar`/`ficar` + particípio é predominantemente resultativo/adjetival
("a porta está fechada" ≠ alguém fechando a porta agora), não voz passiva de ação.
Wiring esse flag exige uma heurística própria para separar leitura resultativa de
leitura passiva genuína — não implementado aqui, o flag continua um no-op documentado.

**Por que formas ambíguas são suprimidas, não sinalizadas com severidade menor.** Dois
léxicos, propositalmente separados por proveniência:
- `participios-ambiguos.pt.json` — particípios genuínos que, em "ser + particípio",
  leem-se quase sempre como adjetivo de estado psicológico/relacional (dedicado,
  interessado, casado, envolvido…);
- `participios-falsos-nominais.pt.json` — sufixo de particípio coincidente com
  substantivo lexicalizado (resultado, pedido, sentido, achado…).

Ambos CURADOS e EXTENSÍVEIS, não exaustivos — documentado em `src/lucid/data/README.md`.
Entradas só entram por julgamento linguístico de que a leitura não-passiva domina
esmagadoramente; a avaliação (`test/eval/passive-voice-eval.test.ts`) é o mecanismo de
detectar buracos reais, não um alvo para "decorar" (ver processo abaixo).

**Por que não há sugestão automática.** Mesmo com agente explícito identificado,
reconjugar para a ativa (reordenar sujeito/objeto, ajustar concordância de
número/pessoa/tempo) não é uma transformação mecanicamente segura (I7) — a mesma
decisão já tomada para `sentence-length` e antecipada em `docs/ARQUITETURA.md` §6.2.
`suggestion` fica sempre ausente; `justification` (em PT-BR) descreve o achado e sugere
que o humano considere reescrever, sem produzir o texto.

**Processo de curadoria (não é "ajustar pra passar no teste").** Antes de fechar o
golden set, a auditoria da própria regex encontrou 3 lacunas genuínas — corrigidas por
mérito linguístico independente, não porque um exemplo do golden set falhava:
1. `íd` (í acentuado) faltava no sufixo regular — sem ela, toda a classe de verbos em
   vogal+ir (construir, incluir, concluir, distribuir…) ficava fora do reconhecimento;
   generaliza para qualquer verbo dessa classe, não só um exemplo.
2. `dado`/`aceso` (particípios com radical curto ou irregular) faltavam no léxico de
   irregulares — verbos "dar"/"acender" são frequentes o bastante para justificar a
   entrada por si só.
3. `achado` (substantivo lexicalizado, mesma classe de `pedido`/`resultado`) faltava em
   `participios-falsos-nominais.pt.json`.

Depois dessas correções, a avaliação rodou contra as 46 entradas do golden set e achou
mais uma lacuna genuína: `envolvido` (mesma classe psicológica/relacional de
`dedicado`/`interessado`) produzia falso positivo. Foi adicionado a
`participios-ambiguos.pt.json` pela MESMA regra de classe, não como entrada avulsa —
generaliza para qualquer frase com esse particípio, não só a do golden set. As duas
únicas lacunas que sobraram (vírgula entre auxiliar e particípio) são consequência
direta da decisão de design "barreira de pontuação aborta a busca" — **não foram
corrigidas de propósito**, porque corrigi-las significaria afrouxar exatamente a regra
que garante a precisão de 100% medida.

**Resultado da avaliação** (46 exemplos, `test/eval/passive-voice-golden.ts`):
precisão 100%, recall 93,3% (28 TP, 0 FP, 2 FN — os 3 exemplos de "múltiplas passivas"
contribuindo 2 TP cada elevam o total de TP acima do número de exemplos). As 2
entradas que sobram como `limitacao_conhecida` são falsos negativos por barreira de
vírgula, aceitos e documentados, não "corrigidos para fechar o teste".

**Consequências.** `Config.passiveVoice.enabled` (já existente) passa a ser
efetivamente consultado — pass inteiro desligável sem mudar forma pública. Nenhuma
mudança em `Diagnostic`/`Finding`/`Pass`/`analyze()`.

---

## ADR-007 — Nominalização: construção com verbo leve, adjacência estrita, sugestão só na interseção de 6 condições de segurança

**Status:** aceito · Fase 1 (`nominalizationPass`, critério `nominalization`, `5.3.3`
— também relacionado a `5.3.4`, ver nota abaixo)

**Contexto.** `5.3.3`/`5.3.4` pedem detectar "verbo pesado escondido em substantivo"
("fazer a análise de" em vez de "analisar"). Mesma restrição de sempre: sem parser,
sem POS tagger (ADR-001). A pergunta adicional aqui, que a voz passiva não tinha, é:
quando é seguro **sugerir** a reescrita, não só apontá-la?

**Por que a detecção exige verbo leve E nominalização cadastrados — nunca sufixo
isolado.** Duas evidências fracas somadas (`fazer` sozinho é polissêmico — "fazer o
bolo"; `-ção`/`-mento` sozinhos aparecem constantemente fora da construção — "a
análise foi publicada") viram uma evidência forte só na sua interseção. Nenhuma das
duas evidências, isoladamente, teria precisão aceitável.

**Por que sufixos isolados não são usados nesta fase.** Densidade de nominalização
("muitas palavras -ção/-mento numa frase") é um sinal genuinamente diferente — sempre
`info`, nunca sugestão, nunca vinculado a um verbo-base específico — e já está
registrado como Fase 2 em `docs/ARQUITETURA.md` §6.3. Implementá-lo junto misturaria
dois problemas de precisão distintos no mesmo pass.

**Por que a construção-núcleo exige adjacência estrita (3 tokens consecutivos, sem
janela).** Diferente da voz passiva (que tem orçamento de conectores), aqui qualquer
folga entre verbo/determinante/nominalização já é risco: adjetivo, possessivo,
coordenação, oração encaixada e pontuação intermediária entre determinante e
nominalização são TODOS, ao mesmo tempo, impedidos pela mesma regra única — não
precisei de uma checagem por categoria proibida. Modificadores **depois** da
nominalização não impedem a detecção (o núcleo "verbo+det+nom" já é uma evidência
completa por si), mas nunca produzem sugestão (ver abaixo).

**Por que formas finitas não recebem sugestão.** Reconjugar o verbo-base para o
tempo/pessoa/número da forma finita do verbo leve ("fez" → "analisou") é morfologia
produtiva — exatamente o tipo de "conjugador genérico" vetado por ADR-001. A trava é
puramente ortográfica: só quando a forma cadastrada tem `infinitive: true` (e o
verbo-base já está armazenado no infinitivo na tabela) a substituição é 1:1, sem
flexionar nada. Formas finitas continuam gerando `Finding` — o critério foi violado,
só a reescrita automática não é segura.

**Por que a sugestão exige formato de complemento reconhecido.** Mesmo no infinitivo,
"de X" → "X" só é seguro quando X é exatamente 1 palavra seguida do fim da frase (ou
pontuação final) — nunca "pule e assuma". A auditoria dos próprios exemplos do pedido
mostrou por que isso importa: em "fazer a análise e a revisão dos dados", o núcleo
"fazer a análise" é sintaticamente completo por si, mas "a revisão dos dados" depende
da MESMA regência de "fazer" — substituir só o núcleo por "analisar" deixaria "e a
revisão dos dados" órfã, sem verbo. A regra "complemento limpo = 1 palavra + fim de
frase" filtra esse caso (e coordenação de nominalizações, oração encaixada, e
complemento com coordenação interna) pela mesma checagem, sem regra por categoria.

**Por que os datasets são curados e extensíveis, não gerados.** `verbos-leves.pt.json`
lista cada forma flexionada explicitamente (mesmo espírito de `verbos-ser.pt.json`);
`nominalizacoes.pt.json` lista singular E plural explicitamente, porque
"-ção"→"-ções" não é uma regra de pluralização simples (ao contrário de, por
exemplo, remover um "s" final) e o projeto não introduz morfologia produtiva nem para
desfazer flexão. `formação`, `administração`, `operação`, `edição`, `condução` foram
deliberadamente OMITIDAS — nenhuma tem mapeamento defensavelmente único (todas
lexicalizaram para sentido institucional/concreto) e nenhuma aparece nos exemplos-alvo
desta etapa; "podem ser completamente ignoradas" foi a leitura adotada, não incluí-las
com `safeForSuggestion:false`. `revisão` é o caso interessante: aparece nos exemplos
positivos de DETECÇÃO do pedido ("promover a revisão") e na lista de "problemáticos
para sugestão" ao mesmo tempo — a única leitura que satisfaz as duas coisas é
cadastrá-la com `safeForSuggestion:false` (detectada, nunca sugerida).

**Por que densidade de nominalização permanece para a Fase 2.** Mesmo raciocínio do
"sufixos isolados": é um sinal de natureza diferente (frequência de padrão em vez de
construção sintática pontual), com política de severidade diferente (`info`,
nunca `warning`), e sem vínculo com um verbo-base — misturar os dois no mesmo pass
prejudicaria a precisão de ambos.

**Um princípio por finding.** `Finding.principle` é uma string única (não mudei essa
forma). `5.3.3` é reportado como o princípio principal (frases claras); a relação com
`5.3.4` (frases concisas — a construção é sempre mais longa que o verbo direto) fica
só nesta nota, não no dado.

**Processo de curadoria (achados pela própria auditoria, não pelo golden set).** Antes
de escrever o golden set: (1) confirmei que `Config.nominalization.{enabled,suggest}`
já existiam como campos mortos e passaram a ser efetivamente consultados; (2) ao
testar determinantes plurais ("as análises", "os pagamentos"), descobri que o dataset
só tinha formas singulares — corrigido adicionando as formas plurais explicitamente
(mesma classe de curadoria já usada em outros datasets, não um hack pontual). Depois
disso, a avaliação contra as 39 entradas do golden set achou 2 lacunas genuínas, que
**não foram corrigidas**, por serem limite de escopo deliberado, não descuido: "dar"
não está entre os 5 verbos leves cadastrados (o pedido só demonstra
fazer/realizar/efetuar/promover/proceder como seguros), e "proceder com" é uma
regência alternativa de "proceder" não implementada (só o padrão "a" — à/ao/às/aos —
foi demonstrado no pedido). Ambas documentadas como `limitacao_conhecida`.

**Resultado da avaliação** (39 exemplos, `test/eval/nominalization-golden.ts`):
precisão de detecção 100%, recall 93,1% (27 TP, 0 FP, 2 FN). Métrica prioritária —
sugestão: **15/15 sugestões esperadas saíram com o texto exato esperado; 0 sugestões
inseguras emitidas** em todo o golden set.

**Consequências.** `Config.nominalization.enabled`/`Config.nominalization.suggest`
(já existentes) passam a ser efetivamente consultados. Nenhuma mudança em
`Diagnostic`/`Finding`/`Pass`/`analyze()`.

---

## ADR-008 — Jargão: glossário curado como autoridade única de runtime, frequência fora do MVP, expressões multipalavra como desambiguação estrutural

**Status:** aceito · Fase 1 (`jargonPass`, critério `jargon`, `5.3.2`)

**Contexto.** `docs/ARQUITETURA.md` §6.4 previa dois mecanismos para este critério:
glossário jargão→comum (`warning` com `suggestion`) e raridade por frequência
(`frequencia.pt.json`, `info` sem sugestão). A pergunta desta etapa foi se dava para
implementar o critério inteiro com precisão aceitável usando só o glossário — sem
frequência, sem stemming, sem inferência de raridade — e ainda assim cobrir expressões
frequentes do domínio administrativo/jurídico sem afogar o resultado em falsos
positivos de palavra polissêmica.

**Decisão: só o glossário curado dispara finding. Frequência fica fora do runtime
inteiramente nesta etapa** — não só sem sugestão (como o §6.4 original previa para o
mecanismo de raridade), mas sem gerar finding algum. `Config.jargon.frequencyRankCutoff`
continua existindo na `Config` (não é API que se possa remover sem quebrar contrato),
mas nenhum código o consulta — mesmo padrão já estabelecido para
`Config.passiveVoice.treatEstarAsPassive` em ADR-006.

**Por que frequência não é autoridade de runtime.** Uma lista de frequência sozinha
otimiza recall às custas de precisão: sinaliza nome próprio, sigla, variante
morfológica, neologismo legítimo e termo que o leitor-alvo já conhece, com a mesma
confiança que sinaliza jargão genuíno — e nunca diz por qual palavra trocar, então não
habilita sugestão de qualquer forma. Isso inverte a prioridade do produto
(precisão > recall, `CLAUDE.md`). Frequência continua útil, mas só como ferramenta
OFFLINE de curadoria — cruzar contra um corpus para achar candidatos que um humano
avalia antes de entrarem no glossário — nunca como sinal de diagnóstico. `§6.4` de
`docs/ARQUITETURA.md` foi atualizado com uma nota curta registrando essa decisão, para
não contradizer este ADR.

**Por que expressões multipalavra têm prioridade sobre unigramas.** A maior parte do
jargão administrativo/jurídico alvo é frasal ("em sede de", "na hipótese de", "sem
prejuízo de", "fazer jus a"). Isso não é só estilo de dataset — é a técnica de
desambiguação mais barata disponível sem parser: a própria expressão fixa o sentido.
"em sede de" nunca compete com o sentido comum de "sede" (residência de empresa, ou
sede/vontade de beber) porque o match exige as 3 palavras contíguas — o problema de
polissemia que um unigrama isolado teria simplesmente não existe na expressão. Isso
generaliza a lição de ADR-007 (nominalização): duas evidências fracas somadas (aqui,
"contiguidade de N palavras específicas") produzem uma evidência forte sem precisar de
POS tagging.

**Por que unigramas altamente polissêmicos são evitados, não cadastrados com
`safeForSuggestion:false`.** Diferente da nominalização (onde `revisão` é cadastrada
com mapeamento não-único, porque a CONSTRUÇÃO inteira — verbo leve + determinante +
nominalização — já é evidência local suficiente para o finding, só não para a
sugestão), um unigrama de jargão sem nenhuma evidência estrutural ao redor não tem
esse colchão: sinalizar `consoante` (substantivo comum — letra do alfabeto — tão
frequente quanto o uso conjuntivo formal) geraria falso positivo sistemático em texto
qualquer que mencione "vogais e consoantes", não só em contra-exemplos artificiais.
A decisão foi omitir a palavra inteiramente do dataset, mesmo critério já usado em
`nominalizacoes.pt.json` para `formação`/`administração`/`operação`/`edição`/`condução`
(ADR-007) — "pode ser completamente ignorada" é uma leitura válida quando o
mapeamento nem chega a ser defensável.

**Por que detecção e sugestão continuam decisões separadas.** Mesmo princípio de
ADR-007: todo match aceito pelo matcher vira `Finding` (o critério foi violado —
o termo é jargão, ponto); `suggestion` só aparece quando a ENTRADA declara
`safeForSuggestion: true`. `na hipótese de` e `de acordo com o disposto` são exemplos
de expressão desambiguada (sem risco de sentido incerto) mas com troca sintaticamente
arriscada — a preposição/estrutura que segue muda a regência ou exige inserir um verbo
("na hipótese de atraso" → substituir por "em caso de atraso" funciona; "na hipótese de
que o prazo seja prorrogado" → a mesma troca produziria "em caso de que", agramatical).
Sem uma checagem de complemento como a de `nominalization.ts` (que o pedido desta etapa
explicitamente vetou — "substituição dependente de sintaxe" está fora de escopo), a
única opção honesta é não gerar sugestão nunca para essas duas entradas, mesmo sabendo
que uma fração dos usos reais seria segura de trocar.

**Por que a guarda de nome próprio não se aplica a expressões multipalavra.** Nenhuma
entrada cadastrada nesta etapa espera capitalização própria dentro da expressão — a
guarda de maiúscula-em-meio-de-frase só existe para reduzir falso positivo de unigrama
("Outrossim" como nome de pessoa é hipotético, mas a heurística é conservadora por
padrão). Aplicá-la a frases multipalavra herdaria o mesmo risco sem o mesmo benefício
(nenhuma frase cadastrada tem essa ambiguidade), então foi deliberadamente restrita a
`kind: "word"`.

**Por que "termo definido localmente" ficou fora do matcher inicial.** O padrão
`"X (doravante 'Y')"`/`"X, denominado Y"` exigiria reconhecer uma estrutura sintática
que não é adjacência simples de tokens — teria o mesmo risco de "detector genérico"
que ADR-001 já vetou para análise morfológica. Registrado como limitação conhecida em
vez de improvisado; candidato de fase futura se a curadoria mostrar que o volume de
falso positivo evitável compensa a complexidade.

**Por que siglas ficaram fora do escopo.** Sigla é uma classe de problema própria
(expansão, ambiguidade entre domínios, decisão de quando expandir) que já tem tratamento
parcial em outro lugar do sistema (regra genérica de sigla na segmentação de frases,
`abreviacoes.pt.json`) — misturar os dois problemas de precisão no mesmo pass
repetiria o erro que ADR-006/ADR-007 já evitaram (não misturar duas fontes de
falso positivo distintas num único critério).

**Aspas: pareamento simples, sem aninhamento.** Três pares reconhecidos
(`"`↔`"` por paridade, `"`↔`"`, `«`↔`»`), escopo por frase, sem suporte a aninhamento
nem a aspas simples retas (`'` colidiria com o apóstrofo de elisão já absorvido dentro
da palavra por `tokenize.ts`) nem a pares que cruzam fronteira de frase. Um abridor sem
fechador correspondente na mesma frase não suprime nada — falso negativo aceito e
documentado, não um parser de citação completo (fora de escopo por instrução
explícita).

**Consequências.** `jargonPass` registrado em `PASSES`; `Diagnostic`/`Finding`/`Pass`/
`analyze()` não mudaram de forma. `Config.jargon.{enabled,suggestFromGlossary}`
(já existentes) passam a ser efetivamente consultados; `frequencyRankCutoff` continua
declarado e não-consultado, documentado como decisão, não como pendência.

---

## ADR-009 — Consolidação e avaliação integrada da Camada 1: golden set integrado, snapshots do `Diagnostic`, seams de teste, convenção de offset e política de snapshot

**Status:** aceito · Fase 1 (etapa de consolidação — sem novo critério linguístico)

**Contexto.** Os quatro critérios do MVP (`long_sentence`, `passive_voice`,
`nominalization`, `jargon`) estavam implementados e testados isoladamente, cada um com
seu golden set por-critério (`test/eval/*-golden.ts`). Faltava demonstrar que a Camada 1
executada de ponta a ponta por `analyze()` é determinística, estável, auditável, coerente
entre critérios e independente da ordem de execução dos passes — e travar esse
comportamento observável contra regressão. Nenhuma heurística linguística foi alterada
nesta etapa; é consolidação e prova, não novo produto.

**Decisão. Golden set INTEGRADO separado dos por-critério.** `test/golden/integrated-golden.ts`
tem 17 documentos completos e realistas (administrativo, jurídico, os quatro critérios
juntos, múltiplas ocorrências, spans sobrepostos, guardas ativas, fora-de-escopo,
Unicode/aspas curvas/emoji, multi-parágrafo, vazio, só-espaços, curto, pontuação
incomum), cada um declarando a expectativa completa do `Diagnostic` observável. As
expectativas são juízo linguístico verificado à mão do que a Camada 1 DEVE produzir —
`test/golden/integrated.test.ts` faz asserções semânticas nomeadas (não só snapshot) e
emite o resumo integrado (TP/FP/FN global e por critério, sugestões
emitidas/corretas/inseguras, findings sobre termos não previstos). Resultado desta etapa:
26 findings esperados, precisão 100%, recall 100%, 14 sugestões emitidas/14 corretas, 0
inseguras, 0 findings sobre termos não previstos.

**Snapshots do `Diagnostic` completo como contrato observável.** `diagnostic-snapshot.test.ts`
tira snapshot do `Diagnostic` inteiro de 9 casos representativos. São estáveis por
construção: o `Diagnostic` não tem timestamp, id aleatório nem campo derivado de
ambiente — `meta.lucidVersion`/`meta.standardVersion` são constantes de código e
`meta.configHash` é função pura da Config. Um teste de âncora verifica esses campos
ANTES dos snapshots, para que uma regressão em campo instável falhe com mensagem clara.
Snapshot não é a única defesa: as asserções semânticas de `integrated.test.ts` cobrem o
significado; os snapshots cobrem o retrato byte-a-byte.

**Política de revisão de snapshot (registro formal).** Quando um snapshot mudar:
(1) a mudança exige revisão humana explícita; (2) a causa precisa ser explicada;
(3) NÃO se atualiza snapshot automaticamente só porque o teste falhou — diferencia-se
mudança desejada de regressão; (4) mudança semântica relevante (nova severidade, novo
span, nova sugestão, mudança de `LUCID_VERSION`) é registrada aqui ou no changelog antes
de reescrever o snapshot. `vitest -u` nunca é rodado às cegas.

**Seams internos de teste, sem ampliar a API pública.** Dois pontos de extensão foram
extraídos, ambos exportados do seu módulo mas AUSENTES do barrel `src/lucid/index.ts` —
mesmo precedente do `sortFindings`, que já era exportado de `analyzer.ts` só para teste:
- `analyzeWithPasses(text, passes, config)` em `analyzer.ts` — `analyze` passou a delegar
  a ele com o `PASSES` canônico. Permite injetar permutações de passes no teste de
  independência de ordem sem tocar na assinatura pública de `analyze`.
- `compileJargonEntries(entries)` em `jargon.ts` — a função que agrupa por primeira
  palavra e ordena por comprimento decrescente (longest-match-first), testável com dados
  sintéticos para provar independência da ordem do JSON.

A superfície pública (o barrel, docs/ARQUITETURA.md §3.6) continua sendo só `analyze` +
tipos + config. Nenhum contrato público mudou de forma.

**Independência da ordem de execução dos passes — com uma exceção documentada.** O teste
roda as 24 permutações dos 4 passes sobre vários textos e confirma que a PROJEÇÃO
CANÔNICA (`findings`, `metrics`, `meta`, `totalFindings`, e `byCriterion` como conjunto)
é idêntica em todas — 0 divergências. A única parte sensível à ordem é a ORDEM do array
`Score.byCriterion`, que acompanha deliberadamente a ordem do registry (§ score em
`ARQUITETURA.md`): em produção isso é sempre `PASSES` (ordem fixa), então o `Diagnostic`
público é sempre idêntico; só um teste que injeta uma permutação observa `byCriterion`
reordenado, e as CONTAGENS por critério são idênticas em qualquer ordem. `findings` é
totalmente independente da ordem porque `sortFindings` recanoniza.

**Ordenação final (`sortFindings`) — total e correta, documentada e testada, não
alterada.** A ordem canônica por `(span.start, span.end, criterion, principle)` já é
total para tudo que os quatro passes produzem: dentro de um mesmo critério os spans
começam em posições distintas (cada pass ancora/avança o cursor uma vez por posição),
então nunca há empate real de `(criterion, start)`; entre critérios distintos, a string
`criterion` desempata. O único empate residual teórico (findings idênticos nas quatro
chaves) é resolvido de forma estável e determinística pela ordenação estável do JS
(ES2019+), preservando a ordem determinística de inserção (`PASSES` × ordem interna do
pass). Por já ser total e correta, foi DOCUMENTADA e TESTADA (`test/ordering.test.ts`),
não modificada — coerente com "não altere contratos sem necessidade objetiva". Severidade
NÃO foi adicionada como chave de desempate porque não há par de findings reais que
empate nas quatro chaves e difira em severidade (nos 3 passes lexicais/sintáticos a
severidade é constante `warning`; em `long_sentence` os spans são a frase inteira, únicos).

**Score auditado, não redesenhado.** `test/score-audit.test.ts` confirma que o placar é
derivado só de dados determinísticos (findings + registry + `wordCount` + config), é
independente da ordem dos findings (`buildScore` sobre findings invertidos dá resultado
igual), não conta o mesmo finding duas vezes mesmo com spans sobrepostos, mantém o
critério desabilitado listado com contagem zero, não tem vocabulário de aprovação, e
trata texto vazio/curto sem divisão por zero. Nenhuma incoerência foi encontrada — a
fórmula não foi tocada.

**Convenção de offset (documentada explicitamente, nunca alterada em silêncio).**
`span.start`/`span.end` são índices de CODE UNIT UTF-16 sobre `Diagnostic.text`, e
`Diagnostic.text` é a entrada normalizada em NFC (`normalize.ts`). `end` é exclusivo.
Consequências testadas em `test/provenance.test.ts`: caracteres fora do BMP (emoji, par
surrogate) ocupam 2 code units e deslocam offsets em 2 — porque tudo em JS (`.length`,
`.slice`) opera em code units UTF-16; entrada NFD é composta para NFC, e os offsets são
relativos ao texto NFC exposto, não à entrada bruta; a invariante-mestra
`Diagnostic.text.slice(start, end) === span.text` vale para todo finding, sob acentos,
travessão, aspas curvas, quebras de linha e múltiplos parágrafos. Nenhum pass reconstrói
texto com offsets próprios — todos fatiam o mesmo `source`.

**Regressões consolidadas.** `test/ordering.test.ts`, `test/interaction.test.ts` e o
golden integrado reúnem os casos-limite descobertos nos quatro passes (falso nominal de
passiva, particípio ambíguo, forma finita sem sugestão, complemento complexo de
nominalização, jargão em aspas, unigrama polissêmico não cadastrado, sobreposição
longest-match-first, frase longa com múltiplos findings internos, pass desabilitado) —
cada um agora exercido também no fluxo integrado de `analyze()`, não só no pass isolado.

**Consequências.** Nenhuma mudança em `Diagnostic`/`Finding`/`Pass`/`analyze()` na forma
pública. Dois seams internos novos (`analyzeWithPasses`, `compileJargonEntries`) e as
interfaces `JargonEntry`/`CompiledEntry` exportadas de `jargon.ts` para teste, nenhum no
barrel. `probe/`, `report/`, CLI e UI não foram tocados. Suíte: 676 testes, 9 snapshots.

---

## ADR-010 — Jargão lote 2: expansão curada do glossário para encolher o resíduo (auto-fix), com o mesmo eval gate

**Status:** aceito · Fase 1 (curadoria de `jargao.pt.json`, dentro do processo do ADR-008)

**Contexto.** Num texto do domínio, o valor do Lucid depende da fração de achados que ele
resolve com segurança (o balde "resolvíveis automaticamente"). O primeiro passo do plano
de encolher o resíduo (registrado ao fim do ADR-008) é o de maior retorno e menor risco:
**crescer o glossário curado** — pura curadoria, sem novo mecanismo no matcher, sob o
mesmo portão de avaliação (métrica dura: **0 sugestões inseguras**).

**Decisão.** 13 entradas novas, todas `safeForSuggestion:true`, em três famílias, cada uma
justificada individualmente contra os 4 critérios do ADR-008 (familiaridade real,
estabilidade de sentido, preservação de significado, ausência de reorganização sintática):

1. **Conectores/advérbios formais invariantes e monossêmicos** — `destarte`→"assim",
   `conquanto`→"embora", `porquanto`→"porque", `mormente`→"principalmente". Cada um tem um
   único sentido no domínio e um sinônimo familiar que preserva a estrutura seguinte; a
   troca é invariante (não flexiona).
2. **Expressões multipalavra fixas** — `tão logo`→"assim que", `via de regra`→"em geral",
   `por derradeiro`→"por fim", `de per si`→"por si só". A própria expressão desambigua
   (mesma lição do ADR-008: "em sede de" não compete com o sentido comum de "sede"), então
   palavras que isoladas seriam ambíguas (`via`) são seguras dentro da MWE.
3. **Família `com fulcro …`→`com base …`** — muito frequente em texto jurídico. As
   contrações (`em/no/na/nos/nas`) são cadastradas explicitamente porque fazem parte do
   span casado e são preservadas 1:1 na troca ("com fulcro no" → "com base no"). Sem essa
   enumeração, a forma usual (contraída) não casaria — mesma disciplina de "sem regra de
   flexão produtiva" já usada em `fazer jus a`.

**Por que estas e não outras.** A segurança de cada troca foi verificada como **1:1 sem
reconjugação e sem mudança de regência**: conectores/advérbios são invariantes; nas MWEs a
preposição/contração viaja dentro do span. Verbos formais isolados (`obstar`, `perquirir`,
`carecer de`) foram **deixados de fora** justamente por exigirem casar e devolver formas
conjugadas — o tipo de morfologia produtiva vetado pelo ADR-001.

**Por que os `context_dependent` foram adiados.** `nos termos de`, `à luz de`, `em que
pese` têm equivalente, mas a troca muda a regência ou a estrutura da oração seguinte —
entrariam só como detecção-sem-sugestão, sem ganho de auto-fix (o objetivo deste lote).
Ficam como candidatos de um passo futuro (contexto-direito limitado, extensão do matcher).

**Processo (não é decorar o golden).** Cada entrada entrou por mérito de domínio; o golden
(`test/eval/jargon-golden.ts`) e os testes unitários ganharam exemplos correspondentes,
incluindo **guardas de fronteira** que provam a ausência de falso positivo por
tokenização: `por quanto` (dois tokens) não casa o unigrama `porquanto`; `via de acesso`
não casa `via de regra` (difere no 3º token).

**Resultado da avaliação** (39 exemplos no golden de jargão): precisão de detecção 100%,
recall 96,3% (o único FN é a limitação conhecida pré-existente `fizer jus a`), e a métrica
prioritária mantida: **23/23 sugestões esperadas corretas, 0 sugestões inseguras, 0
findings sobre termos não cadastrados**. Suíte completa verde (698 testes).

**Consequências.** Nenhuma mudança em código do matcher, em `Diagnostic`/`Finding`/`Pass`/
`analyze()` nem na forma pública — só dados. Nenhum snapshot/golden integrado foi afetado
(os textos daquelas suítes não contêm os novos termos). A porta de saída do plano de
resíduo continua: **Tier 2** (transforms mecânicos de passiva-com-agente e de nominalização
finita, via léxico fechado de formas) é maior e mais arriscado, e terá seu próprio ADR e
eval antes de qualquer implementação — nunca um "conjugador genérico".

---

## ADR-011 — Nominalização finita: sugestão via tabela de conjugação FECHADA (não conjugador). Passiva→ativa fica de fora

**Status:** aceito · Fase 1 (Tier 2 do plano de resíduo — revê o ADR-007)

**Contexto.** O maior resíduo do critério de nominalização eram as **formas finitas**: o
ADR-007 deu sugestão só ao infinitivo ("fazer a análise" → "analisar") e marcou toda
forma finita como `requiresHuman`, porque reconjugar o verbo-base para o tempo/pessoa da
forma finita ("fez a análise" → "analisou") seria morfologia produtiva — o "conjugador
genérico" vetado pelo ADR-001. O Tier 2 do plano pede atacar esse resíduo **sem** abrir
essa porta.

**Decisão. Reescrever a forma finita por uma TABELA DE CONJUGAÇÃO FECHADA**, não por um
conjugador. Três peças:
1. Cada forma de verbo leve (`verbos-leves.pt.json`) ganhou um **traço morfológico**
   (`feature`: `pret.3s`, `pres.3p`, `fut.3s`, `impf.3p`, …).
2. `nominalizacoes.pt.json` ganhou um bloco `conjugations`: verbo-base → traço → forma
   finita, **cada forma escrita e verificada à mão** (11 verbos-base × 8 traços).
3. O matcher escolhe a forma da sugestão pelo traço do verbo leve: infinitivo → verbo-base
   direto; finita → `conjugations[verbo][feature]`. **Se o par não está na tabela, não há
   sugestão** (`requiresHuman`) — nunca um palpite.

**Por que isto é seguro (e não um conjugador).** A concordância é preservada por
CONSTRUÇÃO: o traço vem do verbo leve (que concorda com o sujeito) e seleciona a forma do
verbo-base com o MESMO traço — "fizeram a análise" (`pret.3p`) → "analisaram" (`pret.3p`),
o sujeito "Eles" concorda com ambos. Não há regra produtiva: um par não cadastrado
simplesmente não gera sugestão. A tabela é finita, auditável linha a linha e testada.

**Escopo deliberadamente estreito.** Só os **8 traços indicativos comuns** (presente,
pretérito perfeito, futuro do presente, imperfeito × 3ª pessoa singular e plural). **Futuro
do pretérito (condicional), presente do subjuntivo e gerúndio ficam de fora** — continuam
`requiresHuman`, limitação documentada e testada (`"o comitê faria a análise"`, `"que
façam a análise"`, `"fazendo a análise"`). Todas as travas de complemento do ADR-007
continuam valendo por cima: "fez a análise ontem" segue sem sugestão (complemento não é o
formato limpo), agora por `unsafeComplement`, não por ser finita.

**Por que PASSIVA→ATIVA NÃO entrou.** O outro grande resíduo — reescrever "o pedido foi
aprovado pela comissão" como "a comissão aprovou o pedido" — foi **avaliado e recusado**
para auto-sugestão. Diferente da nominalização (uma substituição local de um núcleo
adjacente), a ativa exige **identificar sujeito e objeto e reordená-los** — reorganização
sintática que o ADR-006 já classificou como fora da garantia mecânica, e que não é
resolvível sem parser. Fingir segurança aqui seria exatamente o tipo de reescrita
"plausível mas possivelmente errada" que o produto recusa. A passiva continua com a
**orientação assistida** (o andaime "agente → sujeito, particípio → verbo" do item 1),
nunca uma sugestão aplicável. Uma fatia mínima e rígida (padrão fixo, agente explícito,
sujeito simples) poderia virar um ADR futuro, mas só com seu próprio golden e prova.

**Processo e resultado.** Os testes que o ADR-007 fixava ("forma finita nunca recebe
sugestão") foram **atualizados para o novo comportamento correto**, não contornados — e
ganharam contraparte: as formas finitas com traço cadastrado e complemento limpo agora
têm sugestão exata; as com traço não-cadastrado seguem sem. Avaliação (45 exemplos no
golden de nominalização): precisão de detecção 100%, recall 94,3% (os 2 FN são as
limitações pré-existentes `dar continuidade`/`proceder com`), e a métrica prioritária
mantida: **20/20 sugestões esperadas corretas, 0 sugestões inseguras**. Suíte completa
verde (711 testes); nenhum snapshot/golden integrado afetado (aqueles textos não têm
construção verbo-leve-finito + complemento limpo).

**Consequências.** `Diagnostic`/`Finding`/`Pass`/`analyze()` inalterados na forma. Dado
novo (`feature` nas formas de verbo leve, bloco `conjugations`) + uma função pura de
seleção no matcher. `Config.nominalization.suggest` continua sendo o kill-switch. O
resíduo do domínio encolhe mais um degrau; o que sobra (passiva, frase longa, subjuntivo/
condicional/gerúndio da nominalização) é honestamente autoral ou explicitamente adiado.

---

## ADR-012 — Tier 2 · divisão de cláusula interativa: detecção por tokens no core + transform puro, sem apagar palavra

**Status:** aceito · Tier 2 (ação estrutural assistida — plano do handoff §3)

**Contexto.** O critério `long_sentence` é, por decisão (ADR original + `sentence-length.ts`),
sempre `requiresHuman`: encurtar exige decidir o supérfluo, trabalho de autor. Mas *localizar
onde a frase pode se dividir* é mecânico e não exige adivinhar intenção. Existia já uma
metade de exibição — `app/lib/narrative.ts` calculava pontos de divisão por **regex sobre a
string do span** — porém **display-only**: nada aplicava a quebra, e a lógica vivia na camada
de view, sem teste nem snapshot.

**Decisão. Mover a detecção para o core determinístico e torná-la acionável**, em
`src/lucid/core/actions/split-sentence.ts` (puro, zero rede, coberto pela cerca do depcheck):
1. `clauseSplitPoints(text, span)` — detecção **por tokens** (reusa `tokenize` do pipeline,
   nunca uma segmentação própria), normalizando internamente (NFC) para que os offsets
   coincidam com os do `Diagnostic`. Fronteiras: `;`, `—`, e **vírgula + conjunção
   coordenativa** (léxico fechado: e, mas, porém, ou, contudo, todavia, entretanto, pois,
   portanto, logo). Guardas de borda: exige palavra antes; para `comma_conjunction`, exige
   conteúdo **depois da conjunção** (senão sobraria um "E." solto).
2. `applySplitAt(text, point)` — transform **puro e byte-determinístico**: apara o espaço à
   esquerda, insere `". "` e capitaliza a 1ª letra da 2ª cláusula. **Nunca apaga palavra** —
   a conjunção é preservada como início da nova frase ("É preciso X, e Y" → "É preciso X. E
   Y"; iniciar frase com conjunção é gramatical em PT e não exige inventar nada). A única
   coisa descartada é a pontuação de fronteira (`;`/`—`/vírgula).

**Por que isto é honesto (e não reescrita).** A ferramenta não decide o corte — só oferece
fronteiras defensáveis, rotuladas "pontos de divisão possíveis · confira", e o resultado é
explicitamente um **rascunho** ("a frase final é sua"). O autor escolhe, aplica (com undo) e
**reanalisa**. A métrica dura "0 sugestões inseguras" se traduz aqui como **0 conteúdo
fabricado**: o split só remove pontuação e ajusta caixa; jamais insere ou apaga palavra.

**Fiação.** `narrative.ts` passou a **delegar** a `clauseSplitPoints` (removido o regex
duplicado); a nota (`revision-note.tsx`) transforma os candidatos em **botões** que chamam
`onSplit`, e `studio.tsx` aplica via `applySplitAt` + o mesmo `undo` das sugestões seguras. A
reanálise é automática (o `diagnostic` deriva de `text`).

**Consequências.** `Diagnostic`/`Finding`/`analyze()` inalterados — nenhum pass mudou, nenhum
snapshot do engine afetado (19 testes novos em `test/split-sentence.test.ts`, determinismo
byte-idêntico incluído). Novas funções puras reexportadas pelo barrel (`clauseSplitPoints`,
`applySplitAt`, `SplitPoint`). A camada `report/`/LLM continua fora de cena — Tier 2 é 100%
determinístico.

---

## ADR-013 — Tier 2 · andaime da voz passiva: papéis extraídos do texto (Agente/Ação/Objeto), nunca a reescrita

**Status:** aceito · Tier 2 (ação estrutural assistida — plano do handoff §3; cumpre a
"orientação assistida" prometida no ADR-011)

**Contexto.** A passiva **com agente** deixa de ser `requiresHuman` cega: o ADR-006 já
recusa a auto-conversão para ativa (reordenar sujeito/objeto + reconjugar = fora da garantia
mecânica) e o ADR-011 reafirmou isso, prometendo em troca um **andaime** ("agente → sujeito,
particípio → verbo"). Este ADR entrega esse andaime — como SINAL, jamais como reescrita.

**Decisão. Extrair os três papéis do texto e exibi-los rotulados "estrutura identificada,
confira"**, sem nunca montar a frase:
1. `passive-voice.ts` passou a gravar **offsets de papel** em `finding.meta`
   (`participleStart/End`; e, quando há agente, `agentMarkerStart/End`, `agentEnd`,
   `subjectStart`). Os offsets **já eram conhecidos** pelo matcher — só são registrados. A
   detecção (span/severidade/requiresHuman/justificativa) **não muda**.
2. `core/actions/passive-scaffold.ts` (puro) monta `{ agent, action:{participle, baseVerb},
   object }` a partir desses offsets + o texto:
   - **agente** = o sintagma após "pela/pelo…" (literal; vira o sujeito da ativa);
   - **ação** = o particípio literal + o verbo-base, quando ele está numa **tabela fechada**
     (`participios-infinitivo.pt.json`, chave = particípio masc. sing., normalização só de
     concordância regular de gênero/número — sem conjugador produtivo, disciplina ADR-011).
     Fora da tabela → `baseVerb: null` (mostra só o particípio; o verbo fica com o autor);
   - **objeto** = o **sujeito da passiva**, sintagma **antes de "ser"** ("O pedido foi
     aprovado…" → "O pedido"). Bounded (início da frase → âncora), mas **aproximado** (pode
     arrastar um adjunto inicial, ex. "Doravante,…") — por isso rotulado "confira"; `null`
     quando a frase começa no próprio verbo. Correção sobre o rascunho do plano ("entre ser
     e o particípio"): naquela região só cabem advérbios — o objeto real da ativa é o sujeito
     que precede "ser", e é ele que o andaime devolve.

**Por que é honesto (0 conteúdo fabricado).** Todo campo não-nulo é **substring literal** do
texto; nada é inventado. O verbo-base vem de tabela verificada à mão, nunca de flexão
produtiva. A ferramenta **não vira a frase** (segue o ADR-006), diz por quê, e o objeto
aproximado é explicitamente marcado "confira". Passiva **sem** agente não gera andaime —
retorna `null`, e a UI mantém a pergunta "quem praticou a ação?".

**Consequências.** `Finding.criterion/span/...` inalterados; só `meta` cresceu (proveniência
aditiva). Isso **alterou 4 snapshots** do `diagnostic-snapshot` (casos com passiva) — a
diferença é **exclusivamente as novas chaves de `meta`**, verificada linha a linha e
regenerada com justificativa (política ADR-009: mudança observável exige revisão explícita).
`integrated.test.ts` (semântica) e todos os demais testes seguem intactos. 9 testes novos em
`test/passive-scaffold.test.ts` (determinismo + "todo campo é substring literal"); os 3
`toEqual({hasAgent})` do `passive-voice.test.ts` viraram `toMatchObject` (a asserção-chave
`hasAgent` permanece; os offsets são aditivos). Zero rede/LLM — `core/actions/**`, coberto
pela cerca. Suíte completa verde (739).

---

## ADR-014 — Tier 3 · reescrita proposta e VERIFICADA: o verificador determinístico primeiro, LLM atrás da interface

**Status:** aceito · Tier 3, incremento 1 (contrato + verificador + stub; sem rede)

**Contexto.** O diferencial do Lucid (handoff §3): a geração (LLM) **nunca recebe confiança
cega — a engine determinística é o VERIFICADOR**. Antes de qualquer chamada de modelo, o
valor está no PIPELINE que julga uma proposta. Este incremento constrói exatamente isso, em
`report/**` (a única camada que conhece `core` e `probe`), 100% determinístico e **sem tocar
em rede** — a CI segue byte-idêntica.

**Decisão.**
1. **Seam `RewriteProposer`** (`report/rewrite/proposer.ts`): `propose(request) → RewriteProposal`.
   Só o **stub determinístico** (guiado por fixtures) entra no build; o proposer real (LLM,
   `temperature 0`, modelo/prompt versionados) fica atrás de flag e **não** é dependência —
   mesma disciplina da sonda (ARQUITETURA §5).
2. **Verificador `verifyRewrite`** (`report/rewrite/verify.ts`): reaplica `analyze()` ao texto
   reescrito e separa, POR CONSTRUÇÃO:
   - **PROVA** (determinística): `target_resolved` (a violação-alvo não reaparece no trecho),
     `no_new_findings` (`totalFindings` não aumenta), `numbers_preserved` e `dates_preserved`
     (multiconjuntos idênticos), `no_new_jargon` (nenhum termo do glossário introduzido).
   - **SINAL** (heurístico, nunca prova): `entities_preserved` (heurística de maiúscula/sigla)
     e `meaning_preserved` — a **SONDA como teste NEGATIVO** (se o leitor de piso extraía o
     fato do original e trava na proposta → bandeira). A sonda é opcional; sem ela o sinal é
     **omitido**, não inventado.
3. **Sonda religada** (`probe/interpret.ts` + `probe/stub-probe.ts`): `interpret` é puro e só
   emite `flag` ou `neutro` — **nunca `aprovado`** (I5). O stub é determinístico.
4. **Orquestrador `proposeAndVerify`**: Detecção (o `finding` da Camada 1) → Proposta → Verificação
   → `VerifiedRewrite` rotulado "gerada". **Nunca aplica** — a decisão é do autor.

**Honestidade (I5) codificada no TIPO.** `RewriteVerification` **não tem** campo
`approved`/`ok`/`passed` — um teste trava isso (`Object.keys` == `[hasBlockingFailure, metrics,
proofs, signals]`). `hasBlockingFailure` é um **veto mecânico** (alguma prova falhou), jamais o
oposto de aprovação: tudo passar = "nenhuma falha de piso detectada". A métrica dura vira
**0 conteúdo fabricado**: números/datas/entidades comparados literalmente; sonda só como piso.

**Consequências.** Nada em `core/**` mudou; a cerca segue intacta (`report/rewrite` importa
`core` + `probe`, permitido; depcheck ✔, 57 módulos). Novos: `report/rewrite/{types,proposer,
verify,index}.ts`, `probe/{interpret,stub-probe}.ts`. 23 testes novos (`rewrite-verify` +
`probe-interpret`), determinismo incluído; suíte 762 verde. **Fora deste incremento** (próximos):
o proposer LLM real (atrás de flag, com meta-eval de prompt/modelo) e a fiação na UI (cartão
"reescrita gerada" com PROVA/SINAL). O contrato e o juiz já estão prontos e testados.

---

## ADR-015 — Tier 3 · proposer LLM real: `Provider → modelos` server-side, o MESMO verificador julga todos

**Status:** aceito · Tier 3, incremento 3 (proposer real via Groq; sem benchmark ainda)

**Contexto.** O verificador determinístico (ADR-014) já julgava propostas, mas o único
proposer era o stub. Ideia do usuário (endossada): estruturar como **`Provider → modelos`**
para que o MESMO juiz determinístico avalie candidatos diferentes — melhor que "funciona com
qualquer LLM", porque gera dado comparável (benchmark honesto, fase seguinte).

**Decisão.**
1. **Abstração `ChatProvider`** (`report/rewrite/providers/`): só `complete(prompt, opts) →
   texto`, via `fetch` (sem SDK — não vira dependência do build). `GroqProvider` é a primeira
   implementação (REST compatível-OpenAI, `temperature 0`, allow-list de modelos). OpenAI/
   Anthropic/Gemini entram pela mesma interface depois.
2. **`LlmRewriteProposer`** — monta o prompt versionado (`prompt.ts`, `REWRITE_PROMPT_VERSION`,
   blindado contra invenção: reescreve só o trecho, preserva números/datas/nomes, responde só
   JSON), chama o modelo e extrai a reescrita. `id = "<provider>:<model>+<prompt@ver>"`
   (proveniência/anti-drift, e a coluna do futuro benchmark). Resposta ilegível → `proposed =
   original` (honesto; o verificador mostra o alvo não resolvido, não fabrica).
3. **Rota server-side** (`app/api/rewrite/route.ts`, `runtime nodejs`) — a chamada de LLM roda
   AQUI, nunca no browser: a `GROQ_API_KEY` fica no servidor e **jamais** volta ao cliente.
   Valida `model ∈ allow-list` (anti-injeção), cap de tamanho, chave ausente → 400. Roda
   `proposeAndVerify` e devolve o `VerifiedRewrite` já julgado.
4. **UI** — o cartão ganha um seletor de modelo (stub + modelos Groq) e mostra o `proposerId`
   como proveniência. Stub segue client-side (offline/demo); Groq via a rota.

**Modelos (free tier desta conta Groq).** DeepSeek **não** está no catálogo desta conta e
`qwen/qwen3.6-27b` (raciocínio) falha no modo JSON — ambos ficam de fora por ora. Habilitados,
todos confirmados retornando JSON válido com `temperature 0`: `llama-3.3-70b-versatile`,
`llama-3.1-8b-instant`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`. Spread suficiente para o
benchmark honesto.

**Honestidade.** O verificador é o mesmo — nenhum modelo recebe "aprovação"; a métrica agregada
do benchmark (fase seguinte) será "propostas sem veto mecânico"/"% que passam todas as PROVAS",
**nunca "taxa de aprovação"**. O LLM só propõe; a engine determinística decide.

**Consequências.** `core/**` intacto; a cerca segue (o depcheck só proíbe rede em `core` — `report`
pode fazer rede; `app/api → report` permitido; 64 módulos, 0 violações). Chaves só server-side,
`.env` (`GROQ_API_KEY`) gitignorado. 9 testes novos com `MockChatProvider` (offline, CI
byte-idêntica); nenhum teste toca a rede. Verificado ao vivo no browser (Llama 3.3 70B: PROVA
5/5, total 13→10, Flesch-PT +9.7). **Fora deste incremento:** o harness de benchmark (rede/custo),
e outros providers (OpenAI/Anthropic/Gemini) pela mesma interface.

---

## ADR-016 — Tier 3 · reescrita LIVRE (contexto do documento, alvo por parágrafo) + sonda de sentido real; infra de LLM em `src/llm`

**Status:** aceito · Tier 3, incremento 4 (o salto de "corrigir" para "reescrever")

**Contexto.** A reescrita span-local por finding, com prompt tímido, só trocava palavras e
dividia frases — preservava a arquitetura do texto jurídico. O salto real (mostrado pelo
usuário com um exemplo do GPT) é **reorganizar o discurso e condensar semanticamente**. Isso
não contradiz o Lucid: a engine não precisa obrigar estrutura, só provar invariantes na saída.
Mas as PROVAS determinísticas **não provam significado** — reescrita livre é onde o sentido
escorrega (o exemplo do GPT inventou um "nós"). Logo: liberdade **sim**, com (1) prompt que
proíbe inventar agente/informação, (2) **sonda real** como guard de sentido, (3) resultado
sempre "gerada — passou nas provas, revise", nunca "aprovada".

**Decisão.**
1. **Alvo generalizado de `finding` → `Span`.** `RewriteRequest = { text, target, criterion? }`:
   `text` é o documento inteiro (CONTEXTO), `target` é o trecho a reescrever (parágrafo ou a
   frase de um finding). `proposeAndVerify`/`verifyRewrite` recebem `target: Span`.
2. **`rewrite@2`** — o modelo lê o documento inteiro e reescreve **só o alvo**, com liberdade
   para reorganizar/condensar/mudar estrutura; blindagem forte: **não inventar informação nem
   quem praticou a ação** ("não crie 'nós'").
3. **Verificação generalizada** — nova prova `region_improved` (findings sobrepondo o trecho
   não aumentam); `target_resolved` só quando há `criterion` (caminho finding). Resto igual.
4. **Sonda REAL** — `probe/prompt.ts` (leitor sintético do CLAUDE.md, versionado) +
   `probe/llm-probe.ts` (`LlmComprehensionProbe` sobre `ChatProvider`; parse pessimista). A
   rota a constrói (Groq) com uma pergunta de piso genérica; o SINAL `meaning_preserved` agora
   é populado de verdade (teste NEGATIVO).
5. **Infra de LLM em `src/llm` (neutro).** `ChatProvider`/`GroqProvider` saíram de
   `report/rewrite/providers` para `src/llm` — assim `report` E `probe` importam a infra de
   rede sem inverter a cerca. Nova regra no dependency-cruiser: `core/**` ⊄ `src/llm` (core
   segue zero-rede; `src/llm` é a única casa de rede compartilhada).
6. **UI** — o cartão reescreve o **parágrafo** que contém o finding (via `paragraphSpanAt`),
   para **qualquer** finding; aplica o parágrafo (undo). Mostra PROVA/SINAL (agora com sentido).

**Achado da verificação ao vivo (honesto).** GPT-OSS 120B reescreveu um parágrafo-monstro
(Flesch **-106,8 → 20,4**) — mas o verificador **VETOU** (`region_improved`/`no_new_findings`:
findings 1 → 3) e o modelo **inventou o "nós"** apesar do prompt proibir. Ou seja: o juiz
determinístico não se deixa seduzir por prosa fluente. Duas limitações reais registradas para
os próximos ADRs: (a) contagem crua de findings é BLUNT para reescrita radical (dividir uma
mega-frase em 3 boas pode "piorar" a contagem) → avaliar **veredito ponderado por severidade**;
(b) **agente inventado em 1ª pessoa** não é pego por entidade/sonda → avaliar uma prova
determinística de "verbos/pronomes de 1ª pessoa novos".

**Consequências.** `core/**` intacto e zero-rede (cerca reforçada). 782 testes verdes (mock
provider + mock/real-parse probe; rede nunca na CI). O contrato honesto (I5) permanece: veto
mecânico reprova, passar ≠ aprovação.

---

## ADR-017 — Tier 3 · duas estratégias de prompt (corrigir × reescrever) + benchmark de SISTEMAS

**Status:** aceito · Tier 3, incremento 5 (testar a hipótese certa antes de generalizar)

**Contexto.** A pergunta não é "qual texto ficou mais fácil", e sim "**qual SISTEMA** — modelo
+ estratégia de prompt + o que a engine consegue provar/sinalizar — entrega melhor reescrita
COM melhor garantia". Para isso é preciso comparar, sob o mesmo verificador, duas hipóteses de
prompt: (1) **corrigir** o finding com mínima alteração; (2) **reescrever do zero** para o
cidadão, com liberdade de reorganizar.

**Decisão.**
1. **Eixo de estratégia** (`prompt.ts`): `RewriteStrategy = "correct" | "rewrite"`, cada uma
   versionada (`correct@1`, `rewrite@2`). `correct` mantém estrutura/ordem e troca o mínimo;
   `rewrite` reorganiza/condensa livremente. **As duas são igualmente blindadas** contra
   invenção (fato, agente/"nós", número, data, nome). `LlmRewriteProposer(provider, model,
   strategy)` — o "sistema" é `provider:model+estratégia@versão`, que vira o id/proveniência.
2. **Benchmark de sistemas** (`test/rewrite-benchmark.test.ts`, `describe.runIf(BENCHMARK)` —
   fora da CI, rede real). Para cada (modelo × estratégia) sobre um golden de parágrafos,
   agrega as **6 dimensões pedidas**: clareza (ΔFlesch/Δpalavras), fidelidade semântica (sonda
   como teste negativo), findings restantes, provas determinísticas preservadas
   (números/datas/jargão), sinais de deriva (sentido + nome perdido), custo/latência (ms +
   tokens reais do Groq). Compara SISTEMAS COMPLETOS: reescrita + o que cada um prova/sinaliza.
3. **Resiliência** (`GroqProvider`): retry limitado só em 429 (rate limit), respeitando o
   `retry-after`/"try again in Xs" — necessário no free tier (6000 TPM) e útil na rota real.
   `lastUsage` (tokens) exposto para o benchmark medir custo.

**Honestidade.** A agregação é "**% sem veto mecânico**" e "**% com provas preservadas**",
NUNCA "taxa de aprovação" — o benchmark mede o que a engine PROVA/SINALIZA, coerente com o I5.

**Consequências.** `core/**` intacto; UI inalterada (a estratégia é do proposer/benchmark; sem
mudança de UI nem revisão por bloco, conforme pedido). Default `rewrite` mantém o comportamento
atual. Suíte offline 783 verdes + 1 benchmark skipado; benchmark roda manual com
`BENCHMARK=1`. Resultados da execução ao vivo: ver docs/HANDOFF.md.

---

## ADR-018 — Tier 3 · veredito PONDERADO POR SEVERIDADE (não por contagem crua de findings)

**Status:** aceito · Tier 3, incremento 6 (destrava a reescrita radical boa)

**Contexto.** O benchmark do ADR-017 mediu a tensão: a estratégia `rewrite` é MUITO mais clara
(ΔFlesch +68/+75 vs +2/+4) mas era **vetada 33–67%** das vezes, contra 100% sem-veto do
`correct`. A causa é mecânica: `region_improved`/`no_new_findings` usavam **contagem crua** de
findings — e dividir uma frase-monstro (1 `error`) em três frases boas (3 `warning`s) "aumenta"
a contagem, disparando o veto, mesmo sendo uma melhora clara de leitura.

**Decisão. Trocar contagem por PESO POR SEVERIDADE** (`verify.ts`): cada finding vale
`error: 3`, `warning: 1`, `info: 0,3`. `region_improved` e `no_new_findings` passam quando o
**peso** não aumenta (com epsilon de ponto flutuante). Assim:
- 1 `error` → 3 `warning`s: peso 3 → 3, **empata (passa)** — a reescrita radical deixa de ser
  vetada só por partir uma frase.
- 1 `error` → 4 `warning`s, ou 1 `warning` → 3 `warning`s: peso sobe, **veta** — criar mais
  problema continua inaceitável.

O ratio (`error ≈ 3 warning`) é **defensável, não afinado ao benchmark**: `error` = "prioritário"
(o leitor provavelmente falha), `warning` = "atenção" (mais difícil, mas gerenciável), `info` =
quase-ruído. Documentado no código.

**Honestidade (I5) intacta.** Continua um VETO MECÂNICO (peso subiu → inaceitável), não um selo:
peso não-subir = "sem falha de piso", jamais "aprovado". As provas de corrupção
(números/datas/jargão) seguem intactas e independentes.

**Consequências.** `core/**` inalterado; só `verify.ts` (helper de peso + duas provas) e um teste
novo travando "1 erro → 2 avisos passa region_improved" (a contagem subiria 1→2, o peso cai
3→2). O caminho finding-específico ainda usa `target_resolved` (a violação exata deve sumir);
o peso rege o caminho de PARÁGRAFO (o da UI e do benchmark). Efeito medido: ver ADR-017 §
re-execução no HANDOFF. Próximo: prova determinística de 1ª pessoa nova (pega o "nós").

---

## ADR-019 — Tier 3 · o veto impede AUTOAPLICAÇÃO, não o autor; reescrita de parágrafo julgada só pelo peso da região

**Status:** aceito · Tier 3, incremento 7 (correção de escopo do veto)

**Contexto.** Uma dúvida do usuário expôs que eu havia **misturado três decisões** em uma. Os
invariantes do produto são DOIS: (a) **nunca autoaplicar**; (b) **nunca dar selo verde**. Eu
tinha acrescentado um terceiro, indevido: **bloquear a aplicação MANUAL** quando uma prova
falha (`disabled={blocked}` no botão "Usar como rascunho"). Isso torna o verificador um porteiro
absoluto sobre o humano — o oposto da identidade do produto ("marca, não decide por você; a
decisão é do autor"), ainda por cima sobre um mero RASCUNHO que a engine re-audita.

**Decisão.**
1. **O veto não bloqueia o autor.** Removido o `disabled`. Com prova falhada, o botão vira
   **"Usar mesmo assim como rascunho"** (estilo de alerta) — um **override deliberado**. A
   ferramenta segue sem autoaplicar e sem atestar; só informa PROVA/SINAL. `hasBlockingFailure`
   passa a significar "bloqueia AUTOAPLICAÇÃO e é bandeira vermelha", **não** "proíbe o humano".
2. **Reescrita de PARÁGRAFO julgada só pelo peso da região.** A UI parou de passar
   `finding.criterion` ao gerar/verificar um parágrafo — logo `target_resolved` (exigir que UM
   critério específico suma) não roda no caminho de parágrafo; valem `region_improved` (peso por
   severidade, ADR-018) + as provas de corrupção. Coerente: o autor reescreve o parágrafo, não
   conserta um finding isolado. `target_resolved` continua disponível para um caminho
   finding-específico (quando `criterion` é passado).

**Honestidade (I5) intacta.** Nada aqui afrouxa a e (b): continua sem autoaplicação e sem selo.
O que muda é NÃO usurpar a soberania do autor sobre um rascunho.

**Consequências.** Só UI (`revision-note.tsx`): botão condicional + cópia honesta, e a chamada
de geração sem `criterion`. Engine/verificador inalterados; provas idênticas sobre o MESMO
trecho (o parágrafo) em gerar/verificar/aplicar. Sem mudança de teste (a suíte não fixava o
`disabled`). Próximo: prova determinística de 1ª pessoa nova.

---

## Referência cruzada

Cada ADR aqui corresponde a uma decisão já fechada em `docs/ARQUITETURA.md`:
ADR-001 ↔ §6.1, ADR-002 ↔ §8, ADR-003 ↔ §11. ADR-004 é uma revisão de implementação
dentro do escopo já previsto em §6.5/§9 (Fase 1, item 4), não uma decisão arquitetural
nova. ADR-005 é uma refatoração transversal de nomenclatura, sem mudança de
comportamento — os tipos/campos citados em §3/§4 de `ARQUITETURA.md` já refletem os
nomes em inglês. ADR-006 e ADR-007 são revisões de implementação dentro do escopo
previsto em §6.2/§6.3/§9 (Fase 1, itens 7–8) — a decisão-mãe "regras + léxico, sem
parser" já estava em ADR-001; ADR-006/ADR-007 detalham como ela se aplica a cada
critério linguístico. ADR-009 é a etapa de consolidação prevista em §9 (Fase 1, itens
10–11): golden set integrado + snapshots + suíte de determinismo/ordenação/proveniência;
não altera nenhuma heurística nem a API pública, só trava o comportamento observável e
documenta a convenção de offset (§3.2) e a política de snapshot (§8). ADR-008 restringe
o escopo de §6.4/§9 (Fase 1, item 9): o
mecanismo de raridade por frequência previsto ali fica fora do runtime desta etapa —
`ARQUITETURA.md` já foi atualizado com uma nota curta em §6.4 registrando essa
restrição, para as duas fontes não se contradizerem. Este arquivo não deve contradizer
`ARQUITETURA.md`; se um conflito aparecer, `ARQUITETURA.md` é a fonte de verdade e este
log deve ser corrigido para acompanhá-lo.
