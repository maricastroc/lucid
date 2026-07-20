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
