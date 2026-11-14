# Smart contracts

## Gacha contract (`contract/`)

- **SDK:** near-sdk / near-contract-standards **5.30.1**
- **Deploy:** new testnet account after each breaking change (see deployment.md)
- **Standards:** NEP-141 receiver (`ft_on_transfer`), NEP-297 events

### Core methods

| Method | Who | Notes |
|--------|-----|-------|
| `new` | deployer once | owner, fee_receiver, platform_fee_bps |
| `create_machine` | creator | payable ≥ `0.05 Ⓝ + max_packs×0.001 Ⓝ` |
| `ft_on_transfer` / deposit | creator | msg `deposit_reward` |
| `activate_machine` | creator | deposited slots ≥ `max_packs` |
| `ft_on_transfer` / buy | buyer | msg `buy`; reserves inventory |
| `open_pack` | pack owner | later block; **testnet RNG** |
| `claim_pending` | pack owner | retry failed payout |
| `pause_machine` / `unpause_machine` | creator or owner | unpause: sellable ≥ unsold |
| `withdraw_creator_earnings` | creator | + `on_creator_earnings_withdrawn` restore |
| `withdraw_platform_earnings` | fee_receiver / owner | + resolve callback |
| `withdraw_unreserved_inventory` | creator | not while Active; + resolve callback |

### Views

`get_config`, `get_required_create_deposit`, `get_max_withdrawable_inventory`, `list_machines`, `get_machine`, `get_user_packs`, `get_pack`, `get_pack_result`, `is_pending_claim`

### Inventory rule

Each sold pack consumes exactly one reserved reward unit. Activation requires:

```
sum(reward.quantity_deposited) >= max_packs
```

Unpause requires `sellable_slots >= unsold packs` (not deposited ≥ max_packs).

### Randomness

`TestnetRandomness` uses block `random_seed`. **Not production secure.**

## Mock FT (`contract/mock_ft/`)

Minimal NEP-141 for sandbox + demo token `ft.nearmyst.testnet`. Payable `storage_deposit` with `storage_balance_bounds` / `storage_balance_of` (~0.00125 Ⓝ min). Includes `force_unregister` for E2E failure-path testing only.

Payable `buy()` mints demo `$myst` for attached testnet NEAR at a fixed rate (`get_buy_rate` / `quote_buy`, default **100_000 $myst per 1 Ⓝ**). First-time buyers auto-register (0.00125 Ⓝ taken from the deposit). Frontend: `/buy`.

## Build

```bash
cd contract
cargo test --lib
cargo build --target wasm32-unknown-unknown --release
```
