//! Inventory reservation + tier/reward selection (pure, unit-testable).
//!
//! # Inventory model
//! - `quantity_remaining`: units not yet awarded (selectable at open).
//! - `quantity_reserved`: soft-lock accounting for unopened packs (not withdrawable).
//! - Invariant: `sum(quantity_remaining) >= unopened_packs` always.
//! - On purchase: require enough remaining, bump `unopened_packs` and per-reward
//!   `quantity_reserved` via waterfill (lowest reward id first) **without** moving
//!   remaining — remaining drops only when a pack is opened/awarded.
//! - On open: pick among rewards with `quantity_remaining > 0`, then
//!   remaining--, reserved-- (if reserved > 0), unopened--.
//! - Withdraw: cannot reduce remaining below what unopened packs need.

use crate::types::{Reward, Tier, TierConfig, PROBABILITY_DENOMINATOR};

/// How many pack slots can still be sold given remaining inventory & unopened.
pub fn sellable_slots(rewards: &[Reward], unopened_packs: u64) -> u64 {
    let total_remaining: u64 = rewards.iter().map(|r| r.quantity_remaining).sum();
    total_remaining.saturating_sub(unopened_packs)
}

/// Reserve `quantity` slots for newly purchased packs (accounting only).
/// Waterfills `quantity_reserved` from lowest reward id that still has
/// unreserved remaining capacity: `remaining - reserved_already_on_line` is NOT
/// used; capacity is `quantity_remaining - quantity_reserved` clamped at 0 is wrong
/// because remaining includes units that back reserved packs.
///
/// Capacity to reserve on a line = `quantity_remaining` minus how many of those
/// remaining units are already counted in reserved globally… Simpler rule:
/// capacity_on_line = deposited - reserved - awarded, where awarded =
/// deposited - remaining - reserved ⇒ capacity = remaining.
/// Wait: if reserved doesn't decrease remaining, then remaining still includes
/// reserved units. So free = remaining - reserved (per line), and
/// sum(remaining) - sum(reserved) should equal sellable… We keep
/// sum(reserved) == unopened_packs by construction.
pub fn reserve_slots(rewards: &mut [Reward], quantity: u64) {
    let mut left = quantity;
    for reward in rewards.iter_mut() {
        if left == 0 {
            break;
        }
        // Free headroom on this line before over-reserving past remaining.
        let free = reward
            .quantity_remaining
            .saturating_sub(reward.quantity_reserved);
        if free == 0 {
            continue;
        }
        let take = free.min(left);
        reward.quantity_reserved = reward
            .quantity_reserved
            .checked_add(take)
            .expect("reserved overflow");
        left -= take;
    }
    assert!(left == 0, "reserve_slots: insufficient free remaining");
}

/// Max units of `reward_id` that may be withdrawn without breaking
/// `sum(remaining) >= unopened_packs`.
pub fn max_withdrawable_units(rewards: &[Reward], reward_id: u64, unopened_packs: u64) -> u64 {
    let Some(reward) = rewards.iter().find(|r| r.id == reward_id) else {
        return 0;
    };
    // Reserved units on this line are never withdrawable.
    let unreserved_on_line = reward
        .quantity_remaining
        .saturating_sub(reward.quantity_reserved);
    let total_remaining: u64 = rewards.iter().map(|r| r.quantity_remaining).sum();
    // After withdrawing `w` from this line's remaining, need total_remaining - w >= unopened.
    let inventory_cap = total_remaining.saturating_sub(unopened_packs);
    unreserved_on_line.min(inventory_cap)
}

/// Select a reward id given entropy roll in `[0, 10000)`.
/// Renormalizes over tiers that still have `quantity_remaining > 0`.
pub fn select_reward(rewards: &[Reward], tiers: &[TierConfig], roll_bps: u16) -> Option<u64> {
    let live_tiers: Vec<(Tier, u16)> = tiers
        .iter()
        .filter(|t| rewards.iter().any(|r| r.tier == t.tier && r.quantity_remaining > 0))
        .map(|t| (t.tier, t.probability_bps))
        .collect();
    if live_tiers.is_empty() {
        return None;
    }
    let weight_sum: u32 = live_tiers.iter().map(|(_, w)| u32::from(*w)).sum();
    if weight_sum == 0 {
        return None;
    }

    // Map original roll into renormalized space.
    let roll = u32::from(roll_bps) % weight_sum;
    let mut acc = 0u32;
    let mut chosen_tier = live_tiers[0].0;
    for (tier, w) in &live_tiers {
        acc += u32::from(*w);
        if roll < acc {
            chosen_tier = *tier;
            break;
        }
    }

    rewards
        .iter()
        .filter(|r| r.tier == chosen_tier && r.quantity_remaining > 0)
        .min_by_key(|r| r.id)
        .map(|r| r.id)
}

/// Consume one unit after open selection.
///
/// Keeps soft-lock accounting coherent: after an open, one reserved unit is
/// released. Prefer the awarded line; if that line has no reserved (open hit a
/// non-waterfilled line), decrement reserved on the lowest-id line that still
/// has reserved so `sum(reserved)` tracks `unopened_packs`.
pub fn consume_reward_unit(rewards: &mut [Reward], reward_id: u64) {
    {
        let reward = rewards
            .iter_mut()
            .find(|r| r.id == reward_id)
            .expect("reward missing");
        require_remaining(reward);
        reward.quantity_remaining -= 1;
        if reward.quantity_reserved > 0 {
            reward.quantity_reserved -= 1;
            return;
        }
    }
    if let Some(other) = rewards
        .iter_mut()
        .filter(|r| r.quantity_reserved > 0)
        .min_by_key(|r| r.id)
    {
        other.quantity_reserved -= 1;
    }
}

fn require_remaining(reward: &Reward) {
    assert!(
        reward.quantity_remaining > 0,
        "no remaining inventory for reward"
    );
}

#[allow(dead_code)]
pub fn assert_probability_denominator_matches() {
    assert_eq!(PROBABILITY_DENOMINATOR, 10_000);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Tier;
    use near_sdk::json_types::U128;

    fn reward(id: u64, tier: Tier, remaining: u64, reserved: u64) -> Reward {
        Reward {
            id,
            token: "ft.testnet".parse().unwrap(),
            amount_per_win: U128(1),
            tier,
            quantity_total: remaining + reserved,
            quantity_deposited: remaining + reserved,
            quantity_reserved: reserved,
            quantity_remaining: remaining,
        }
    }

    #[test]
    fn sellable_respects_unopened() {
        let rewards = vec![reward(0, Tier::Common, 10, 0)];
        assert_eq!(sellable_slots(&rewards, 3), 7);
        assert_eq!(sellable_slots(&rewards, 10), 0);
    }

    #[test]
    fn reserve_waterfill() {
        let mut rewards = vec![
            reward(0, Tier::Common, 2, 0),
            reward(1, Tier::Rare, 5, 0),
        ];
        reserve_slots(&mut rewards, 3);
        assert_eq!(rewards[0].quantity_reserved, 2);
        assert_eq!(rewards[1].quantity_reserved, 1);
        assert_eq!(rewards[0].quantity_remaining, 2); // remaining unchanged
    }

    #[test]
    fn withdraw_cannot_break_unopened_invariant() {
        let rewards = vec![
            reward(0, Tier::Common, 5, 3),
            reward(1, Tier::Rare, 2, 2),
        ];
        // unopened=5, total remaining=7 → inventory_cap=2
        // unreserved on 0 = 5-3=2 → max=2
        assert_eq!(max_withdrawable_units(&rewards, 0, 5), 2);
        // unreserved on 1 = 0 → max=0
        assert_eq!(max_withdrawable_units(&rewards, 1, 5), 0);
    }

    #[test]
    fn select_renormalizes_empty_tier() {
        let rewards = vec![
            reward(0, Tier::Common, 0, 0), // exhausted
            reward(1, Tier::Rare, 2, 0),
        ];
        let tiers = vec![
            TierConfig {
                tier: Tier::Common,
                probability_bps: 9_000,
            },
            TierConfig {
                tier: Tier::Rare,
                probability_bps: 1_000,
            },
        ];
        // Any roll should land on Rare since Common has no remaining.
        for roll in [0u16, 5000, 9999] {
            assert_eq!(select_reward(&rewards, &tiers, roll), Some(1));
        }
    }

    #[test]
    fn consume_releases_reserved_on_non_waterfilled_line() {
        // Waterfill reserved onto Common (id 0); open awards Rare (id 1).
        let mut rewards = vec![
            reward(0, Tier::Common, 5, 0),
            reward(1, Tier::Rare, 5, 0),
        ];
        reserve_slots(&mut rewards, 3);
        assert_eq!(rewards[0].quantity_reserved, 3);
        assert_eq!(rewards[1].quantity_reserved, 0);
        let unopened = 3u64;
        assert_eq!(
            rewards.iter().map(|r| r.quantity_reserved).sum::<u64>(),
            unopened
        );

        consume_reward_unit(&mut rewards, 1); // hit Rare (no reserved on that line)
        let unopened_after = unopened - 1;
        assert_eq!(rewards[1].quantity_remaining, 4);
        assert_eq!(
            rewards.iter().map(|r| r.quantity_reserved).sum::<u64>(),
            unopened_after,
            "reserved must track unopened after open on non-waterfilled line"
        );
    }

    #[test]
    fn reserved_equals_unopened_after_mixed_buys_and_opens() {
        let mut rewards = vec![
            reward(0, Tier::Common, 8, 0),
            reward(1, Tier::Rare, 8, 0),
            reward(2, Tier::Epic, 4, 0),
        ];
        let tiers = vec![
            TierConfig {
                tier: Tier::Common,
                probability_bps: 4_000,
            },
            TierConfig {
                tier: Tier::Rare,
                probability_bps: 4_000,
            },
            TierConfig {
                tier: Tier::Epic,
                probability_bps: 2_000,
            },
        ];
        let mut unopened = 0u64;
        // Mixed buys
        for qty in [2u64, 3, 1] {
            reserve_slots(&mut rewards, qty);
            unopened += qty;
            assert_eq!(
                rewards.iter().map(|r| r.quantity_reserved).sum::<u64>(),
                unopened
            );
        }
        // Mixed opens with varying rolls (may hit non-waterfilled lines)
        for roll in [0u16, 3_500, 7_500, 9_500, 100, 8_000] {
            if unopened == 0 {
                break;
            }
            let Some(id) = select_reward(&rewards, &tiers, roll) else {
                break;
            };
            consume_reward_unit(&mut rewards, id);
            unopened -= 1;
            assert_eq!(
                rewards.iter().map(|r| r.quantity_reserved).sum::<u64>(),
                unopened,
                "invariant broken after open roll={roll} reward={id}"
            );
        }
    }
}
