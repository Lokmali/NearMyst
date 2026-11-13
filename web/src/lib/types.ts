/** Mirrors on-chain NearMyst views (JSON). */

export type MachineStatus = "Draft" | "Active" | "Paused";
export type Tier = "Common" | "Rare" | "Epic" | "Legendary" | "Mythic";
export type PackStatus = "Unopened" | "Opened" | "PendingClaim" | "Delivered";

export interface TierConfig {
  tier: Tier;
  probability_bps: number;
}

export interface RewardView {
  id: number;
  token: string;
  amount_per_win: string;
  tier: Tier;
  quantity_total: number;
  quantity_deposited: number;
  quantity_reserved: number;
  quantity_remaining: number;
}

export interface MachineView {
  id: number;
  creator: string;
  name: string;
  description: string;
  image_url: string;
  payment_token: string;
  pack_price: string;
  max_packs: number;
  packs_sold: number;
  packs_remaining: number;
  unopened_packs: number;
  status: MachineStatus;
  tiers: TierConfig[];
  rewards: RewardView[];
  creator_earnings: string;
  platform_earnings: string;
  total_deposited_slots: number;
}

export interface PlatformConfig {
  owner: string;
  platform_fee_bps: number;
  fee_receiver: string;
  max_platform_fee_bps: number;
  probability_denominator: number;
  /** YoctoNEAR base on create_machine (string avoids JS precision loss). */
  storage_create_base_yocto?: string;
  /** YoctoNEAR prepaid per max_packs slot. */
  storage_per_pack_yocto?: string;
}

export interface StorageBalanceBounds {
  min: string;
  max: string | null;
}

export interface Pack {
  id: number;
  machine_id: number;
  owner: string;
  status: PackStatus;
  purchased_at_block: number;
  reward_id: number | null;
  random_ref: string | null;
}

export interface PackResult {
  machine_id: number;
  pack_id: number;
  reward_id: number;
  random_ref: string;
  opened_at_block: number;
  tier: Tier;
  token: string;
  amount: string;
}

export interface StorageBalance {
  total: string;
  available: string;
}
