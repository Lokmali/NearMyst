"use client";

import { cn } from "@/lib/utils";
import type { Tier } from "@/lib/types";
import { RARITY_HEX } from "@/lib/rarity";

type TrunkSize = "xs" | "sm" | "md" | "lg" | "xl";
type TrunkMotion = "idle" | "shake" | "open" | "none";

const SIZES: Record<TrunkSize, number> = {
  xs: 28,
  sm: 40,
  md: 64,
  lg: 96,
  xl: 148,
};

/**
 * Product motif: closed mystery trunk → shake → lid open.
 * Decorative / ceremony only — never invents win amounts.
 */
export function MysteryTrunk({
  size = "md",
  tier,
  open = false,
  motion: motionState = "idle",
  className,
  pulsing = false,
  tint,
}: {
  size?: TrunkSize;
  tier?: Tier;
  open?: boolean;
  /** Explicit ceremony state; `open` still controls lid. */
  motion?: TrunkMotion;
  className?: string;
  pulsing?: boolean;
  tint?: string;
}) {
  const px = SIZES[size];
  const brass = tint ?? (tier ? RARITY_HEX[tier] : "#E0B84A");
  const wood = "#3D2A1A";
  const woodDark = "#24180F";
  const isOpen = open || motionState === "open";
  const shaking = motionState === "shake";
  const uid = `trunk-${size}-${brass.replace("#", "")}`;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 80 80"
      className={cn(
        "shrink-0",
        shaking && "animate-trunk-shake",
        pulsing && !shaking && "animate-trunk-pulse",
        className,
      )}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-wood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={wood} />
          <stop offset="100%" stopColor={woodDark} />
        </linearGradient>
        <linearGradient id={`${uid}-brass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={brass} stopOpacity="1" />
          <stop offset="100%" stopColor={brass} stopOpacity="0.65" />
        </linearGradient>
        <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(247,240,228,0)" />
          <stop offset="45%" stopColor="rgba(247,240,228,0.22)" />
          <stop offset="100%" stopColor="rgba(247,240,228,0)" />
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse
        cx="40"
        cy="68"
        rx="22"
        ry="4"
        fill="rgba(0,0,0,0.35)"
        transform={isOpen ? "translate(0 2)" : undefined}
      />

      {/* Body */}
      <rect
        x="14"
        y="36"
        width="52"
        height="28"
        rx="4"
        fill={`url(#${uid}-wood)`}
        stroke="rgba(247,240,228,0.12)"
        strokeWidth="1"
      />
      <rect x="14" y="48" width="52" height="3" fill="rgba(0,0,0,0.25)" />
      <rect
        x="18"
        y="40"
        width="44"
        height="18"
        rx="2"
        fill="none"
        stroke="rgba(247,240,228,0.08)"
        strokeWidth="1"
      />

      {/* Front clasp */}
      <rect
        x="35"
        y="44"
        width="10"
        height="12"
        rx="2"
        fill={`url(#${uid}-brass)`}
      />
      <circle cx="40" cy="50" r="2.2" fill={woodDark} />

      {/* Side straps */}
      <rect x="18" y="36" width="4" height="28" fill={`url(#${uid}-brass)`} opacity="0.85" />
      <rect x="58" y="36" width="4" height="28" fill={`url(#${uid}-brass)`} opacity="0.85" />

      {/* Lid — hinges at top back, rotates open */}
      <g
        style={{
          transformOrigin: "40px 36px",
          transform: isOpen
            ? "translateY(-2px) rotate(-52deg)"
            : "translateY(0) rotate(0deg)",
          transition: "transform 320ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <path
          d="M14 36 L14 22 Q14 16 20 16 L60 16 Q66 16 66 22 L66 36 Z"
          fill={`url(#${uid}-wood)`}
          stroke="rgba(247,240,228,0.14)"
          strokeWidth="1"
        />
        <rect x="18" y="20" width="44" height="3" fill={`url(#${uid}-brass)`} opacity="0.9" />
        <rect x="18" y="16" width="4" height="20" fill={`url(#${uid}-brass)`} opacity="0.75" />
        <rect x="58" y="16" width="4" height="20" fill={`url(#${uid}-brass)`} opacity="0.75" />
        <rect x="14" y="34" width="52" height="3" fill={`url(#${uid}-shine)`} />
        {/* Lid clasp top */}
        <rect x="36" y="30" width="8" height="6" rx="1.5" fill={`url(#${uid}-brass)`} />
      </g>

      {/* Inner glow when open */}
      {isOpen && (
        <ellipse
          cx="40"
          cy="42"
          rx="16"
          ry="6"
          fill={brass}
          opacity="0.35"
        />
      )}
    </svg>
  );
}

export function TrunkSpinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center justify-center", className)}
      role="status"
      aria-label={label}
    >
      <MysteryTrunk size="sm" motion="shake" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
