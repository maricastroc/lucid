import type { Diagnostic } from "../lucid/core/types";
import type { ProbeSignal } from "../lucid/probe/types";

export interface DiagnosticReport {
  diagnostic: Diagnostic;
  probeSignals: ProbeSignal[] | null;
}
