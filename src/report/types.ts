/**
 * Tipos da camada de composição. `src/report/**` é o ÚNICO lugar autorizado a importar
 * de `src/lucid/core/**` e `src/lucid/probe/**` ao mesmo tempo — ver docs/ARQUITETURA.md §2.
 *
 * Isso mantém a checagem da cerca (I1) trivial: "nada dentro de `lucid/core/**` importa
 * de `lucid/probe/**`" continua verdadeira mesmo que `report` precise conhecer as duas.
 */

import type { Diagnostic } from "../lucid/core/types";
import type { ProbeSignal } from "../lucid/probe/types";

/**
 * Composição de Camada 1 + Camada 2 para apresentação. `probeSignals` é `null` quando a
 * sonda está desligada — a ausência da Camada 2 nunca torna o `Diagnostic` inválido (I: a
 * Camada 1 continua inteira mesmo se a Camada 2 cair).
 */
export interface DiagnosticReport {
  diagnostic: Diagnostic;
  probeSignals: ProbeSignal[] | null;
}
