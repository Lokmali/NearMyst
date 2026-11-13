"use client";

import { cn } from "@/lib/utils";
import type { Tier } from "@/lib/types";
import { RARITY_HEX } from "@/lib/rarity";

type CapsuleSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZES: Record<CapsuleSize, number> = {
  xs: 16,
  sm: 24,
  md: 40,
  lg: 72,
  xl: 120,
};

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
  const px = SIZES[size];
  const top = tint ?? (tier ? RARITY_HEX[tier] : "#7C6CFF");
  const bottom = "#1A1A2B";

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 64 64"
      className={cn(
        "shrink-0",
        pulsing && "animate-capsule-pulse",
        spinning && "animate-spin",
        className,
      )}
      aria-hidden
    >
      <defs>
        <linearGradient id="capTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={top} stopOpacity="0.95" />
          <stop offset="100%" stopColor={top} stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="capBot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={bottom} />
          <stop offset="100%" stopColor="#0A0A12" />
        </linearGradient>
      </defs>
      <ellipse
        cx="32"
        cy="34"
        rx="18"
        ry="4"
        fill="rgba(0,0,0,0.25)"
        transform={open ? "translate(0 6)" : undefined}
      />
      <g
        style={{
          transformOrigin: "32px 32px",
          transform: open ? "translate(-6px, -4px) rotate(-18deg)" : undefined,
        }}
      >
        <path
          d="M14 32 C14 18 22 10 32 10 C42 10 50 18 50 32 Z"
          fill="url(#capTop)"
        />
        <path
          d="M18 30 C22 24 26 22 32 22 C38 22 42 24 46 30"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <g
        style={{
          transformOrigin: "32px 32px",
          transform: open ? "translate(6px, 4px) rotate(18deg)" : undefined,
        }}
      >
        <path
          d="M14 32 C14 46 22 54 32 54 C42 54 50 46 50 32 Z"
          fill="url(#capBot)"
        />
        <rect x="14" y="30" width="36" height="4" rx="2" fill="rgba(255,255,255,0.08)" />
      </g>
      {!open && (
        <ellipse cx="32" cy="32" rx="18" ry="2.5" fill="rgba(255,255,255,0.12)" />
      )}
    </svg>
  );
}

export function CapsuleSpinner({
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
      <Capsule size="sm" spinning pulsing />
      <span className="sr-only">{label}</span>
    </span>
  );
}
