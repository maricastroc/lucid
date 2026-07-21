# Lucid — Handoff de sessão (estado atual + próximos passos)

> Documento de continuidade. Para retomar numa sessão nova: **leia este arquivo primeiro**,
> depois `CLAUDE.md` (identidade do produto) e `docs/DECISOES.md` (ADRs). Última atualização
> ao fim da sessão de 2026-07-21.

---

## 1. O que é o Lucid (1 parágrafo)

Motor **determinístico** de auditoria de Linguagem Simples (ABNT NBR ISO 24495-1:2024).
Camada 1 (linter, zero LLM, zero rede) detecta violações, pontua e **só sugere quando a
troca é mecanicamente segura**; o resto é marcado como decisão humana. Identidade:
**instrumento honesto — marca em vez de inventar.** Detalhes em `CLAUDE.md`.

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

- **Tier 2 · Ação estrutural assistida** — determinístico, **construir primeiro** (zero rede):
  - Frase longa: **decompor em cláusulas** + o usuário escolhe um ponto e o Lucid **insere a
    quebra** (ponto final + maiúscula) devolvendo um rascunho que o autor revisa e re-analisa.
  - Passiva com agente: extrair **Agente / Ação / Objeto** (agente = "pela X"; ação =
    particípio→verbo-base; objeto = sintagma entre "ser" e o particípio — **andaime aproximado**,
    rotular como "estrutura identificada, confira", não como exato).

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

## 4. DECISÃO PENDENTE (o usuário ainda não respondeu)

1. **Eu concluo a migração editorial**
2. **contrato do Tier 3** (`RewriteProposer` + pipeline de verificação determinística no `report/` + stub) — independe do visual.

E confirmar: **Tier 2 agora, Tier 3 como fase desenhada em seguida.**

---

## 5. Guardrails (não violar)

- Camada 1: zero LLM, zero rede, saída byte-idêntica. Não importar nada de `probe/`/`report/` no `core/`.
- Nunca inventar: sem sugestão insegura; na dúvida, marca e devolve ao humano.
- LLM só na Camada 2, atrás de flag, com stub determinístico nos testes; verificação = piso, nunca selo.
- Toda mudança de dado/heurística: ADR + entrada no golden + eval mostrando **0 sugestões inseguras**.
- Rodar sempre no fim: `npm run test && npm run typecheck && npm run lint && npm run depcheck`.
