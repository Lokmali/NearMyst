"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import type { PackResult, Tier } from "@/lib/types";
import { formatTokenAmount } from "@/lib/format";
import { TierBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Disclaimer } from "@/components/ui/disclaimer";
import { Capsule } from "@/components/brand/capsule";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { rarityClass } from "@/lib/rarity";
import { cn } from "@/lib/utils";
import { duration, ease } from "@/lib/motion";

type Phase = "drop" | "shake" | "split" | "reveal";

function fireConfetti(tier: Tier) {
  void import("canvas-confetti").then(({ default: confetti }) => {
    const strength =
      tier === "Mythic" ? 4 : tier === "Legendary" ? 3 : tier === "Epic" ? 2 : 0;
    if (!strength) return;
    const end = Date.now() + (strength === 4 ? 1400 : strength === 3 ? 1100 : 800);
    const colors =
      tier === "Mythic"
        ? ["#fb7185", "#f43f5e", "#d946ef"]
        : tier === "Legendary"
          ? ["#fbbf24", "#f59e0b", "#fff7ed"]
          : ["#d946ef", "#7c6cff", "#38bdf8"];
    const frame = () => {
      confetti({
        particleCount: strength === 2 ? 8 : strength * 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: strength === 2 ? 8 : strength * 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  });
}

export function RevealModal({
  result,
  onClose,
  txHash,
}: {
  result: PackResult;
  onClose: () => void;
  txHash?: string | null;
}) {
  const { reduced } = useMotionPreference();
  const [phase, setPhase] = useState<Phase>(reduced ? "reveal" : "drop");

  useEffect(() => {
    if (reduced) {
      setPhase("reveal");
      return;
    }
    const t1 = window.setTimeout(() => setPhase("shake"), 350);
    const t2 = window.setTimeout(() => setPhase("split"), 1050);
    const t3 = window.setTimeout(() => setPhase("reveal"), 1300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [reduced, result.pack_id]);

  useEffect(() => {
    if (phase !== "reveal" || reduced) return;
    if (result.tier === "Epic" || result.tier === "Legendary" || result.tier === "Mythic") {
      fireConfetti(result.tier);
    }
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        const pattern =
          result.tier === "Mythic"
            ? [30, 40, 30, 40, 60]
            : result.tier === "Legendary"
              ? [25, 30, 40]
              : result.tier === "Epic"
                ? [20, 20, 20]
                : [12];
        navigator.vibrate(pattern);
      }
    } catch {
      /* ignore */
    }
  }, [phase, result.tier, reduced]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (phase !== "reveal") setPhase("reveal");
        else onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, phase]);

  const verifyHref = txHash
    ? `/result/${result.pack_id}?tx=${encodeURIComponent(txHash)}`
    : `/result/${result.pack_id}`;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[8px]",
        result.tier === "Mythic" && phase === "reveal" && !reduced && "shadow-[inset_0_0_120px_rgba(251,113,133,0.18)]",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Pack reveal"
      onClick={() => (phase === "reveal" ? onClose() : setPhase("reveal"))}
    >
      <AnimatePresence mode="wait">
        {phase !== "reveal" ? (
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: -24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 1.08 }}
            transition={{ duration: duration.base, ease: ease.out }}
            className="flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                "relative",
                phase === "shake" && "animate-pack-shake",
                phase === "split" && "scale-110",
              )}
            >
              {(phase === "shake" || phase === "drop") && (
                <span
                  aria-hidden
                  className="absolute -inset-6 rounded-full border border-brand/40"
                  style={{ animation: "capsule-pulse 0.9s ease-in-out infinite" }}
                />
              )}
              <Capsule size="xl" open={phase === "split"} />
            </div>
            <p className="mt-5 text-small text-secondary" aria-live="polite">
              Revealing on-chain result…
            </p>
            <Button variant="ghost" className="mt-3" onClick={() => setPhase("reveal")}>
              Skip
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="reveal"
            initial={
              reduced
                ? false
                : {
                    opacity: 0,
                    scale:
                      result.tier === "Mythic" || result.tier === "Legendary"
                        ? 0.9
                        : result.tier === "Epic"
                          ? 0.93
                          : 0.96,
                    y: 12,
                  }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration:
                result.tier === "Mythic" || result.tier === "Legendary"
                  ? duration.reveal
                  : duration.slow,
              ease: ease.out,
            }}
            className={cn(
              "relative w-full max-w-md rounded-xl border bg-overlay p-6 shadow-overlay",
              rarityClass(result.tier, "edge"),
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {result.tier === "Legendary" && !reduced && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 opacity-40"
                style={{
                  background:
                    "conic-gradient(from 90deg, transparent, rgba(251,191,36,0.35), transparent 40%)",
                }}
              />
            )}
            <p className="text-eyebrow text-muted">You won</p>
            <div className="mt-3 flex items-center gap-3">
              <TierBadge tier={result.tier} />
              <h2 className={cn("text-h2", rarityClass(result.tier))}>
                {result.tier} reward
              </h2>
            </div>
            <dl className="mt-5 space-y-3 text-small text-secondary">
              <div className="flex justify-between gap-4">
                <dt>Amount</dt>
                <dd className="text-h3 tabular text-primary">
                  {formatTokenAmount(result.amount)} tokens
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Token</dt>
                <dd className="max-w-[60%] truncate mono-id text-muted">{result.token}</dd>
              </div>
            </dl>
            <details className="mt-4 text-caption text-muted">
              <summary className="cursor-pointer hover:text-secondary">
                Technical details
              </summary>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between gap-4">
                  <span>Reward id</span>
                  <span className="tabular text-primary">{result.reward_id}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span>random_ref</span>
                    <CopyButton value={result.random_ref} iconOnly label="Copy random_ref" />
                  </div>
                  <p className="mt-1 break-all mono-id">{result.random_ref}</p>
                </div>
              </div>
            </details>
            <Disclaimer className="mt-4">
              Testnet RNG only (not VRF). Mainnet needs VRF or an oracle.
            </Disclaimer>
            <div className="mt-5 flex flex-col gap-2">
              <Link href="/inventory" onClick={onClose}>
                <Button className="w-full">View in inventory</Button>
              </Link>
              <Link href={verifyHref} onClick={onClose}>
                <Button variant="secondary" className="w-full">
                  How was this decided?
                </Button>
              </Link>
              <Button variant="ghost" className="w-full" onClick={onClose}>
                Open another
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Neutral waiting UI while tx/result is pending — no outcome claim. */
export function OpeningOverlay({ label }: { label: string }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[8px]"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center rounded-xl border border-border bg-overlay px-8 py-7 shadow-overlay">
        <Capsule size="lg" pulsing tint="#7C6CFF" />
        <p className="mt-4 text-small text-secondary">{label || "Opening your pack…"}</p>
        <p className="mt-1 text-caption text-muted">
          Waiting for the chain — no outcome yet.
        </p>
      </div>
    </div>
  );
}
