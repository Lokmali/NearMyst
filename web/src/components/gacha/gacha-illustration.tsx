"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { MysteryTrunk } from "@/components/brand/mystery-trunk";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { cn } from "@/lib/utils";

/**
 * Centered product stage — trunk sits on a simple pedestal inside one panel.
 * Decorative only — never shows rewards or outcomes.
 */
export function GachaIllustration({ className }: { className?: string }) {
  const { reduced } = useMotionPreference();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [shake, setShake] = useState(false);
  const [opened, setOpened] = useState(false);

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

  function playOpen() {
    if (reduced) {
      setOpened((v) => !v);
      return;
    }
    setOpened(false);
    setShake(true);
    window.setTimeout(() => {
      setShake(false);
      setOpened(true);
    }, 900);
    window.setTimeout(() => setOpened(false), 2800);
  }

  return (
    <div ref={ref} className={cn("relative flex h-full w-full items-center justify-center", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 42%, rgba(224,184,74,0.16), transparent 58%)",
        }}
      />

      <div className="relative z-[1] flex w-full max-w-md flex-col items-center px-6 py-10 sm:py-12">
        <motion.div
          className={cn(
            "flex items-center justify-center",
            visible && !reduced && !shake && "animate-floaty",
          )}
        >
          <MysteryTrunk
            size="xl"
            motion={shake ? "shake" : opened ? "open" : "idle"}
            open={opened}
            pulsing={visible && !reduced && !shake && !opened}
            className="scale-[1.35] sm:scale-[1.5]"
          />
        </motion.div>

        {/* Pedestal — aligned under trunk center */}
        <div className="relative mt-2 flex w-full max-w-[220px] flex-col items-center" aria-hidden>
          <div className="h-2 w-[72%] rounded-full bg-brand/80" />
          <div className="mt-1 h-3 w-full rounded-full bg-[#3D2A1A] shadow-[0_8px_20px_rgba(0,0,0,0.45)]" />
          <div className="mt-2 h-1.5 w-[88%] rounded-full bg-black/40 blur-[2px]" />
        </div>

        {opened && !reduced ? (
          <motion.p
            className="mt-6 font-display text-h3 text-brand"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: [0, 1, 1, 0], y: [8, 0, 0, -8] }}
            transition={{ duration: 1.6 }}
          >
            Open on-chain
          </motion.p>
        ) : (
          <p className="mt-6 text-center text-caption text-muted">
            Tap to preview shake &amp; open
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={playOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            playOpen();
          }
        }}
        className="absolute inset-0 z-[2] cursor-pointer rounded-[inherit] bg-transparent"
        aria-label="Preview mystery trunk shake and open"
      />
    </div>
  );
}
