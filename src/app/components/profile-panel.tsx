"use client";

import { useState } from "react";
import { configDeviations, DEFAULT_CONFIG, type Config } from "@/lucid";
import {
  criterionLabelFor,
  describeDeviation,
  KNOBS,
  readEnabled,
  readNumber,
  TOGGLEABLE_SECTIONS,
  withEnabled,
  withNumber,
} from "../lib/profile";

interface Props {
  config: Config;
  onChange: (config: Config) => void;
}

export function ProfilePanel({ config, onChange }: Props) {
  const deviations = configDeviations(config);
  const [open, setOpen] = useState(false);

  return (
    <section className="border-t border-rule-1 px-6 py-5">
      <span className="u-label text-ink-3">Perfil editorial</span>

      <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-1">
        {deviations.length === 0
          ? "Limiares padrão do Lucid."
          : `${deviations.length} ${deviations.length === 1 ? "ajuste seu" : "ajustes seus"} sobre o padrão.`}
      </p>

      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
        A norma não fixa números — o limiar de frase longa é escolha editorial, e o seu manual pode divergir do padrão
        daqui. Ajustar é legítimo; <strong className="font-medium text-ink-2">esconder o ajuste não é</strong>. Todo
        desvio aparece abaixo, entra no relatório exportado e muda o <span className="tabular-nums">configHash</span> que
        carimba a auditoria.
      </p>

      {deviations.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {deviations.map((deviation) => (
            <li key={`${deviation.section}.${deviation.field}`} className="text-[12.5px] text-ink-1">
              <span className="text-ink-3">·</span> {describeDeviation(deviation)}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-2 rounded-lg border border-rule-2 px-3 py-2 text-[12.5px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface-2"
        >
          {open ? "Fechar perfil" : "Ajustar perfil"}
        </button>
        {deviations.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_CONFIG)}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-medium text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0"
          >
            Voltar ao padrão
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4">
          <span className="u-label text-ink-3">Limiares</span>
          <div className="mt-2 flex flex-col gap-2">
            {KNOBS.map((knob) => (
              <label key={`${knob.section}.${knob.field}`} className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-[12.5px] text-ink-1">{knob.label}</span>
                <input
                  type="number"
                  min={knob.min}
                  max={knob.max}
                  value={readNumber(config, knob.section, knob.field)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (!Number.isFinite(next)) return;
                    onChange(withNumber(config, knob.section, knob.field, Math.min(Math.max(Math.trunc(next), knob.min), knob.max)));
                  }}
                  className="w-20 shrink-0 rounded-lg border border-rule-2 bg-sheet px-2 py-1.5 text-right text-[13px] tabular-nums text-ink-0 focus:border-accent focus:outline-none"
                />
              </label>
            ))}
          </div>

          <span className="u-label mt-5 block text-ink-3">Critérios da política</span>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">
            Desligar um critério faz o pass não rodar. O silêncio dele deixa de significar “não encontrei” e passa a
            significar “não procurei” — por isso cada desligamento é listado acima e no relatório.
          </p>
          <div className="mt-2 flex flex-col divide-y divide-rule-1">
            {TOGGLEABLE_SECTIONS.map((section) => (
              <label key={section} className="flex items-center justify-between gap-3 py-1.5">
                <span className="min-w-0 text-[12.5px] text-ink-1">{criterionLabelFor(section)}</span>
                <input
                  type="checkbox"
                  checked={readEnabled(config, section)}
                  onChange={(e) => onChange(withEnabled(config, section, e.target.checked))}
                  className="size-4 shrink-0 accent-[var(--accent)]"
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
