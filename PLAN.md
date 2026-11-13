# NearMyst — MVP Plan (completed + hardening)

Working testnet demo of a Gacha (mystery pack) launchpad on NEAR.  
Scope: **one working end-to-end FT flow** plus money-safety fixes for demo redeploy.

## Verified toolchain

| Tool | Version | Notes |
|------|---------|--------|
| `near-sdk` | **5.30.1** | |
| `near-contract-standards` | **5.30.1** | |
| Frontend | Next.js 15 + Wallet Selector **v10** | |
| Unit tests | **`cargo test --lib` → 42 passed** | Windows OK |
| Vitest | **9 passed** | `web` odds utilities |
| WASM | `cargo build --target wasm32-unknown-unknown --release` | `cargo-near` optional |

## Days 1–4 (historical) — DONE

Contract buy/open/payout, frontend pages, seed/E2E scripts, multi-wallet.

## Hardening pass (post-audit) — DONE in tree

- F01 withdraw resolve callbacks (creator / platform / inventory)
- F03 unpause uses sellable ≥ unsold
- F04 create prepaid storage `0.05 Ⓝ + max_packs×0.001 Ⓝ`
- Description / image_url length caps
- mock_ft payable NEP-141-like `storage_deposit`
- UI: inventory withdraw, platform fee panel, storage helpers, tx verify, network banner
- Docs: Vercel, mainnet checklist, deployment for **new** account
- CI: web + contract + Linux sandbox

## Explicit non-goals

NFT rewards, admin dashboards, indexer/DB, referrals, staking, token launch, mainnet, fake randomness proofs.

## Security assumptions (demo)

- Testnet `env::random_seed()` — **not** production-secure
- No audit
- FT-only rewards
- No indexer
