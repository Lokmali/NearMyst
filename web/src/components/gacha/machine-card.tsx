"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import type { MachineView } from "@/lib/types";
import { StatusBadge, TierBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Capsule } from "@/components/brand/capsule";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { formatTokenAmount, shortenAccount, tokenSymbol } from "@/lib/format";
import { highestTier } from "@/lib/odds";
import { RARITY_HEX, rarityClass } from "@/lib/rarity";
import { cn } from "@/lib/utils";
import { duration, ease } from "@/lib/motion";

function isUsableImageUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    const u = new URL(url);
    // Seed placeholders / blocked hosts — show Capsule instead of empty frame
    if (u.hostname === "example.com" || u.hostname.endsWith(".example")) {
      return false;
    }
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function MachineCard({ machine }: { machine: MachineView }) {
  const top = highestTier(machine);
  const { reduced } = useMotionPreference();
  const [imgFailed, setImgFailed] = useState(!isUsableImageUrl(machine.image_url));
  const tint = top ? RARITY_HEX[top] : "#E0B84A";

  return (
    <motion.div
      whileHover={reduced ? undefined : { y: -2 }}
      transition={{ duration: duration.fast, ease: ease.out }}
    >
      <Link
        href={`/machine/${machine.id}`}
        className="group relative block overflow-hidden rounded-[var(--radius-md)] border border-border bg-raised/40 shadow-card backdrop-blur-sm transition-[border-color,transform,box-shadow] duration-fast hover:border-border-strong"
      >
        <div className="relative aspect-[4/3] overflow-hidden border-b border-border bg-subtle">
          {!imgFailed && isUsableImageUrl(machine.image_url) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={machine.image_url!}
              alt=""
              className="h-full w-full object-cover transition duration-slow group-hover:scale-[1.03]"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                background: `linear-gradient(145deg, ${tint}22 0%, #16120E 55%, #0C0A08 100%)`,
              }}
              aria-hidden
            >
              <Capsule size="lg" tier={top ?? undefined} />
            </div>
          )}
          <div className="absolute left-3 top-3">
            <StatusBadge status={machine.status} />
          </div>
          {top && (
            <div className="absolute right-3 top-3">
              <TierBadge tier={top} />
            </div>
          )}
        </div>
        <div className="relative p-4 md:p-5">
          <h3 className="text-h3 truncate text-primary transition group-hover:text-brand-hover">
            {machine.name}
          </h3>
          <p className="mt-1 mono-id truncate text-muted">
            {shortenAccount(machine.creator, 6, 8)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-small">
            <div>
              <div className="text-caption text-muted">Price</div>
              <div className="font-medium tabular text-primary">
                {formatTokenAmount(machine.pack_price)}{" "}
                {tokenSymbol(machine.payment_token)}
              </div>
            </div>
            <div>
              <div className="text-caption text-muted">Packs left</div>
              <div className="font-medium tabular text-primary">
                {machine.packs_remaining}/{machine.max_packs}
              </div>
            </div>
          </div>
          <ProgressBar
            className="mt-4"
            value={machine.packs_remaining}
            max={machine.max_packs}
            label="Packs left"
            warnBelow={0.2}
          />
          {top && (
            <span
              aria-hidden
              className={cn(
                "absolute bottom-0 left-0 h-0.5 w-full opacity-70",
                rarityClass(top, "bar"),
              )}
            />
          )}
        </div>
      </Link>
    </motion.div>
  );
}
