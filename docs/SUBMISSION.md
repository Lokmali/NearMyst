# NearMyst — submission pack (paste-ready)

Fill the remaining team / demo-URL / X-post fields before the form deadline.

## Form fields

| Field | Value |
|-------|--------|
| Project name | NearMyst |
| Team lead | _(your name)_ |
| Team size | _(number)_ |
| Tracks | Games With Real Economies; Open Innovation |
| NEAR wallet (prizes) | `nearmyst.testnet` _(confirm prize network)_ |
| Repo | https://github.com/Lokmali/NearMyst |
| Live demo | _(Vercel production URL after deploy — see [vercel.md](./vercel.md))_ |
| Demo post (X) | _(link to https://x.com/Near_Myst post)_ |
| Support | https://t.me/NearMyst |

## Description (≈1250 characters — within 20–2000)

NearMyst is a testnet mystery-pack (gacha) launchpad on NEAR. Creators deploy machines with published odds (basis points summing to 100%) and inventory-backed FT rewards. Players buy packs with a NEP-141 token via `ft_transfer_call`, wait for a later block, then open on-chain to receive FT rewards — with PendingClaim recovery if a transfer fails.

The stack is a Rust near-sdk contract (`app.nearmyst.testnet`) plus a Next.js 15 + Wallet Selector frontend with a polished buy → wait → open → reveal loop aimed at the Games track. Demo payment/reward token is `ft.nearmyst.testnet`. Hardening includes CEI open/claim gates, per-buy pack caps, unique-tier validation, reserved-inventory invariants, and withdraw resolve callbacks. Events use standard `nearmyst` for explorer verification.

Honest limits: randomness uses testnet `env::random_seed()` (not VRF); this is a demo, not audited, and not for real money. Mainnet would need VRF/oracle randomness, a formal audit, and production FTs. Built at NEAR HACKATHON for Games With Real Economies and Open Innovation.

## X post draft

```
Built at NEAR HACKATHON

NearMyst — on-chain mystery packs on NEAR testnet:
• Creators publish odds + inventory-backed FT rewards
• Buy → wait one block → open → verify on explorer

Demo: (paste Vercel URL)
Contract: app.nearmyst.testnet
Repo: https://github.com/Lokmali/NearMyst
Support: https://t.me/NearMyst

@NEARProtocol #NEARHackathon
```

## What judges can verify in 2 minutes

1. Open the live demo — Testnet badge + contract id `app.nearmyst.testnet`.
2. Explorer: https://testnet.nearblocks.io/address/app.nearmyst.testnet
3. Clone → `cd contract && cargo test --lib` (47 tests).
4. `cd web && npm ci && npm run build` with the five `NEXT_PUBLIC_*` values from `.env.example`.
5. Optional: seed script + buy/open one pack; check `/result/1` timeline.

## After you submit

- [ ] Repo is **public**
- [ ] Vercel production URL works with wallet connect
- [ ] Demo post is public and matches [DEMO_SCRIPT.md](./DEMO_SCRIPT.md)
- [ ] Live demo URL is pasted into README + this file
