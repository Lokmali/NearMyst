# Architecture

## System diagram

```
┌─────────────┐     RPC view calls      ┌──────────────────────┐
│  Next.js UI │ ──────────────────────► │  NEAR JSON-RPC       │
│  (/web)     │                         └──────────┬───────────┘
│             │ signed txs (Wallet      ┌──────────▼───────────┐
│             │ Selector v10)           │ app.nearmyst.testnet │
│             │ ──────────────────────► │ (NearMyst contract)  │
└─────────────┘                         └──────────┬───────────┘
                                                   │ ft_on_transfer
                                                   ▼
                                        ┌──────────────────────┐
                                        │ Payment / reward FTs │
                                        │ (ft.nearmyst.testnet)│
                                        └──────────────────────┘
```

## Frontend layers

| Layer | Path | Responsibility |
|-------|------|----------------|
| Pages | `web/src/app/*` | Routes only; no mocked chain data |
| Wallet | `@near-wallet-selector/react-hook` | Connect, `callFunction`, `signAndSendTransactions` |
| Contract client | `web/src/lib/contract/*` | Typed views + msg builders |
| Utils | `web/src/lib/odds.ts` | Price / fee / bps helpers (unit-tested) |

## Trust boundaries

- **Contract** is authoritative for odds, inventory, fees, pack results.
- **UI** may cache nothing critical; after open it polls `get_pack_result` before reveal animation.
- **Tx hashes** are not stored on-chain; the UI remembers them in `sessionStorage` when the wallet returns an outcome.

## Money flows

1. **Buy:** user `ft_transfer_call` → gacha `ft_on_transfer` `{action:"buy"}` → fee split + pack mint + inventory reserve.
2. **Open:** `open_pack` → pick reward → attempt `ft_transfer` payout → `Delivered` or `PendingClaim`.
3. **Create:** `create_machine` (0.05 Ⓝ) → creator deposits each reward via `ft_transfer_call` `{action:"deposit_reward"}` → `activate_machine` after on-chain deposit check.
4. **Withdraw:** creator / platform fee receiver pull earnings (with FT callbacks where applicable).
