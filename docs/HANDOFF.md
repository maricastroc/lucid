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

**Falta no Tier 3 (próximos incrementos):**
- **Harness de benchmark** — roda um golden de reescritas por cada modelo e agrega "% que
  passam todas as PROVAS determinísticas" (NUNCA "taxa de aprovação"). Roda manual (rede/custo),
  fora da CI. Tabela pro README.
- **Outros providers** — OpenAI/Anthropic/Gemini pela mesma interface `ChatProvider`. (`.env`
  já tem `GEMINI_API_KEY`; a linha `DEEPSEEK_AP_KEY` está com typo — falta o "I".)
- **Sonda real** (`probe/llm-probe.ts`) para ligar o SINAL de sentido no verificador.

---

## 5. Guardrails (não violar)

- Camada 1: zero LLM, zero rede, saída byte-idêntica. Não importar nada de `probe/`/`report/` no `core/`.
- Nunca inventar: sem sugestão insegura; na dúvida, marca e devolve ao humano.
- LLM só na Camada 2, atrás de flag, com stub determinístico nos testes; verificação = piso, nunca selo.
- Toda mudança de dado/heurística: ADR + entrada no golden + eval mostrando **0 sugestões inseguras**.
- Rodar sempre no fim: `npm run test && npm run typecheck && npm run lint && npm run depcheck`.
