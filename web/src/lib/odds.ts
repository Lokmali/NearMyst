import type { MachineView, Tier, TierConfig } from "./types";
import { PROBABILITY_DENOMINATOR } from "./config";

export function totalPrice(packPrice: string, quantity: number): bigint {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("quantity must be a positive integer");
  }
  return BigInt(packPrice) * BigInt(quantity);
}

export function platformFeeAmount(total: bigint, feeBps: number): bigint {
  return (total * BigInt(feeBps)) / 10_000n;
}

export function creatorAmount(total: bigint, feeBps: number): bigint {
  return total - platformFeeAmount(total, feeBps);
}

/** Must match contract `MAX_BUY_QUANTITY`. */
export const MAX_BUY_QUANTITY = 50;

export function validateQuantity(
  quantity: number,
  packsRemaining: number,
): string | null {
  if (!Number.isInteger(quantity) || quantity < 1) return "Enter at least 1 pack";
  if (quantity > MAX_BUY_QUANTITY)
    return `You can buy at most ${MAX_BUY_QUANTITY} packs per purchase`;
  if (quantity > packsRemaining) return `Only ${packsRemaining} packs remaining`;
  return null;
}

/** Exact odds panel rows from contract tiers (bps → %). */
export function oddsRows(tiers: TierConfig[], denominator = PROBABILITY_DENOMINATOR) {
  return tiers.map((t) => ({
    tier: t.tier,
    probability_bps: t.probability_bps,
    percent: (t.probability_bps / denominator) * 100,
    label: `${((t.probability_bps / denominator) * 100).toFixed(2)}%`,
  }));
}

export function highestTier(machine: MachineView): Tier | null {
  const order: Tier[] = ["Mythic", "Legendary", "Epic", "Rare", "Common"];
  for (const t of order) {
    if (machine.tiers.some((x) => x.tier === t && x.probability_bps > 0)) {
      return t;
    }
  }
  return null;
}

export function isEpicOrAbove(tier: Tier): boolean {
  return tier === "Epic" || tier === "Legendary" || tier === "Mythic";
}

export function sumTierBps(tiers: TierConfig[]): number {
  return tiers.reduce((s, t) => s + t.probability_bps, 0);
}

/** Convert UI percent (0–100) to bps against denominator (default 10_000). */
export function percentToBps(
  percent: number,
  denominator = PROBABILITY_DENOMINATOR,
): number {
  return Math.round((percent / 100) * denominator);
}

export function bpsToPercentDisplay(
  bps: number,
  denominator = PROBABILITY_DENOMINATOR,
): number {
  return (bps / denominator) * 100;
}

/** FT amount required to fully deposit a reward slot line. */
export function requiredDepositAmount(
  amountPerWin: string,
  quantity: number,
): bigint {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("quantity must be a positive integer");
  }
  return BigInt(amountPerWin || "0") * BigInt(quantity);
}

export function totalInventorySlots(
  rewards: { quantity: number }[],
): number {
  return rewards.reduce((s, r) => s + (Number.isFinite(r.quantity) ? r.quantity : 0), 0);
}

export function validateTierSum(
  tiers: TierConfig[],
  denominator = PROBABILITY_DENOMINATOR,
): string | null {
  const sum = sumTierBps(tiers);
  if (sum !== denominator) {
    return `Tier probabilities must sum to ${denominator} bps (100%). Current: ${sum} bps (${((sum / denominator) * 100).toFixed(2)}%)`;
  }
  return null;
}

