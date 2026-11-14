# NearMyst — 90-second demo script

Use this for the hackathon demo video / live walkthrough. Testnet only.

## Recording checklist

- [ ] 1080p (or 1440p), stable framerate
- [ ] Include a short **mobile** clip (≈390px) of home or machine
- [ ] Testnet badge visible in the header
- [ ] Never show seed phrases, private keys, or `.env` contents
- [ ] Prefer a wallet already funded with demo FT
- [ ] Explorer tab ready for one tx hash

## Spoken flow (~90s)

| Time | Click / show | Say |
|------|----------------|-----|
| 0:00–0:10 | Home hero + testnet badge | “NearMyst is an on-chain mystery-pack launchpad on NEAR — published odds, inventory-backed FT rewards.” |
| 0:10–0:20 | Scroll How-it-works bento | “Six clear steps: pick, buy, wait one block for fairness, open, verify, and creators fund the prizes.” |
| 0:20–0:30 | Connect + checklist / FAQ peek | “Connect a testnet wallet. FAQ covers real money, RNG limits, and claim recovery.” |
| 0:30–0:40 | Explore → machine | “Explore shows Active machines. Odds are rarity + percent — not color alone. Cap is 50 packs per buy.” |
| 0:40–0:55 | Buy 1 pack | “Buy one pack. Wallet signs `ft_transfer_call`. Step tracker: Buy, Wait, Open, Reward.” |
| 0:55–1:08 | Wait → Open → reveal | “Open on a later block. Capsule opens, reward card lands, amount is on-chain — Skip available, Reduced Motion calm.” |
| 1:08–1:18 | Result / verify | “Verification timeline: bought, block gap, opened, paid — plus random_ref. No fake proofs.” |
| 1:18–1:25 | Create page (quick) | “Creators set odds, prepaid storage `0.05 + packs × 0.001` NEAR, deposit, activate.” |
| 1:25–1:30 | Close on disclaimer | “Odds and inventory are on-chain. Randomness is testnet-only — mainnet would need VRF. Built at NEAR HACKATHON.” |

## Do not say

- That RNG is VRF or cryptographically “provably fair”
- Fake user counts, TVL, or testimonials
- Mainnet readiness without the checklist caveats
