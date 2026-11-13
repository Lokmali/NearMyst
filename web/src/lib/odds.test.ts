import { describe, expect, it } from "vitest";
import {
  creatorAmount,
  oddsRows,
  percentToBps,
  platformFeeAmount,
  requiredDepositAmount,
  sumTierBps,
  totalInventorySlots,
  totalPrice,
  validateQuantity,
  validateTierSum,
} from "./odds";
import type { TierConfig } from "./types";


describe("totalPrice", () => {
  it("multiplies pack price by quantity", () => {
    expect(totalPrice("1000", 3).toString()).toBe("3000");
  });

  it("rejects non-positive quantity", () => {
    expect(() => totalPrice("1000", 0)).toThrow();
    expect(() => totalPrice("1000", 1.5)).toThrow();
  });
});

describe("fee split", () => {
  it("matches 2.5% platform fee (250 bps)", () => {
    const total = 2000n;
    expect(platformFeeAmount(total, 250).toString()).toBe("50");
    expect(creatorAmount(total, 250).toString()).toBe("1950");
  });

  it("zero fee sends all to creator", () => {
    expect(platformFeeAmount(1000n, 0).toString()).toBe("0");
    expect(creatorAmount(1000n, 0).toString()).toBe("1000");
  });
});

describe("validateQuantity", () => {
  it("checks remaining packs", () => {
    expect(validateQuantity(1, 3)).toBeNull();
    expect(validateQuantity(4, 3)).toMatch(/remaining/i);
    expect(validateQuantity(0, 3)).toMatch(/at least/i);
  });

  it("enforces per-buy cap of 50", () => {
    expect(validateQuantity(50, 100)).toBeNull();
    expect(validateQuantity(51, 100)).toMatch(/at most 50/i);
  });
});

describe("oddsRows", () => {
  const tiers: TierConfig[] = [
    { tier: "Common", probability_bps: 7000 },
    { tier: "Rare", probability_bps: 3000 },
  ];

  it("converts exact bps to percent labels", () => {
    const rows = oddsRows(tiers, 10_000);
    expect(sumTierBps(tiers)).toBe(10_000);
    expect(rows[0].label).toBe("70.00%");
    expect(rows[1].label).toBe("30.00%");
    expect(rows[0].probability_bps).toBe(7000);
  });
});

describe("create helpers", () => {
  it("percentToBps maps 60% → 6000", () => {
    expect(percentToBps(60)).toBe(6000);
    expect(percentToBps(100)).toBe(10_000);
  });

  it("requiredDepositAmount multiplies amount × quantity", () => {
    expect(requiredDepositAmount("100", 6).toString()).toBe("600");
  });

  it("validateTierSum requires exact 100%", () => {
    const ok: TierConfig[] = [
      { tier: "Common", probability_bps: 6000 },
      { tier: "Rare", probability_bps: 3000 },
      { tier: "Epic", probability_bps: 1000 },
    ];
    expect(validateTierSum(ok)).toBeNull();
    expect(totalInventorySlots([{ quantity: 6 }, { quantity: 3 }, { quantity: 1 }])).toBe(10);
    expect(validateTierSum([{ tier: "Common", probability_bps: 5000 }])).toMatch(/must sum/i);
  });
});
