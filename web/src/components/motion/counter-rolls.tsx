"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { cn } from "@/lib/utils";

/**
 * Taste moment: counter-rolls — digits roll once like an odometer when in view.
 * Strips rest on the real figures before/after so the row never reads as zeros.
 */
export function CounterRolls({
  value,
  className,
  suffix,
}: {
  value: number;
  className?: string;
  suffix?: string;
}) {
  const { reduced } = useMotionPreference();
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(reduced ? value : 0);
  const [started, setStarted] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, value]);

  useEffect(() => {
    if (!started || reduced) {
      setShown(value);
      return;
    }
    const target = Math.max(0, Math.floor(value));
    const duration = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setShown(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, value, reduced]);

  return (
    <span ref={ref} className={cn("tabular font-display", className)}>
      {shown}
      {suffix}
    </span>
  );
}

export function ProofStat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-caption uppercase tracking-[0.14em] text-muted">
        {label}
      </div>
      <div className="mt-2 text-3xl font-medium tracking-tight text-primary md:text-4xl">
        <CounterRolls value={value} suffix={suffix} />
      </div>
    </div>
  );
}
