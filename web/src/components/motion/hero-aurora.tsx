"use client";

/**
 * Lightweight CSS aurora for the home hero.
 * Inspired by the calm gradient/aurora feel of Componentry-style heroes —
 * implemented in-house (no three.js / WebGL). Brand brass #E0B84A.
 * Lazy-friendly: client-only; paused when tab hidden; static on mobile /
 * reduced-motion / low-power.
 */

import { useEffect, useState } from "react";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { cn } from "@/lib/utils";

function usePrefersLowPower() {
  const [low, setLow] = useState(true);
  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 768px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Approximate low-power: save-data or ≤4 cores
    const saveData =
      typeof navigator !== "undefined" &&
      "connection" in navigator &&
      Boolean(
        (navigator as Navigator & { connection?: { saveData?: boolean } })
          .connection?.saveData,
      );
    const cores = navigator.hardwareConcurrency ?? 8;
    const compute = () =>
      setLow(narrow.matches || reduced.matches || saveData || cores <= 4);
    compute();
    narrow.addEventListener("change", compute);
    reduced.addEventListener("change", compute);
    return () => {
      narrow.removeEventListener("change", compute);
      reduced.removeEventListener("change", compute);
    };
  }, []);
  return low;
}

function useTabVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  return visible;
}

export function HeroAurora({ className }: { className?: string }) {
  const { reduced } = useMotionPreference();
  const lowPower = usePrefersLowPower();
  const visible = useTabVisible();
  const animate = !reduced && !lowPower && visible;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(224,184,74,0.18),transparent_55%),radial-gradient(ellipse_at_90%_10%,rgba(91,164,201,0.12),transparent_50%),radial-gradient(ellipse_at_50%_100%,rgba(224,184,74,0.08),transparent_45%)]" />
      {animate ? (
        <>
          <div className="hero-aurora-blob hero-aurora-blob-a" />
          <div className="hero-aurora-blob hero-aurora-blob-b" />
        </>
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,var(--bg-base))] opacity-80" />
    </div>
  );
}
