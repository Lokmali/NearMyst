# NearMyst — submission pack (paste-ready)

Fill every `[USER: …]` and `[VERCEL_URL]` / `[REPO_URL]` / `[DEMO_POST_URL]` before submitting.

## Form fields

| Field | Value |
|-------|--------|
| Project name | NearMyst |
| Team lead | [USER: team lead name] |
| Team size | [USER: team size] |
| Tracks | Games With Real Economies; Open Innovation |
| NEAR wallet (prizes) | [USER: prize wallet; check whether prizes are paid on mainnet] |
| Repo | [REPO_URL] (expected: `https://github.com/Lokmali/NearMyst`) |
| Live demo | [VERCEL_URL] |
| Demo post (X) | [DEMO_POST_URL] |

## Description (≈1200 characters — within 20–2000)

NearMyst is a testnet mystery-pack (gacha) launchpad on NEAR. Creators deploy machines with published odds (basis points summing to 100%) and inventory-backed FT rewards. Players buy packs with a NEP-141 token via `ft_transfer_call`, wait for a later block, then open on-chain to receive FT rewards — with PendingClaim recovery if a transfer fails.

The stack is a Rust near-sdk contract (`app.nearmyst.testnet`) plus a Next.js 15 + Wallet Selector frontend. Demo payment/reward token is `ft.nearmyst.testnet`. Hardening includes CEI open/claim gates, per-buy pack caps, unique-tier validation, reserved-inventory invariants, and withdraw resolve callbacks. Events use standard `nearmyst` for easy explorer verification.

Honest limits: randomness uses testnet `env::random_seed()` (not VRF); this is a demo, not audited, and not for real money. Mainnet would need VRF/oracle randomness, a formal audit, and production FTs. Built at NEAR HACKATHON for Games With Real Economies and Open Innovation.

## X post draft

```
Built at NEAR HACKATHON 🚀

NearMyst — on-chain mystery packs on NEAR testnet:
• Creators publish odds + inventory-backed FT rewards
• Players buy/open packs; results + random_ref on explorer

Demo: [VERCEL_URL]
Contract: app.nearmyst.testnet
Repo: [REPO_URL]

@NEARProtocol #NEARHackathon
```

## What judges can verify in 2 minutes

1. Open [VERCEL_URL] — Testnet badge + contract id `app.nearmyst.testnet` in the UI.
2. Explorer: https://testnet.nearblocks.io/address/app.nearmyst.testnet
3. Clone repo → `cd contract && cargo test --lib` (47 tests).
4. `cd web && npm ci && npm run build` with the five `NEXT_PUBLIC_*` values from `.env.example`.
5. Optional: `.\scripts\seed-testnet.ps1 -Wallet YOUR.testnet` then buy/open one pack.

## After you submit

- [ ] Repo is **public**
- [ ] Vercel production URL works with wallet connect
- [ ] Demo post is public and matches the script in [DEMO_SCRIPT.md](./DEMO_SCRIPT.md)
- [ ] Placeholders in README + this file are filled
