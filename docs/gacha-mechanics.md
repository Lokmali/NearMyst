# NearMyst Mechanics

> **TESTNET DEMO** — rules below match the on-chain contract. Frontend must read odds and fees from view methods; never hardcode them.

## Inventory model

- Each opened pack awards **exactly one** reward unit.
- At creation, `sum(reward.quantity) >= max_packs` (declared capacity).
- Activation requires `sum(reward.quantity_deposited) >= max_packs`.
- On purchase: require `sum(quantity_remaining) - unopened_packs >= quantity`, then
  waterfill `quantity_reserved` (lowest reward id first). Remaining is **not** reduced
  until open — so odds still select among all non-awarded units.
- Invariant: `sum(quantity_remaining) >= unopened_packs` always.
- Creator **cannot** withdraw reserved / needed inventory
  (`max_withdrawable` enforces the invariant).

## Probabilities

- Tier weights are in basis points and **must sum to exactly 10_000**.
- On open: roll `r ∈ [0, 10000)`. **Always renormalize** over tiers that still have `quantity_remaining > 0`, map the roll into that weight sum, then pick the lowest reward id in the chosen tier.
- Empty tiers are skipped automatically (same relative weights among live tiers). Shown in the UI odds panel.

## Pause rules

- Creator may pause/unpause their machine; platform owner may pause any machine.
- While **Paused**: no new purchases.
- Existing **Unopened** packs may still be opened.
- Unpause requires `sellable_slots(rewards, unopened) >= unsold packs` (inventory still covers future sales).

## Randomness (honest disclosure)

Testnet uses `env::random_seed()` mixed with `pack_id`, `machine_id`, opener, and block heights. Open must occur in a **later block** than purchase.

**NOT production secure.** Block producers can influence the seed. Production needs VRF/oracle randomness. The result page shows only real fields (ids, block height, `random_ref`, reward, tx hash) — no fake proofs.

## Fees

Platform fee bps live in contract config (`get_config`), hard-capped at 1000 (10%). Split uses checked `u128` math on purchase.
