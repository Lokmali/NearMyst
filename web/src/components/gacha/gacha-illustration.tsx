"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Capsule } from "@/components/brand/capsule";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { cn } from "@/lib/utils";

/**
 * Interactive hero machine. Decorative only — never shows rewards or outcomes.
 */
export function GachaIllustration({ className }: { className?: string }) {
  const { reduced } = useMotionPreference();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [crank, setCrank] = useState(0);
  const [toyPop, setToyPop] = useState(false);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 140, damping: 20 });
  const sy = useSpring(my, { stiffness: 140, damping: 20 });
  const layerFarX = useTransform(sx, [-20, 20], [-2, 2]);
  const layerFarY = useTransform(sy, [-20, 20], [-1.5, 1.5]);
  const layerNearX = useTransform(sx, [-20, 20], [-5, 5]);
  const layerNearY = useTransform(sy, [-20, 20], [-4, 4]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    function onVis() {
      if (document.hidden) setVisible(false);
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function onMove(e: React.MouseEvent) {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set(((e.clientX - rect.left) / rect.width - 0.5) * 40);
    my.set(((e.clientY - rect.top) / rect.height - 0.5) * 40);
  }

  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  function playCrank() {
    if (reduced) return;
    setCrank((c) => c + 1);
    setToyPop(true);
    window.setTimeout(() => setToyPop(false), 900);
  }

  return (
    <div
      ref={ref}
      className={cn("relative", className)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {/* Hero-only soft glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-6 rounded-full opacity-[0.08]"
        style={{
          background:
            "radial-gradient(circle, rgba(124,108,255,1) 0%, transparent 70%)",
        }}
      />
      {visible && !reduced && (
        <>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -left-8 top-4 h-40 w-40 rounded-full bg-brand/10 blur-3xl"
            animate={{ x: [0, 12, 0], y: [0, -10, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-6 bottom-10 h-36 w-36 rounded-full bg-[#5B8CFF]/10 blur-3xl"
            animate={{ x: [0, -10, 0], y: [0, 8, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
      <div className="film-grain rounded-xl" />

      <motion.div
        className={cn("relative h-full w-full", visible && !reduced && "animate-floaty")}
        style={
          reduced
            ? undefined
            : { x: layerFarX, y: layerFarY }
        }
      >
        <svg viewBox="0 0 420 420" className="h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="cab" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7C6CFF" />
              <stop offset="100%" stopColor="#5B8CFF" />
            </linearGradient>
            <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A89BFF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#151524" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          <rect x="110" y="70" width="200" height="280" rx="24" fill="#0F0F1A" stroke="#FFFFFF14" strokeWidth="2" />
          <rect x="130" y="95" width="160" height="150" rx="18" fill="url(#glass)" stroke="#FFFFFF18" strokeWidth="1.5" />
          <rect x="110" y="250" width="200" height="100" rx="16" fill="url(#cab)" opacity="0.9" />
          <rect x="170" y="275" width="80" height="36" rx="10" fill="#0A0A12" stroke="#FFFFFF20" />
          <circle cx="310" cy="300" r="22" fill="#1A1A2B" stroke="#7C6CFF" strokeWidth="3" />
          <motion.g
            style={{ originX: "310px", originY: "300px" }}
            animate={{ rotate: crank * 90 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
          >
            <rect x="308" y="278" width="4" height="22" rx="2" fill="#F5F5FA" />
            <circle cx="310" cy="276" r="6" fill="#8E80FF" />
          </motion.g>
        </svg>

        <motion.div
          className="pointer-events-none absolute left-[38%] top-[26%] flex gap-2"
          style={reduced ? undefined : { x: layerNearX, y: layerNearY }}
        >
          <Capsule size="sm" pulsing={visible && !reduced} />
          <Capsule size="xs" tint="#5B8CFF" pulsing={visible && !reduced} />
          <Capsule size="sm" tint="#8E80FF" />
        </motion.div>

        {toyPop && !reduced && (
          <motion.div
            className="absolute bottom-[28%] left-1/2"
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: [0, 1, 0], y: [8, -20, -40], scale: [0.8, 1, 0.9] }}
            transition={{ duration: 0.9 }}
          >
            <Capsule size="sm" open />
          </motion.div>
        )}
      </motion.div>

      <button
        type="button"
        onClick={playCrank}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            playCrank();
          }
        }}
        className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-overlay/90 px-3 py-1.5 text-caption text-secondary backdrop-blur-sm transition hover:border-border-strong hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        aria-label="Try the crank. Decorative toy only — no rewards."
      >
        Try the crank
      </button>
    </div>
  );
}
