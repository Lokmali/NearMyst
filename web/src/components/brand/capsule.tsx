"use client";

import {
  MysteryTrunk,
  TrunkSpinner,
} from "@/components/brand/mystery-trunk";
import type { Tier } from "@/lib/types";

type CapsuleSize = "xs" | "sm" | "md" | "lg" | "xl";

/** @deprecated Prefer MysteryTrunk — kept so existing imports keep working. */
export function Capsule({
  size = "md",
  tier,
  open = false,
  className,
  pulsing = false,
  spinning = false,
  tint,
}: {
  size?: CapsuleSize;
  tier?: Tier;
  open?: boolean;
  className?: string;
  pulsing?: boolean;
  spinning?: boolean;
  tint?: string;
}) {
  return (
    <MysteryTrunk
      size={size}
      tier={tier}
      open={open}
      className={className}
      pulsing={pulsing}
      tint={tint}
      motion={spinning ? "shake" : open ? "open" : "idle"}
    />
  );
}

/** @deprecated Prefer TrunkSpinner */
export function CapsuleSpinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return <TrunkSpinner className={className} label={label} />;
}
