# NearMyst

**On-chain mystery packs for NEAR** — creators launch inventory-backed gacha machines with published odds; players buy packs with a NEP-141 FT, open them later, and receive FT rewards.

> **TESTNET DEMO only. Not audited. Not for real money.**  
> Live demo: **[VERCEL_URL]**  
> Built for **NEAR HACKATHON** tracks: **Games With Real Economies**, **Open Innovation**.  
> Built during the hackathon: **[USER: confirm start date and team]**

## Who it is for

- Creators who want transparent, on-chain pack odds and inventory.
- Players who want to buy / open packs and verify results on the explorer.
- Judges / builders who want a runnable NEAR testnet demo with honest security limits.

## Why NEAR

NEAR account model + NEP-141 `ft_transfer_call` gives a clean buy/deposit flow, Wallet Selector covers multiple wallets, and contract events (`standard: nearmyst`) are easy to verify on NearBlocks.

## Live testnet

| Piece | ID / link |
|-------|-----------|
| Gacha contract | [`app.nearmyst.testnet`](https://testnet.nearblocks.io/address/app.nearmyst.testnet) |
| Demo FT | [`ft.nearmyst.testnet`](https://testnet.nearblocks.io/address/ft.nearmyst.testnet) |
| Seed creator | `creator.nearmyst.testnet` |
| Owner / fee receiver | `nearmyst.testnet` |
| Frontend | [VERCEL_URL] |

Screenshots: [docs/screenshots/](./docs/screenshots/) (home, explore, machine, create, inventory, result, mobile home).

## How it works

1. **Create** a machine (odds must sum to 10_000 bps; attach `0.05 Ⓝ + max_packs × 0.001 Ⓝ`).
2. **Deposit** reward FT via `ft_transfer_call` (`deposit_reward`).
3. **Activate** when deposited slots ≥ `max_packs`.
4. **Buy** packs with payment FT (`buy`, max **50** packs per purchase).
5. **Wait** for a later block than purchase (testnet randomness rule).
6. **Open** → reward FT transfer, or **PendingClaim** + `claim_pending` if the transfer fails.
7. Creators / platform can **withdraw** earnings; creators can pause / unpause.

## Architecture

```
Wallet Selector v10  ──signed txs──►  app.nearmyst.testnet
RPC views (@near-js) ──read───────►         ▲
                                            │ ft_transfer_call
                                   ft.nearmyst.testnet (mock NEP-141)
```

| Area | Stack |
|------|--------|
| Contract | Rust `near-sdk` 5.30 · modules: allocation, validation, randomness, events, ft_ext |
| Frontend | Next.js 15 · React 19 · Tailwind 3.4 · Wallet Selector v10 |
| Scripts | PowerShell + bash seed / e2e (file-args, no keys in repo) |

More: [docs/architecture.md](./docs/architecture.md) · [docs/smart-contracts.md](./docs/smart-contracts.md)

## Run locally

### Prerequisites

- Node.js **20+** (24 OK)
- Rust + target `wasm32-unknown-unknown`
- [near-cli-rs](https://github.com/near/near-cli-rs) with keychain (never commit keys)

### Contract

```bash
cd contract
cargo test --lib
cargo build --target wasm32-unknown-unknown --release
# → contract/target/wasm32-unknown-unknown/release/nearmyst.wasm
```

### Frontend

```bash
cd web
cp ../.env.example .env.local   # edit NEXT_PUBLIC_* only
npm ci                          # or npm install
npm run dev                     # http://localhost:3000
```

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_NETWORK` | `testnet` |
| `NEXT_PUBLIC_GACHA_CONTRACT` | `app.nearmyst.testnet` |
| `NEXT_PUBLIC_NEAR_RPC` | `https://test.rpc.fastnear.com` |
| `NEXT_PUBLIC_EXPLORER_URL` | `https://testnet.nearblocks.io` |
| `NEXT_PUBLIC_DEFAULT_PAYMENT_TOKEN` | `ft.nearmyst.testnet` |

**Dev vs build:** `npm run build` uses the default `.next` directory (Vercel-compatible). For local verification while `next dev` may be running, use **`npm run build:local`** (writes `.next-build`). **Never run `npm run build` while `npm run dev` is running** — it overwrites `.next` and breaks CSS/JS (404).

### Deploy testnet (summary)

See [docs/deployment.md](./docs/deployment.md). Rough flow:

1. Create `app` / `ft` / `creator` subaccounts under your parent (fund for wasm storage ≈ 1 Ⓝ / 100 KB).
2. Deploy `nearmyst.wasm` → `app.…`, call `new` once (owner, fee_receiver, platform_fee_bps).
3. Deploy `mock_ft.wasm` → `ft.…`, call `new` (owner_id, total_supply).
4. `storage_deposit` for app, creator, and your wallet on the FT.
5. Seed:

```powershell
$env:GACHA_CONTRACT="app.nearmyst.testnet"
$env:GACHA_FT_ACCOUNT="ft.nearmyst.testnet"
$env:GACHA_CREATOR="creator.nearmyst.testnet"
.\scripts\seed-testnet.ps1 -Wallet YOUR_WALLET.testnet
```

## Security (honest)

**Hardened in this repo (demo-grade):** CEI double-open / claim gates, fee overflow checks, unique tiers, per-buy cap 50, FT msg length cap, reserved/unopened inventory invariant, withdraw resolve callbacks, create prepaid storage, pause rules, event standard `nearmyst`.

**Not production-ready:**

- Testnet RNG via `env::random_seed()` — validators can influence the seed; open timing matters. **Mainnet needs VRF or an oracle.**
- Demo `mock_ft` (raw integer units, no decimals metadata).
- No formal audit.
- Storage / legal / real NEP-141 economics not finished for mainnet.

Details: [docs/security.md](./docs/security.md) · [docs/mainnet-checklist.md](./docs/mainnet-checklist.md)

## Tests & CI

- Contract: `cargo test --lib` (47 unit tests)
- Web: `npm test` (Vitest), `npm run lint`, `npm run build`
- GitHub Actions: web + contract (+ Linux sandbox where configured)

## Submission pack

- Demo script: [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md)
- Form / X draft: [docs/SUBMISSION.md](./docs/SUBMISSION.md)
- Vercel: [docs/vercel.md](./docs/vercel.md)

## License

MIT — [LICENSE](./LICENSE) (NearMyst contributors)
