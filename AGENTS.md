# PLAIN-LINT — Brief de arranque (Codex)

> Nome de trabalho. Candidatos na linha MC-INSTRUMENT: **Lucid**
> Este arquivo serve como prompt de abertura pro Codex **e** como `AGENTS.md` do repo (contexto persistente).

---

## O que é

Um instrumento que **diagnostica** um texto contra os critérios de Linguagem Simples, **pontua** cada critério, **aponta** cada trecho ao princípio que ele viola, e **verifica** as reescritas propostas pelo autor ou pela IA — cada apontamento carimbado com o critério que disparou. **A engine nunca escreve nem aplica texto (ADR-054)**: quando existe equivalente curado 1:1 (glossário), ela o exibe como informação; quem escreve é sempre o autor — ou a IA, que ela então julga.

Não é um botão de "devolve o texto pronto". Linguagem Simples é ofício humano (modelar o leitor, decidir o que entra e o que sai, arquitetar a informação). O papel da ferramenta é tornar os critérios **visíveis e mensuráveis**, e recusar honestamente o que exige julgamento humano em vez de fingir que resolve.

Identidade: instrumento honesto. Mede e expõe. **Marca em vez de inventar.**

---

## Princípio inegociável (a fronteira)

Duas camadas, com uma cerca dura entre elas:

- **Camada 1 — Linter determinístico.** 100% determinístico, **zero LLM**, zero rede. Mesma entrada → saída byte-idêntica. É o núcleo e é o produto.
- **Camada 2 — Sonda de compreensão sintética.** Usa LLM, mas **estritamente como teste negativo** (piso, não selo). Isolada atrás de uma interface, opt-in, desligável. Nunca toca no texto. Nunca reescreve.

Regras que o código tem que garantir:
1. O LLM **nunca** reescreve, sugere reescrita ou "melhora" texto. Só lê e reporta.
2. A sonda **nunca** produz um check verde. Um "passou no piso" é *ausência de uma falha específica*, jamais evidência positiva de compreensão.
3. A Camada 1 não importa nada da Camada 2. Se a Camada 2 cair, o produto continua inteiro.

---

## Fonte canônica dos critérios

**A autoridade dos `principle` é a norma ABNT NBR ISO 24495-1:2024** — "Linguagem Simples — Parte 1: Princípios e diretrizes norteadores", adoção brasileira idêntica da ISO 24495-1:2023. Disponibilizada gratuitamente. Os guias governamentais (LAB.mg, gov.br, TCE-PE, Rede Nacional de Linguagem Simples) servem só como fonte de **exemplos e glossário jargão→comum**, nunca como origem dos princípios.

A norma tem quatro princípios, cada um com diretrizes numeradas. O campo `principle` de cada finding deve citar **o número da subseção** (ex.: `"5.3.4"`), que é a citação canônica que qualquer profissional de LS reconhece:

| Princípio | Nome | Foco | Seção |
|---|---|---|---|
| 1 | Relevante | leitor obtém o que precisa (modelar leitor, cortar o supérfluo) | 5.1 |
| 2 | Localizável | encontra com facilidade (estrutura, títulos, listas, hierarquia) | 5.2 |
| 3 | Compreensível | entende (palavra familiar, frase clara/concisa, uma ideia, voz ativa) | 5.3 |
| 4 | Usável | consegue usar — **avaliação com leitores reais** | 5.4 |

**A norma diz explicitamente que Linguagem Simples se apoia no sucesso do leitor, não em fórmulas mecânicas de leiturabilidade.** Isso não enfraquece a ferramenta — define a divisão de trabalho dela:

- **Camada 1 (linter)** cobre os **Princípios 2 e 3** — os mecanicamente checáveis. É onde a regra é forte.
- **Flags `requiresHuman`** cobrem o **Princípio 1** — trabalho de autor *antes* de escrever, que nenhuma regra adivinha.
- **Sonda de compreensão sintética** é o proxy automatizado do **Princípio 4**. A norma canoniza "testar com leitores" como o único jeito de ter certeza; a sonda é a versão-piso barata *antes* do teste humano — o fato de ser só piso é alinhamento com a norma, não desculpa.

Mapeie cada critério do linter à subseção que ele afere (tabela abaixo, na Camada 1). Assim o `principle` nunca é inventado.

**Aviso de escopo (setor público):** a Lei 15.263/2025 (Política Nacional de Linguagem Simples, em vigor) embute uma proibição de "linguagem neutra" que **não** faz parte da técnica nem da norma ABNT. O linter segue a **norma** (os quatro princípios). Não misturar a cláusula política dentro dos critérios técnicos.

---

## Camada 1 — Linter determinístico (construir primeiro)

Um pipeline de *passes*. Cada pass aplica uma categoria de critério e **emite proveniência** por ocorrência. A saída não é texto reescrito: é `texto + diagnóstico anotado + placar`.

### Critérios do MVP (começar com 4–5, nesta ordem)
Cada critério traz a subseção da norma que ele afere — é esse o valor do campo `principle`.
1. **Comprimento de frase** (`5.3.4` — frases concisas) — limiar configurável (ex.: alerta > 20 palavras, erro > 30). Fácil, alto valor, 100% determinístico.
2. **Voz passiva** (`5.3.3` — frases claras, quem faz o quê) — detecção morfossintática (`ser`/`estar` + particípio). Flag; se o agente foi omitido, marcar `requiresHuman` (não dá pra ativar sem inventar quem agiu).
3. **Nominalização** (`5.3.3`/`5.3.4`) — verbo pesado escondido em substantivo (`-ção`, `-mento`, `-ância` + verbo leve: "fazer a análise de" → "analisar"). Mapeamento único (curadoria) ⇒ `requiresHuman: false` e verbo-base informado; a engine **não compõe** a troca (ADR-054).
4. **Jargão / termo incomum** (`5.3.2` — palavras familiares) — cruza contra (a) léxico de termos técnicos do domínio e (b) lista de frequência do PT-BR. Equivalente do glossário exibido como **informação** só quando único e seguro — a engine indica, nunca troca; sentido múltiplo ("banco", "manga") → sinaliza, sem equivalente.
5. **Legibilidade** (`5.4` — sinal de apoio, não selo) — usar o **Flesch adaptado ao PT-BR de Martins et al. (1996)**, não o Flesch do inglês. Para as demais métricas de complexidade, reusar o **NILC-Metrix** (nilc-nlp/nilcmetrix, ~200 métricas, linhagem PorSimples/USP) em vez de recalcular pesos. Reportar antes/depois pra provar que ficou mais simples, não só diferente. **Sempre subordinar a métrica aos Princípios 2–3: leiturabilidade boa não é aprovação.**

### Critérios da fase 2
- Densidade de subordinação (orações por frase).
- Enumeração em prosa onde caberia lista.
- Título que não responde à pergunta do leitor (heurística fraca → flag, nunca score).
- Fala direta ao leitor (2ª pessoa) ausente onde é esperada.

### Formato de proveniência (por ocorrência)
```ts
// Nomenclatura interna do código em inglês (nomes de tipos/campos/ids) — as mensagens
// produzidas para o usuário final (ex.: `justification`) continuam em português.
type Finding = {
  criterion: string;         // "long_sentence"
  category: "lexical" | "syntactic" | "structural" | "metric";
  principle: string;         // subseção da ABNT NBR ISO 24495-1:2024, ex. "5.3.4"
  span: { start: number; end: number; text: string };
  severity: "info" | "warning" | "error";
  suggestion?: string;       // só equivalente curado 1:1, informativo — a engine nunca aplica (ADR-054)
  requiresHuman: boolean;    // true = a ferramenta se recusa a resolver
  justification: string;     // por que este trecho viola este critério (texto em PT-BR)
};
```

### Decisão técnica a resolver logo
Detecção de passiva e nominalização em PT precisa de **alguma análise morfológica**. Opções, do mais leve pro mais robusto: (a) regras + léxico de particípios/sufixos (determinístico, zero-dep, teto menor), (b) POS tagger leve embutido. **Preferir (a) no MVP** — mantém o núcleo auditável e sem dependência pesada. Registrar a escolha no `AGENTS.md`.

---

## Camada 2 — Sonda de compreensão sintética (bounded, opt-in)

**Contrato.** Entrada: `trecho` + `pergunta que o leitor veio fazer` + `persona de piso` (leitor de baixa literacia). Saída: se o leitor sintético extrai o fato certo, e **onde trava** — nunca uma nota de aprovação.

**Interpretação válida (a única):**
- Sonda **falha** em extrair o fato → sinal forte: "se nem o LLM responde a partir deste parágrafo, o humano não responde". Vira flag vermelha no diagnóstico.
- Sonda **consegue** → **não é sinal positivo**. Renderizar como neutro: "sem violação de piso detectada (não é garantia de compreensão)".

**Blindagem do prompt.** O risco fatal é o LLM *preencher lacunas* — usar conhecimento de mundo e inferência pra "adivinhar" o que o texto quis dizer. Isso é exatamente o que o leitor real não faz. O prompt força leitura **literal e local**, sem conhecimento externo, e obriga a reportar o ponto de travamento.

**Sinal secundário (opcional — operações de leitura).** Além do binário, pedir pra sonda listar as *operações* que teve que executar pra montar a resposta (resolver referente a distância, integrar informação entre frases, decodificar termo técnico, inferir agente omitido, segurar sujeito longo antes do verbo, desfazer dupla negação). Essas operações são proxy de **carga de leitura** mesmo quando o LLM não sofre com elas — o que transforma o leitor de alta escolaridade num sensor honesto de *demanda estrutural do texto*, sem violar a regra do piso. Alimenta o diagnóstico; não vira selo.

**Determinismo da Camada 2:** `temperature: 0`, modelo fixado e versionado, prompt versionado. Não é byte-determinística como a Camada 1, mas reprodutível o bastante pra eval. Deixar isso explícito na UI.

---

## Regra de UI que não pode ser violada

- A Camada 1 mostra placar por critério + diagnóstico anotado (cada trecho clicável → o critério e a justificativa).
- Equivalentes curados (informativos, sem botão de aplicar) vêm carimbados com o critério; `requiresHuman: true` vira um cartão separado "exige decisão humana" (reorganização pro leitor, corte do supérfluo, agente omitido) — a ferramenta **não** resolve, e diz por quê.
- A sonda vive num painel à parte, sempre com o caveat. **Sem check verde. Nunca.** Passar no piso = ausência de uma falha, não sucesso.

---

## O prompt do leitor sintético (runtime)

```
Você é um leitor que lê EXATAMENTE o que está escrito, e nada além.

Regras absolutas:
- Responda usando SOMENTE a informação presente no trecho abaixo.
- NÃO use conhecimento de mundo, contexto externo, nem suposições.
- NÃO preencha lacunas. Se o texto não diz, a resposta é "o texto não diz".
- NÃO seja generoso nem caridoso com o texto. Se está ambíguo, trave.
- Se para responder você precisou juntar informação de mais de uma frase,
  ou resolver a quem se refere um pronome, ou inferir algo implícito, isso
  conta como trava — reporte.

TRECHO:
"""
{trecho}
"""

PERGUNTA QUE O LEITOR VEIO FAZER:
{pergunta}

Responda SOMENTE com este JSON, sem texto fora dele:
{
  "pode_responder": true | false,
  "resposta_extraida": "o fato exato tirado do texto, ou 'o texto não diz'",
  "onde_travou": [
    { "frase": "trecho literal onde travou", "motivo": "por que travou aqui" }
  ],
  "operacoes_de_leitura": [
    "resolver_referente_a_distancia" | "integrar_entre_frases" |
    "decodificar_termo_tecnico" | "inferir_agente_omitido" |
    "segurar_sujeito_longo" | "desfazer_negacao_aninhada"
  ],
  "precisou_inferir": true | false
}
```

Interpretação no código: `pode_responder=false` ou `precisou_inferir=true` → flag. `pode_responder=true` **nunca** vira aprovação — só neutro. `operacoes_de_leitura` alimenta o sinal de carga estrutural.

---

## Disciplina de eval

- **Golden set:** conjunto de trechos rotulados à mão (simples / não-simples, e a pergunta do leitor pra cada um). Serve pros dois lados.
- **Determinismo da Camada 1:** snapshot tests — mesma entrada tem que produzir saída **byte-idêntica**. Qualquer não-determinismo é bug.
- **Meta-eval da sonda:** a sonda tem que travar onde os humanos travaram. Medir concordância com os rótulos. Prompt e modelo versionados; regressão quebra o build.
- **Anti-drift:** modelo fixado, `temperature: 0`, prompt sob versionamento. Trocar qualquer um → rodar a meta-eval de novo.

---

## Stack e escopo do MVP

- **TypeScript.** Biblioteca central (pura, testável) + CLI fina + (depois) camada web (Next.js) reaproveitando a lib.
- **Camada 1 sem rede e sem LLM.** Idealmente sem dependência pesada; no máximo uma lista de frequência PT-BR e um léxico de particípios/nominalizações como dados.
- **Camada 2 atrás de uma interface** (`ComprehensionProbe`), com implementação real e um *stub* determinístico pros testes. Desligável por flag.

**Fazer primeiro:** Camada 1 com os critérios 1–5 + proveniência + placar + snapshot tests. Sonda como stub atrás da flag.
**Não fazer agora:** polimento de UI, reescrita automática (nunca), Camada 2 antes da Camada 1 estar sólida.

---

## Guardrails pro Codex (o que NÃO fazer)

- ❌ Deixar a **engine** escrever, montar ou aplicar texto no documento — conversão de voz, composição de sugestão, divisão de frase, aplicação em lote (ADR-054). Ela detecta, explica, pergunta e verifica.
- ❌ Deixar o LLM da **sonda** reescrever, sugerir reescrita ou "melhorar" texto — a sonda só lê e reporta. (A reescrita por IA do Tier 3 — ADR-019 — existe como PROPOSTA: sempre verificada pela engine e aplicada só por decisão do autor.)
- ❌ Produzir check verde / nota de aprovação a partir da sonda.
- ❌ Fazer a Camada 1 importar qualquer coisa da Camada 2, ou tocar em rede/LLM.
- ❌ Trocar silenciosamente palavra de sentido múltiplo — sinalizar.
- ❌ Ativar passiva sem agente explícito — marcar `requiresHuman`.
- ✅ Todo finding cita um critério e traz justificativa.
- ✅ Toda saída da Camada 1 passa em snapshot byte-idêntico.
- ✅ O que exige julgamento humano é marcado como tal, não resolvido.

---

### Referência de domínio

**Fonte canônica (princípios):** ABNT NBR ISO 24495-1:2024 = ISO 24495-1:2023. Quatro princípios + Anexo B (lista de verificação). Gratuita.

**Lei em vigor:** Lei 15.263/2025 — Política Nacional de Linguagem Simples (três poderes, todas as esferas, desde 17/11/2025). Contexto de mercado: Pacto Nacional do Judiciário pela Linguagem Simples e Selo Linguagem Simples (CNJ).

**Ferramentas a reusar (não reconstruir):**
- **NILC-Metrix** (nilc-nlp/nilcmetrix, GitHub) — ~200 métricas de complexidade/coesão, linhagem PorSimples/USP (grupo Sandra Aluísio). Base do placar métrico.
- **Flesch-PT de Martins et al. (1996)** — a adaptação correta do índice Flesch pro PT-BR.
- **Simplifica** (NILC) — referência de UX de autoria assistida guiada por leiturabilidade.
- **legibilidade.com (ALT)** e **Maudy** — verificadores de legibilidade PT prontos, úteis como baseline de comparação.

**Guias (só exemplos e glossário, não princípios):** "Linguagem Simples na Gestão Pública" (LAB.mg), manual gov.br (Roedel), manual TCE-PE, Rede Nacional de Linguagem Simples Brasil.

**A brecha:** as ferramentas existentes param na métrica de legibilidade. Nenhuma faz diagnóstico anotado por-critério-da-norma + proveniência + sonda de compreensão. Reusar a parte métrica; construir a parte linter+proveniência+sonda.
