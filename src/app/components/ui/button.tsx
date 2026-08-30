"use client";

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

export type ButtonVariant = "primary" | "safe" | "tonal-human" | "tonal-safe" | "outline" | "ghost" | "link" | "danger";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl" | "hero";
export type ButtonShape = "soft" | "box" | "pill";

const BASE =
  "inline-flex items-center justify-center transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent font-semibold text-accent-ink shadow-(--shadow-card) hover:bg-accent-strong",
  safe: "bg-safe font-semibold text-on-safe shadow-(--shadow-card) hover:bg-safe-strong",
  "tonal-human":
    "border border-human-line bg-human-weak font-semibold text-human hover:bg-[color-mix(in_srgb,var(--human)_14%,transparent)] disabled:hover:bg-human-weak",
  "tonal-safe":
    "border border-safe-line bg-safe-weak font-semibold text-safe hover:bg-[color-mix(in_srgb,var(--safe)_14%,transparent)] disabled:hover:bg-safe-weak",
  outline: "border border-rule-2 font-medium text-ink-1 hover:bg-surface-2 hover:text-ink-0",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink-0",
  link: "font-medium text-accent hover:bg-accent-weak",
  danger: "border border-sev-error/45 bg-sev-error/10 font-semibold text-sev-error hover:bg-sev-error/20",
};

const SIZE: Record<ButtonSize, string> = {
  xs: "gap-1 px-1.5 py-1 text-[11px]",
  sm: "gap-1 px-2.5 py-1 text-[11.5px]",
  md: "gap-1.5 px-3 py-1.5 text-[12px]",
  lg: "gap-1.5 px-3.5 py-2 text-[12.5px]",
  xl: "gap-2 px-4 py-2.5 text-[13px]",
  hero: "gap-2 px-5 py-2.5 text-[13.5px]",
};

const SHAPE: Record<ButtonShape, string> = {
  soft: "rounded-md",
  box: "rounded-lg",
  pill: "rounded-full",
};

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  ref?: Ref<HTMLButtonElement>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  block?: boolean;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = "outline",
  size = "md",
  shape = "box",
  block = false,
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  const classes = [BASE, VARIANT[variant], SIZE[size], SHAPE[shape], block ? "w-full" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}

export type IconButtonSize = "sm" | "md" | "lg";

const ICON_SIZE: Record<IconButtonSize, string> = {
  sm: "size-6",
  md: "size-7",
  lg: "size-9",
};

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  label: string;
  variant?: Extract<ButtonVariant, "outline" | "ghost">;
  size?: IconButtonSize;
  shape?: ButtonShape;
  className?: string;
  children: ReactNode;
}

export function IconButton({
  label,
  variant = "ghost",
  size = "md",
  shape = "box",
  className,
  type = "button",
  children,
  ...rest
}: IconButtonProps) {
  const tone =
    variant === "outline"
      ? "border border-rule-2 text-ink-1 hover:bg-surface hover:text-ink-0"
      : "text-ink-3 hover:bg-surface-3 hover:text-ink-0";
  const classes = [
    "grid shrink-0 place-items-center transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40",
    tone,
    ICON_SIZE[size],
    shape === "pill" ? "rounded-full" : "rounded-md",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} aria-label={label} title={label} className={classes} {...rest}>
      {children}
    </button>
  );
}
