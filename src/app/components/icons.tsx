/**
 * Ícones de traço, inline e sem dependência — cristalinos em qualquer escala. Herdam
 * `currentColor`; tamanho por `className` (ex.: `size-4`). Puramente decorativos:
 * sempre acompanhados de rótulo textual, com `aria-hidden`.
 */
type IconProps = { className?: string };

function base(className?: string) {
  return {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** Pena de nanquim — a marca da "decisão humana": ofício de autor. */
export function PenNibIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 3 5 10l-2 8 8-2 7-7z" />
      <path d="m14 5 5 5" />
      <circle cx="11" cy="12" r="1.4" />
      <path d="m10 14-6 6" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  );
}

/** Varinha de aplicação em lote — "aplicar as seguras". */
export function WandIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="m14 6 4 4L7 21l-4-4z" />
      <path d="m13 7 4 4" />
      <path d="M16 3v3M20.5 5.5 18 8M21 10h-3" />
    </svg>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

export function QuoteIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9.5 6C6.5 7 5 9.3 5 12.7V18h5.2v-5.3H7.9c0-2.1.8-3.4 2.6-4L9.5 6zm9 0c-3 1-4.5 3.3-4.5 6.7V18h5.2v-5.3h-2.3c0-2.1.8-3.4 2.6-4L18.5 6z" />
    </svg>
  );
}

export function ArrowDownIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 5v14" />
      <path d="m6 13 6 6 6-6" />
    </svg>
  );
}
