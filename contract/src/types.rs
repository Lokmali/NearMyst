//! Core data model for NearMyst.

use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::json_types::U128;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{AccountId, Gas, NearToken};

/// Hard max platform fee: 10% = 1000 bps.
pub const MAX_PLATFORM_FEE_BPS: u16 = 1_000;
/// Tier probabilities must sum to exactly this (100%).
pub const PROBABILITY_DENOMINATOR: u16 = 10_000;

/// Base NEAR attached on `create_machine` for contract metadata storage.
pub const STORAGE_CREATE_BASE: NearToken = NearToken::from_millinear(50); // 0.05 Ⓝ
/// Prepaid pack-row storage per `max_packs` slot (demo estimate ~0.001 Ⓝ).
/// Creators fund pack LookupMap growth up front so buys cannot grief the contract.
pub const STORAGE_PER_PACK_YOCTO: u128 = 1_000_000_000_000_000; // 0.001 Ⓝ

pub const MAX_DESCRIPTION_LEN: usize = 512;
pub const MAX_IMAGE_URL_LEN: usize = 256;
/// Hard cap on packs purchased in a single `buy` (gas / `user_packs` growth).
pub const MAX_BUY_QUANTITY: u64 = 50;
/// Max `ft_on_transfer` msg JSON length (bytes).
pub const MAX_FT_MSG_LEN: usize = 256;

pub const GAS_FOR_FT_TRANSFER: Gas = Gas::from_tgas(50);
pub const GAS_FOR_FT_RESOLVE: Gas = Gas::from_tgas(40);
pub const ONE_YOCTO: NearToken = NearToken::from_yoctonear(1);

/// Minimum NEAR that must be attached to `create_machine` for the given capacity.
pub fn required_create_deposit(max_packs: u64) -> NearToken {
    let per_pack = STORAGE_PER_PACK_YOCTO
        .checked_mul(u128::from(max_packs))
        .unwrap_or(u128::MAX);
    let total = STORAGE_CREATE_BASE
        .as_yoctonear()
        .saturating_add(per_pack);
    NearToken::from_yoctonear(total)
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub enum MachineStatus {
    Draft,
    Active,
    Paused,
}

#[derive(
    BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Copy,
)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub enum Tier {
    Common,
    Rare,
    Epic,
    Legendary,
    Mythic,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub enum PackStatus {
    Unopened,
    /// Opened locally; payout in flight or settled to Delivered/PendingClaim.
    Opened,
    /// FT payout failed; owner may call `claim_pending`.
    PendingClaim,
    /// Callback confirmed FT transfer success.
    Delivered,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone, Debug)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct TierConfig {
    pub tier: Tier,
    /// Probability in basis points. All tiers for a machine must sum to 10_000.
    pub probability_bps: u16,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone, Debug)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Reward {
    pub id: u64,
    pub token: AccountId,
    pub amount_per_win: U128,
    pub tier: Tier,
    pub quantity_total: u64,
    pub quantity_deposited: u64,
    /// Units locked for sold-but-unopened packs (cannot be withdrawn).
    pub quantity_reserved: u64,
    /// Units still selectable at open (not yet awarded).
    pub quantity_remaining: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone, Debug)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Machine {
    pub id: u64,
    pub creator: AccountId,
    pub name: String,
    pub description: String,
    pub image_url: String,
    pub payment_token: AccountId,
    pub pack_price: U128,
    pub max_packs: u64,
    pub packs_sold: u64,
    /// Sold packs not yet opened (inventory soft-lock).
    pub unopened_packs: u64,
    pub status: MachineStatus,
    pub tiers: Vec<TierConfig>,
    pub rewards: Vec<Reward>,
    pub creator_earnings: U128,
    pub platform_earnings: U128,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone, Debug)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Pack {
    pub id: u64,
    pub machine_id: u64,
    pub owner: AccountId,
    pub status: PackStatus,
    pub purchased_at_block: u64,
    pub reward_id: Option<u64>,
    pub random_ref: Option<String>,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone, Debug)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct PackResult {
    pub machine_id: u64,
    pub pack_id: u64,
    pub reward_id: u64,
    pub random_ref: String,
    pub opened_at_block: u64,
    pub tier: Tier,
    pub token: AccountId,
    pub amount: U128,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct PlatformConfig {
    pub owner: AccountId,
    pub platform_fee_bps: u16,
    pub fee_receiver: AccountId,
    pub max_platform_fee_bps: u16,
    pub probability_denominator: u16,
    /// YoctoNEAR base attached on create (string to avoid JS precision loss).
    pub storage_create_base_yocto: String,
    /// YoctoNEAR prepaid per max_packs slot on create.
    pub storage_per_pack_yocto: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct RewardView {
    pub id: u64,
    pub token: AccountId,
    pub amount_per_win: U128,
    pub tier: Tier,
    pub quantity_total: u64,
    pub quantity_deposited: u64,
    pub quantity_reserved: u64,
    pub quantity_remaining: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct MachineView {
    pub id: u64,
    pub creator: AccountId,
    pub name: String,
    pub description: String,
    pub image_url: String,
    pub payment_token: AccountId,
    pub pack_price: U128,
    pub max_packs: u64,
    pub packs_sold: u64,
    pub packs_remaining: u64,
    pub unopened_packs: u64,
    pub status: MachineStatus,
    pub tiers: Vec<TierConfig>,
    pub rewards: Vec<RewardView>,
    pub creator_earnings: U128,
    pub platform_earnings: U128,
    pub total_deposited_slots: u64,
}

impl From<Machine> for MachineView {
    fn from(m: Machine) -> Self {
        let total_deposited_slots: u64 = m.rewards.iter().map(|r| r.quantity_deposited).sum();
        let packs_remaining = m.max_packs.saturating_sub(m.packs_sold);
        Self {
            id: m.id,
            creator: m.creator,
            name: m.name,
            description: m.description,
            image_url: m.image_url,
            payment_token: m.payment_token,
            pack_price: m.pack_price,
            max_packs: m.max_packs,
            packs_sold: m.packs_sold,
            packs_remaining,
            unopened_packs: m.unopened_packs,
            status: m.status,
            tiers: m.tiers,
            rewards: m
                .rewards
                .into_iter()
                .map(|r| RewardView {
                    id: r.id,
                    token: r.token,
                    amount_per_win: r.amount_per_win,
                    tier: r.tier,
                    quantity_total: r.quantity_total,
                    quantity_deposited: r.quantity_deposited,
                    quantity_reserved: r.quantity_reserved,
                    quantity_remaining: r.quantity_remaining,
                })
                .collect(),
            creator_earnings: m.creator_earnings,
            platform_earnings: m.platform_earnings,
            total_deposited_slots,
        }
    }
}

/// JSON message attached to `ft_transfer_call`.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum FtAction {
    DepositReward { machine_id: u64, reward_id: u64 },
    Buy { machine_id: u64, quantity: u64 },
}
