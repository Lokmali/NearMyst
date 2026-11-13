import type { Tier } from "./types";
import { cn } from "./utils";

export const RARITY_HEX: Record<Tier, string> = {
  Common: "#9CA3AF",
  Rare: "#38BDF8",
  Epic: "#D946EF",
  Legendary: "#FBBF24",
  Mythic: "#FB7185",
};

export const RARITY_COLORS: Record<Tier, string> = {
  Common: "text-rarity-common",
  Rare: "text-rarity-rare",
  Epic: "text-rarity-epic",
  Legendary: "text-rarity-legendary",
  Mythic: "text-rarity-mythic",
};

export const RARITY_BG: Record<Tier, string> = {
  Common: "bg-rarity-common/15 border-rarity-common/35 text-rarity-common",
  Rare: "bg-rarity-rare/15 border-rarity-rare/35 text-rarity-rare",
  Epic: "bg-rarity-epic/15 border-rarity-epic/35 text-rarity-epic",
  Legendary: "bg-rarity-legendary/15 border-rarity-legendary/35 text-rarity-legendary",
  Mythic: "bg-rarity-mythic/15 border-rarity-mythic/35 text-rarity-mythic",
};

export const RARITY_EDGE: Record<Tier, string> = {
  Common: "border-rarity-common/40",
  Rare: "border-rarity-rare/50 shadow-[0_0_0_1px_rgba(56,189,248,0.2)]",
  Epic: "border-rarity-epic/50 shadow-[0_0_0_1px_rgba(217,70,239,0.25)]",
  Legendary: "border-rarity-legendary/55 shadow-[0_0_24px_rgba(251,191,36,0.18)]",
  Mythic: "border-rarity-mythic/55 shadow-[0_0_28px_rgba(251,113,133,0.22)]",
};

export const RARITY_BAR: Record<Tier, string> = {
  Common: "bg-rarity-common",
  Rare: "bg-rarity-rare",
  Epic: "bg-rarity-epic",
  Legendary: "bg-rarity-legendary",
  Mythic: "bg-rarity-mythic",
};

/** @deprecated Prefer RARITY_EDGE — kept for older call sites during refine. */
export const RARITY_GLOW = RARITY_EDGE;

export function rarityClass(
  tier: Tier,
  kind: "text" | "bg" | "glow" | "edge" | "bar" = "text",
) {
  if (kind === "bg") return RARITY_BG[tier];
  if (kind === "glow" || kind === "edge") return cn("border", RARITY_EDGE[tier]);
  if (kind === "bar") return RARITY_BAR[tier];
  return RARITY_COLORS[tier];
}
