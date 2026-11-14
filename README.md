# NearMyst

**On-chain mystery packs for NEAR** — creators launch inventory-backed gacha machines with published odds; players buy packs with a NEP-141 FT, open them later, and receive FT rewards.

> **TESTNET DEMO only. Not audited. Not for real money.**  
> Repo: **[https://github.com/Lokmali/NearMyst](https://github.com/Lokmali/NearMyst)**  
> Live demo: deploy `web/` to Vercel ([docs/vercel.md](./docs/vercel.md)), then put the production URL here.  
> Built for **NEAR HACKATHON** tracks: **Games With Real Economies**, **Open Innovation**.  
> Social: [X @Near_Myst](https://x.com/Near_Myst) · [Telegram](https://t.me/NearMyst) (support)

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
| Frontend | Vercel production URL (see [docs/vercel.md](./docs/vercel.md)) |
| Repo | [https://github.com/Lokmali/NearMyst](https://github.com/Lokmali/NearMyst) |

Screenshots: [docs/screenshots/](./docs/screenshots/) — home, home-mobile, explore, machine, create, inventory, result, 404.

## How it works

1. **Create** a machine (odds must sum to 10_000 bps; attach `0.05 Ⓝ + max_packs × 0.001 Ⓝ`).
2. **Deposit** reward FT via `ft_transfer_call` (`deposit_reward`).
3. **Activate** when deposited slots ≥ `max_packs`.
4. **Buy** packs with payment FT (`buy`, max **50** packs per purchase).
5. **Wait** for a later block than purchase (testnet randomness rule).
6. **Open** → reward FT transfer, or **PendingClaim** (“Reward waiting for you”) + `claim_pending` if the transfer fails.
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
| Contract | Rust `near-sdk` 5.30 · allocation, validation, randomness, events, ft_ext |
| Frontend | Next.js 15 · React 19 · Tailwind 3.4 · Wallet Selector v10 · `motion` |
| Scripts | PowerShell + bash seed / e2e (file-args, no keys in repo) |

More: [docs/architecture.md](./docs/architecture.md) · [docs/smart-contracts.md](./docs/smart-contracts.md) · [docs/security.md](./docs/security.md)

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
npm ci
npm run dev                     # http://localhost:3000
```

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_NETWORK` | `testnet` |
| `NEXT_PUBLIC_GACHA_CONTRACT` | `app.nearmyst.testnet` |
| `NEXT_PUBLIC_NEAR_RPC` | `https://test.rpc.fastnear.com` |
| `NEXT_PUBLIC_EXPLORER_URL` | `https://testnet.nearblocks.io` |
| `NEXT_PUBLIC_DEFAULT_PAYMENT_TOKEN` | `ft.nearmyst.testnet` |

**Dev vs build:** `npm run build` uses `.next` (Vercel-ready). For local verification use **`npm run build:local`** (writes `.next-build`). **Never run `npm run build` while `npm run dev` is running** — it overwrites `.next` and breaks CSS/JS (404).

### Seed (after deploy)

```powershell
$env:GACHA_CONTRACT="app.nearmyst.testnet"
$env:GACHA_FT_ACCOUNT="ft.nearmyst.testnet"
$env:GACHA_CREATOR="creator.nearmyst.testnet"
.\scripts\seed-testnet.ps1 -Wallet YOUR_WALLET.testnet
```

Deploy details: [docs/deployment.md](./docs/deployment.md).

## Security (honest)

**Hardened in this repo (demo-grade):** CEI double-open / claim gates, fee overflow checks, unique tiers, per-buy cap 50, FT msg length cap, reserved/unopened inventory invariant, withdraw resolve callbacks, create prepaid storage, pause rules, event standard `nearmyst`, seed script machine-id parsing fix.

**Not production-ready:**

- Testnet RNG via `env::random_seed()` — validators can influence the seed; open timing matters. **Mainnet needs VRF or an oracle.**
- Demo `mock_ft` (raw integer units, no decimals metadata).
- No formal audit.
- Storage / legal / real NEP-141 economics not finished for mainnet.

Details: [docs/security.md](./docs/security.md) · [docs/mainnet-checklist.md](./docs/mainnet-checklist.md)

## Tests & CI

- Contract: `cargo test --lib` (47 unit tests)
- Web: `npm test`, `npm run lint`, `npm run build` / `build:local`
- GitHub Actions: [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)

## Submission pack

- Demo script: [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md)
- Form / X draft: [docs/SUBMISSION.md](./docs/SUBMISSION.md)
- Vercel: [docs/vercel.md](./docs/vercel.md)

## License

MIT — [LICENSE](./LICENSE) (NearMyst contributors)
