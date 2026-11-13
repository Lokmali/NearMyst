"use client";

import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
  label,
  warnBelow = 0.2,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  label?: string;
  /** When remaining ratio is below this, bar turns amber. */
  warnBelow?: number;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const remainingRatio = max > 0 ? value / max : 0;
  const warn = remainingRatio < warnBelow;

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-1.5 flex justify-between text-caption text-muted">
          <span>{label}</span>
          <span className="tabular">{Math.round(pct)}%</span>
        </div>
      )}
      <div
        className="h-1.5 overflow-hidden rounded-full bg-subtle"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-slow ease-out",
            warn ? "bg-warning" : "bg-brand",
            barClassName,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
