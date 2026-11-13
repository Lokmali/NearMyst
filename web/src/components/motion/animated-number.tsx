"use client";

import { useEffect, useState } from "react";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { cn } from "@/lib/utils";

/** Simple integer tween for balances / packs left (transform-free; text only). */
export function AnimatedNumber({
  value,
  className,
  durationMs = 280,
}: {
  value: number;
  className?: string;
  durationMs?: number;
}) {
  const { reduced } = useMotionPreference();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (reduced || !Number.isFinite(value)) {
      setDisplay(value);
      return;
    }
    const from = display;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // intentionally re-run only when `value` changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced, durationMs]);

  return <span className={cn("tabular", className)}>{display}</span>;
}
