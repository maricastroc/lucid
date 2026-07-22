/**
 * Visão de dados NEUTRA de idioma (ADR-031): o core só sabe que um pass pede um dataset por id
 * (string) e recebe o valor preparado; o TIPO concreto é responsabilidade do pass do locale, que
 * anota `get<T>(...)`. O escopo por `dataDeps` é garantido em runtime por `createDataView`.
 *
 * Os tipos ESPECÍFICOS de um idioma (o conjunto de `DatasetId`, os shapes preparados como
 * `JargonPrepared`) vivem no locale — ex.: `src/locales/pt-BR/datasets/types.ts`.
 */
export interface DataView {
  get<T>(id: string): T;
}
