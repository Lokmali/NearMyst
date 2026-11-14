"use client";

/**
 * Dealt effect: edge-glow — soft brand rim behind the product stage.
 * Contained to the hero panel (overflow hidden on parent) — no spill past the fold.
 * CSS only (no WebGL) to protect First Load budget.
 */
import { cn } from "@/lib/utils";

export function EdgeGlow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      {/* topglow — capped to upper half so it never spills the hero panel */}
      <div className="absolute inset-x-0 top-0 h-[42%] max-h-[22rem] bg-[radial-gradient(ellipse_at_50%_0%,rgba(224,184,74,0.22),transparent_70%)]" />
      <div className="absolute right-0 top-[8%] h-[28%] w-[40%] max-h-[14rem] bg-[radial-gradient(ellipse_at_80%_20%,rgba(91,164,201,0.12),transparent_70%)]" />
      <div className="absolute left-1/2 top-[18%] h-[36%] w-[70%] max-h-[18rem] -translate-x-1/2 rounded-[40%] opacity-50 shadow-[inset_0_0_60px_rgba(224,184,74,0.22)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-[var(--bg-base)]" />
    </div>
  );
}
