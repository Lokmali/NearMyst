# NearMyst — 90-second demo script

Use this for the hackathon demo video / live walkthrough. Testnet only.

## Recording checklist

- [ ] 1080p (or 1440p), stable framerate
- [ ] Include a short **mobile** clip (≈390px) of home or machine
- [ ] Testnet badge visible in the header
- [ ] Never show seed phrases, private keys, or `.env` contents
- [ ] Prefer a wallet already funded with demo FT (or show Get test tokens → seed command briefly)
- [ ] Explorer tab ready for one tx hash

## Spoken flow (~90s)

| Time | Click / show | Say |
|------|----------------|-----|
| 0:00–0:08 | Home hero | “NearMyst is an on-chain mystery-pack launchpad on NEAR — creators publish odds and inventory; players buy and open packs with real FT transfers.” |
| 0:08–0:18 | Connect wallet + onboarding checklist | “Connect a testnet wallet. The checklist walks first-time users: network, tokens, explore.” |
| 0:18–0:28 | Get test tokens / seed note | “Demo FT is `ft.nearmyst.testnet`. Seed script funds your wallet — not real money.” |
| 0:28–0:40 | Explore → open a machine | “Explore lists Active machines. Here are the published odds — Common, Rare, Epic — summing to 100%.” |
| 0:40–0:55 | Buy 1 pack | “Buy one pack. Cap is 50 per purchase. Wallet signs `ft_transfer_call` into the gacha contract.” |
| 0:55–1:05 | Wait → Open | “You must open on a later block than purchase — that’s our testnet randomness rule. Open…” |
| 1:05–1:15 | Reveal + result page | “Reward is an FT transfer on-chain. Result page shows tier, amount, `random_ref`, and explorer link — no fake proofs.” |
| 1:15–1:25 | Create page (quick) | “Creators set odds, attach prepaid storage `0.05 + packs × 0.001` NEAR, deposit rewards, activate.” |
| 1:25–1:30 | Close on disclaimer | “Odds and inventory are on-chain. Randomness is testnet-only — mainnet would need VRF. Built at NEAR HACKATHON.” |

## Optional 20s extras (if time)

- Pause / unpause as creator
- Inventory list of packs
- NearBlocks contract page for `app.nearmyst.testnet`

## Do not say

- That RNG is VRF or “provably fair” in a cryptographic sense
- Fake user counts, TVL, or testimonials
- Anything about mainnet readiness without the checklist caveats
