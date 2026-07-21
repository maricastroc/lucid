/**
 * Orquestrador da Camada 1 — `analyze()` (docs/ARQUITETURA.md §7, §9 Fase 1 item 5).
 *
 * Fluxo (tudo síncrono, puro, determinístico):
 *   1. mescla a Config efetiva (DEFAULT_CONFIG + overrides do chamador — merge raso é
 *      correto: `Partial<Config>` só torna as chaves de topo-nível opcionais; se o
 *      chamador fornecer, por ex., `sentenceLength`, o TypeScript já exige o objeto
 *      aninhado completo, então não há risco de mesclar um `sentenceLength` incompleto);
 *   2. constrói o `Document` UMA ÚNICA VEZ (normaliza + segmenta + tokeniza);
 *   3. calcula as métricas UMA ÚNICA VEZ, sobre o mesmo `Document` e a mesma `Config`;
 *   4. monta um `PassContext` e o congela (`Object.freeze`) — mesma referência de
 *      doc/config/data para TODOS os passes, sem possibilidade de reatribuição no
 *      meio do caminho;
 *   5. executa cada `Pass` do registry na ordem DECLARADA (só para fins de execução —
 *      nunca para a saída: os findings são recanonizados no passo seguinte,
 *      independente de como os passes estão listados em `registry.ts`);
 *   6. `sortFindings` — ordena canonicamente por (span.start, span.end, criterion,
 *      principle); exportada para ser testável isoladamente da execução dos passes;
 *   7. `buildScore` agrega o placar a partir dos findings já ordenados e do registry
 *      (não só dos findings — um pass que não achou nada aparece com contagem zero);
 *   8. monta o `Diagnostic` final.
 *
 * Nada aqui infere "aprovado" a partir de findings vazios — ausência de finding é
 * ausência de finding; o placar mostra zero, e é isso (I: docs/ARQUITETURA.md §3.4).
 */
import { buildDocument } from "./document/model";
import { runMetrics } from "./metrics";
import { PASSES } from "./passes/registry";
import { buildScore } from "./score";
import { DEFAULT_CONFIG, hashConfig } from "./config";
import { DOCUMENT_DATASETS, dataHashFor, createDataView, type DatasetId } from "./data/registry";
import type { Config } from "./config";
import type { Diagnostic, Finding, Pass, PassContext } from "./types";

/**
 * Versão da lib exposta em `DiagnosticMeta.lucidVersion`. Constante de código, não lida
 * de `package.json` em runtime — mantém `core` livre de I/O de arquivo (I1/I4).
 * Sincronizar manualmente com `package.json` a cada release; limitação conhecida.
 */
const LUCID_VERSION = "0.1.0";

const STANDARD_VERSION = "ABNT NBR ISO 24495-1:2024" as const;

function mergeConfig(overrides?: Partial<Config>): Config {
  return { ...DEFAULT_CONFIG, ...overrides };
}

/**
 * Ordenação canônica de findings: (span.start, span.end, criterion, principle).
 * Determinística e independente da ordem de execução dos passes ou do registry.
 * Comparação de string por code unit (`<`/`>`), não `localeCompare` (I4). Não muta o
 * array de entrada.
 */
export function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    if (a.span.start !== b.span.start) return a.span.start - b.span.start;
    if (a.span.end !== b.span.end) return a.span.end - b.span.end;
    if (a.criterion !== b.criterion) return a.criterion < b.criterion ? -1 : 1;
    if (a.principle !== b.principle) return a.principle < b.principle ? -1 : 1;
    return 0;
  });
}

/**
 * Núcleo da análise, parametrizado pela LISTA DE PASSES. `analyze` (abaixo) é a API
 * pública e sempre chama isto com o `PASSES` canônico do registry — este parâmetro
 * existe como SEAM INTERNO DE TESTE (independência da ordem de execução dos passes,
 * ver `test/determinism.test.ts`), no mesmo espírito de `sortFindings` já ser exportada
 * daqui para teste. NÃO é reexportado pelo barrel `src/lucid/index.ts` — a API pública
 * (docs/ARQUITETURA.md §3.6) continua sendo só `analyze`, então isto não amplia a
 * superfície pública. Ver ADR-009 em docs/DECISOES.md.
 *
 * Nota: `buildScore` recebe o mesmo `passes` — logo a ORDEM do array `Score.byCriterion`
 * acompanha a ordem dos passes recebidos aqui. Em produção isso é sempre `PASSES` (ordem
 * fixa); só um teste que injeta uma permutação observa `byCriterion` reordenado, e as
 * CONTAGENS por critério são idênticas em qualquer ordem (ver ADR-009).
 */
export function analyzeWithPasses(
  text: string,
  passes: readonly Pass[],
  configOverrides?: Partial<Config>,
): Diagnostic {
  const config = mergeConfig(configOverrides);
  const doc = buildDocument(text);
  const metrics = runMetrics(doc, config);

  // Cada pass recebe uma visão de dados ESCOPADA aos seus `dataDeps` (mesmo doc/config
  // congelados). Scoping custa nada (closure sobre um Set) e mantém o `dataHash` honesto: um pass
  // não consegue ler dado que não declarou.
  const rawFindings = passes.flatMap((pass) => {
    const context: PassContext = Object.freeze({ doc, config, data: createDataView(pass.dataDeps ?? []) });
    return pass.run(context);
  });
  const findings = sortFindings(rawFindings);

  const score = buildScore(findings, passes, metrics.words, config);

  // dataHash: proveniência dos dados em jogo = dados do estágio de documento (sempre) + os
  // `dataDeps` declarados pelos passes recebidos. Em produção `passes` é o registry completo →
  // cobre todos os datasets que podem influenciar a saída. Independe de `config.enabled` (isso é
  // do `configHash`); reflete QUE dados estão compilados nesta análise.
  const dataIds: DatasetId[] = [...DOCUMENT_DATASETS, ...passes.flatMap((pass) => pass.dataDeps ?? [])];

  return {
    text: doc.source,
    findings,
    score,
    metrics,
    meta: {
      lucidVersion: LUCID_VERSION,
      configHash: hashConfig(config),
      dataHash: dataHashFor(dataIds),
      standardVersion: STANDARD_VERSION,
    },
  };
}

/**
 * Analisa um texto e retorna o diagnóstico completo da Camada 1. Síncrona, pura,
 * determinística — mesma entrada (texto + config) sempre produz o mesmo `Diagnostic`,
 * byte a byte.
 */
export function analyze(text: string, configOverrides?: Partial<Config>): Diagnostic {
  return analyzeWithPasses(text, PASSES, configOverrides);
}
