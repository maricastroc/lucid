"use client";

export function Meter({
  done,
  total,
  tone = "accent",
  size = "bar",
  className = "",
}: {
  done: number;
  total: number;
  tone?: "accent" | "safe";
  size?: "bar" | "rule";
  className?: string;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 1000) / 10;
  const track = size === "rule" ? "h-[3px]" : "h-1.5 rounded-full";
  const fill = size === "rule" ? "" : "rounded-full";
  return (
    <span className={`block overflow-hidden bg-surface-3 ${track} ${className}`} aria-hidden>
      <span
        className={`block h-full transition-[width] duration-300 ease-(--ease-settle) ${fill} ${
          tone === "safe" ? "bg-safe" : "bg-accent"
        }`}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}
