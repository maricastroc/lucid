# ADR (rascunho) — D1: fonte do dicionário morfológico

> **Status:** DECIDIDO (fecha a decisão D1 aberta em `DESIGN-camada-anotacao.md` §8). Vira entrada
> em `docs/DECISOES.md` (ADR-0xx) na implementação.
> **Decisão em uma linha:** base = **PortiLexicon-UD** (CC-BY 4.0, tagset Universal Dependencies);
> suplemento de cobertura opcional = **MorphoBr** (Apache-2.0); **overrides curados próprios** por
> cima. Rejeitados DELAF-PB (LGPL) e Apertium-por (GPL) por copyleft.

---

## 1. Contexto

A Opção B da camada de anotação (`DESIGN-camada-anotacao.md`, D0) exige um **dicionário de formas
plenas** do PT-BR, finito e auditável. D1 era: **de onde vem?** O híbrido já foi escolhido pela
usuária (reusar aberto + overrides próprios); faltava **qual** léxico-base. Levantei os quatro
candidatos reais de PT-BR com fontes primárias (licença é consequência jurídica — não se chuta).

---

## 2. Os candidatos (levantados, com fonte)

| Léxico | Licença | Cobertura | Formato | Tagset | Origem |
|---|---|---|---|---|---|
| **PortiLexicon-UD** | **CC-BY 4.0** | 1.221.218 entradas | tabular (forma, POS, lema, traços); **1 análise por linha** | **Universal Dependencies** | ICMC-USP, 2022 |
| **MorphoBr** | **Apache-2.0** | ~9M formas (hint Foma) | `forma⇥lema+POS+traços` (ex.: `fortinho⇥forte+A+DIM+M+SG`), por classe | custom (Foma/FST) | LR-POR, 2018 |
| DELAF-PB (Unitex-PB) | **LGPL-2** | ~9M pares palavra-análise (v2 2015, já no Acordo de 1990) | DELAF (`forma,lema.POS+subcat:traços`) | custom (Unitex) | NILC-USP |
| Apertium-por | **GPL** | FST por stems (cobertura por par de línguas) | monodix XML → lttoolbox | Apertium | Apertium |

Observações que decidem:
- **Licença.** Para um produto (mercado da Lei 15.263, possivelmente comercial), **permissiva
  remove toda dúvida** sobre distribuir o dado embutido. `CC-BY 4.0` (PortiLexicon) e `Apache-2.0`
  (MorphoBr) são seguras. `LGPL-2` (DELAF) e `GPL` (Apertium) são copyleft — sobre *dado* a
  situação é nebulosa e arriscada; descarto por precaução, apesar da cobertura maior.
- **Tagset.** PortiLexicon usa **Universal Dependencies** — exatamente o que o
  `DESIGN-camada-anotacao.md` §5 já propôs (POS UD-like + traços UD). Mapeamento 1:1, padrão,
  documentado. MorphoBr/DELAF usam tagsets próprios → exigem uma camada de tradução a mais.
- **Ambiguidade.** PortiLexicon representa ambiguidade como **uma linha por análise** (a mesma
  forma aparece repetida com POS/lema/traços diferentes). Isso encaixa **perfeitamente** no modelo
  `readings[]` (§5.3 da anotação): ingestão = agrupar linhas por forma → lista de `Reading`. Não há
  desambiguação embutida a desfazer — o léxico já entrega o leque, que é o que queremos.
- **Linhagem.** PortiLexicon é ICMC-USP — mesma família do NILC-Metrix/Flesch-PT que o `CLAUDE.md`
  já manda reusar. Coerência de proveniência.

---

## 3. Decisão

**Base: PortiLexicon-UD (CC-BY 4.0).** Motivos, em ordem de peso: (1) licença permissiva
product-safe; (2) tagset **Universal Dependencies** que o modelo de anotação já adota — zero
tradução de tagset; (3) ambiguidade já como múltiplas análises por forma → mapeia direto em
`readings[]`; (4) 1,22M entradas cobrem com folga texto administrativo real (OOV vai pro guesser);
(5) linhagem USP/NILC.

**Suplemento opcional: MorphoBr (Apache-2.0).** Também permissivo e com cobertura muito maior
(~9M). Fica como **fonte de preenchimento de lacunas** se a métrica de cobertura (§9 da anotação)
mostrar OOV alto demais — mapeado para o tagset UD por uma tabela de conversão versionada. Não é
obrigatório na Fase A; é a válvula de escape de cobertura.

**Overrides curados próprios** (mesmo espírito dos `participios-*` atuais), por ADR, corrigindo/
estendendo o que o domínio jurídico-administrativo exigir.

**Rejeitados:** DELAF-PB (LGPL) e Apertium-por (GPL) — só por licença. Se algum dia a cobertura de
PortiLexicon+MorphoBr for insuficiente **e** o produto for garantidamente não-distribuído
(uso interno), DELAF poderia ser reconsiderado; não é o caso.

---

## 4. A consequência dura: tamanho → artefato compilado no build

1,22M entradas são **dezenas de MB** em texto cru. Isso **não pode** ser um `import` síncrono
embutido em todo build (é o risco de bundle/async que o ADR do data registry §6.1 já sinalizou).
Decisão de engenharia atrelada a D1:

- **Pipeline de compactação no build-time (determinístico, versionado).** Um passo offline
  transforma o **fonte cru CC-BY** → um **artefato interno compacto** (mapa/trie compilado,
  possivelmente com poda por frequência ou por classe relevante). Só o artefato compacto é
  carregado pela Camada 1.
- **`fingerprint = "pinned"`** para este dataset no data registry (§2.3 daquele ADR): não se
  hasheia 1,22M linhas a cada boot; fixa-se a **versão do fonte** + a **versão do transformador**.
- **Async/bundle:** mesmo compacto, se ainda for grande, resolve-se com o gancho já previsto —
  `analyze` síncrono para a faixa lexical (juridiquês), e um caminho que carrega a anotação sob
  demanda para a faixa sintática. Decisão de forma fica no ADR de integração da anotação; aqui só
  se registra que D1 **torna esse gancho necessário, não opcional**.

**Auditabilidade, concretizada:** o **fonte cru CC-BY é a origem auditável** (versionada); o
**transformador de compactação é puro, versionado e testado**; o **artefato compacto é derivado
reproduzível**; os **overrides são curados à mão**; um **golden de anotação** trava o comportamento.
Não se audita 1,22M células — audita-se origem + transformação + comportamento. É a mesma redefinição
honesta de "auditável" já aceita, agora com nome e número.

---

## 5. Integração CONFIRMADA (levantada ao vivo)

- **Fonte:** Hugging Face `NILC-ICMC-USP/PortiLexicon-UD` (Space). Arquivos por classe:
  `VERB.tsv` (71 MB), `ADJ.tsv` (6,3 MB), `NOUN.tsv` (3,3 MB), `ADV.tsv` (160 KB), `AUX.tsv` (28 KB),
  `PRON.tsv`, `DET.tsv`, `NUM.tsv`, `ADP.tsv`, `CCONJ.tsv`, `SCONJ.tsv`, `INTJ.tsv` (todos ≤ alguns KB).
- **Formato REAL: 3 colunas TSV** `forma ⇥ lema ⇥ FEATS` — **sem coluna UPOS** (a classe é o nome do
  arquivo). FEATS é UD padrão pipe-separado (ex.: `Mood=Ind|Number=Sing|Person=3|Tense=Pqp|VerbForm=Fin`).
  Ambiguidade = múltiplas linhas com a mesma forma. Confirma o modelo `readings[]` (§5 da anotação).
- **Confirmação do "não dá sem léxico":** filtrando `VERB.tsv` por `Tense=Pqp` → 71.830 formas únicas de
  mais-que-perfeito sintético, **incluindo irregulares opacos** (`fizera, dissera, coubera, fora,
  houvera, tivera, trouxera, viera, quisera, pusera, soubera, dera, vira`) — nenhum reconhecível por
  regex. Compactado: **884 KB** (uma forma por linha) — bundleável, e o caso-modelo da estratégia
  `pinned`/artefato compacto (§4).
- **A armadilha da fatia filtrada (importante):** ingerir só as linhas `Tense=Pqp` faz a forma parecer
  **certamente** pluperfect, mas `fora`/`vira`/`dera` são AMBÍGUAS (também "fora"=advérbio, "vira"=verbo
  virar/substantivo). Ingestão honesta = puxar **todas as readings** de qualquer forma que tenha uma
  reading `Pqp` (varrer as outras classes por essas formas), para o detector **abster-se** quando a
  forma é ambígua (`precisão > recall`). É exatamente o que a escada `certain`/`ambiguous` (§6 da
  anotação) resolve — não é burocracia, é o que evita marcar "ele ficou fora" como pluperfect.
- **Atribuição CC-BY:** obrigatória — creditar PortiLexicon-UD em `NOTICE`/README de dados ao commitar
  qualquer artefato derivado.

---

## 6. Consequências e próximos passos

- O **modelo de anotação** (próximo ADR) fica concreto: tagset = **UD**; `Reading` vem direto de
  uma linha do PortiLexicon; ambiguidade = agrupar linhas por forma.
- O **data registry** ganha seu primeiro dataset `"pinned"` (o léxico) além dos 9 `"content"`.
- **Ordem de implementação recomendada:** (1) data registry — não depende do léxico externo,
  output-neutral, destrava tudo; (2) pipeline de ingestão/compactação do PortiLexicon; (3) anotação
  Fase A. Puxar 50MB de léxico e resolver bundle antes de ter o registry pronto seria fora de ordem.

Sources: [MorphoBr (LR-POR)](https://github.com/LR-POR/MorphoBr) ·
[PortiLexicon-UD (LREC 2022)](https://aclanthology.org/2022.lrec-1.715/) ·
[PortiLexicon-UD (ICMC-USP)](https://portilexicon.icmc.usp.br/) ·
[UNITEX-PB / DELAF-PB](https://github.com/datasets-br/unitex-pt-br) ·
[Apertium Portuguese](https://wiki.apertium.org/wiki/Portuguese)
