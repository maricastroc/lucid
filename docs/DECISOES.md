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

## Referência cruzada

Cada ADR aqui corresponde a uma decisão já fechada em `docs/ARQUITETURA.md`:
ADR-001 ↔ §6.1, ADR-002 ↔ §8, ADR-003 ↔ §11. ADR-004 é uma revisão de implementação
dentro do escopo já previsto em §6.5/§9 (Fase 1, item 4), não uma decisão arquitetural
nova. Este arquivo não deve contradizer `ARQUITETURA.md`; se um conflito aparecer,
`ARQUITETURA.md` é a fonte de verdade e este log deve ser corrigido para acompanhá-lo.
