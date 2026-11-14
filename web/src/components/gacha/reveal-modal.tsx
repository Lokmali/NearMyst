"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { PackResult, Tier } from "@/lib/types";
import { formatTokenAmount, formatWinHeadline, tokenSymbol } from "@/lib/format";
import { TierBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Disclaimer } from "@/components/ui/disclaimer";
import { MysteryTrunk } from "@/components/brand/mystery-trunk";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { rarityClass, RARITY_HEX } from "@/lib/rarity";
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
        ? ["#e85d4c", "#f7f0e4", "#e0b84a"]
        : tier === "Legendary"
          ? ["#e0b84a", "#ebc868", "#f7f0e4"]
          : ["#2dd4a8", "#e0b84a", "#5ba4c9"];
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
  const winLine = formatWinHeadline(result.amount, result.token);
  const symbol = tokenSymbol(result.token);
  const brass = RARITY_HEX[result.tier] ?? "#E0B84A";

  useEffect(() => {
    if (reduced) {
      setPhase("reveal");
      return;
    }
    const t1 = window.setTimeout(() => setPhase("shake"), 400);
    const t2 = window.setTimeout(() => setPhase("split"), 1400);
    const t3 = window.setTimeout(() => setPhase("reveal"), 1850);
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

  const trunkMotion =
    phase === "shake" ? "shake" : phase === "split" ? "open" : "idle";

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/80 p-4 backdrop-blur-[8px]",
        result.tier === "Mythic" &&
          phase === "reveal" &&
          !reduced &&
          "shadow-[inset_0_0_120px_rgba(232,93,76,0.16)]",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Pack reveal"
      onClick={() => (phase === "reveal" ? onClose() : setPhase("reveal"))}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${brass}33, transparent 55%)`,
        }}
      />
      <AnimatePresence mode="wait">
        {phase !== "reveal" ? (
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: -28, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 1.06, y: -12 }}
            transition={{ duration: duration.base, ease: ease.out }}
            className="relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {(phase === "shake" || phase === "drop") && (
                <span
                  aria-hidden
                  className="absolute -inset-10 rounded-full border border-brand/40"
                  style={{
                    boxShadow: `0 0 48px ${brass}55`,
                    animation: "trunk-pulse 0.85s ease-in-out infinite",
                  }}
                />
              )}
              <MysteryTrunk
                size="xl"
                tier={result.tier}
                open={phase === "split"}
                motion={trunkMotion}
              />
            </div>
            <p className="mt-6 font-display text-h3 text-primary" aria-live="polite">
              {phase === "shake"
                ? "Trunk shaking…"
                : phase === "split"
                  ? "Lid opening…"
                  : "Mystery trunk"}
            </p>
            <p className="mt-2 text-small text-secondary">Revealing on-chain result…</p>
            <Button variant="ghost" className="mt-4" onClick={() => setPhase("reveal")}>
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
                    clipPath: "circle(0% at 50% 50%)",
                    scale: 0.96,
                  }
            }
            animate={{
              opacity: 1,
              clipPath: "circle(150% at 50% 50%)",
              scale: 1,
            }}
            transition={{
              duration:
                result.tier === "Mythic" || result.tier === "Legendary"
                  ? duration.reveal
                  : duration.slow,
              ease: ease.out,
            }}
            className={cn(
              "relative w-full max-w-md rounded-[var(--radius-lg)] border bg-overlay p-6 shadow-overlay",
              rarityClass(result.tier, "edge"),
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex justify-center">
              <MysteryTrunk size="lg" tier={result.tier} open motion="open" />
            </div>
            <p className="text-center text-small text-muted">You won</p>
            <motion.p
              className={cn(
                "mt-2 text-center font-display text-display tabular leading-none",
                rarityClass(result.tier),
              )}
              initial={reduced ? false : { opacity: 0, y: 12, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: reduced ? 0 : 0.12, duration: duration.slow, ease: ease.out }}
            >
              {formatTokenAmount(result.amount)}
              <span className="ml-2 text-[0.55em] font-semibold tracking-tight text-brand">
                {symbol}
              </span>
            </motion.p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <TierBadge tier={result.tier} />
              <span className="text-small text-secondary">{result.tier} reward</span>
            </div>
            <details className="mt-5 text-caption text-muted">
              <summary className="cursor-pointer hover:text-secondary">
                Technical details
              </summary>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between gap-4">
                  <span>Token</span>
                  <span className="max-w-[60%] truncate mono-id text-primary">{result.token}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Amount</span>
                  <span className="tabular text-primary">{formatTokenAmount(result.amount)}</span>
                </div>
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
            <p className="sr-only" aria-live="polite">
              You won {winLine}, {result.tier} reward.
            </p>
            <p className="mt-5 text-small font-medium text-muted">What next</p>
            <div className="mt-2 flex flex-col gap-2">
              <Button className="w-full" onClick={onClose}>
                Open another
              </Button>
              <ButtonLink
                href="/inventory"
                variant="secondary"
                className="w-full"
                onClick={onClose}
              >
                View inventory
              </ButtonLink>
              <ButtonLink
                href={verifyHref}
                variant="ghost"
                className="w-full"
                onClick={onClose}
              >
                Verify on-chain
              </ButtonLink>
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
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[8px]"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center rounded-xl border border-border bg-overlay px-8 py-7 shadow-overlay">
        <MysteryTrunk size="lg" motion="shake" pulsing />
        <p className="mt-4 text-small text-secondary">{label || "Opening your pack…"}</p>
        <p className="mt-1 text-caption text-muted">
          Waiting for the chain — no outcome yet.
        </p>
      </div>
    </div>
  );
}
