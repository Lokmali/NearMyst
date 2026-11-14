# NearMyst — hackathon demo video script

**Length:** ~90 seconds (cut to 60s using the short version).  
**Tracks:** Games With Real Economies · Open Innovation.  
**Network:** NEAR **testnet** only. Not real money.

## Before you hit record

- [ ] Live site (custom domain or Vercel), Testnet badge visible
- [ ] Wallet already connected on **testnet**, with a little NEAR + `$myst`
- [ ] One **Active** machine you can buy in one click
- [ ] 1080p, 30fps, browser full screen, hide bookmarks
- [ ] Never show seed phrases, keys, or `.env`
- [ ] Optional: 3-second phone clip of home

---

## Voiceover — read this (≈90 seconds)

*Speak calmly. Pause on wallet popups. Cut dead waits in edit.*

**[Home — 0:00]**  
NearMyst is an on-chain mystery-pack launchpad on NEAR. Creators publish the odds. Players buy a pack, wait one block, and open a mystery trunk for token rewards. This is a testnet demo — not real money.

**[How it works — 0:12]**  
The loop is simple: pick a machine, pay with `$myst`, wait, open, and check the result on-chain.

**[Buy $myst — 0:22]**  
Need play tokens? Swap free testnet NEAR for `$myst` at a fixed demo rate. One tap, wallet signs, tokens land in your account.

**[Explore + machine — 0:32]**  
Explore shows live machines. Odds are a real percent — Common, Rare, Epic — plus how many rewards are left in inventory.

**[Buy pack — 0:42]**  
Buy one pack. The wallet signs a token transfer into the contract. You wait one extra block so the open isn’t decided in the same block as the buy.

**[Open + reveal — 0:55]**  
Open. The trunk shakes, the lid lifts, and you see what you won — `$myst` already in your wallet. Everything you see is what the contract stored.

**[Create, 8 seconds — 1:12]**  
Creators name a drop, set odds that add to one hundred percent, deposit the prizes, then activate. No hidden inventory.

**[Close — 1:22]**  
Odds and inventory live on NEAR. Randomness is testnet-only — mainnet would need VRF. Built at NEAR HACKATHON. NearMyst.

---

## Super-short cut (~55–60 seconds)

If the form caps at one minute, skip Buy `$myst` and Create:

> NearMyst is mystery packs on NEAR testnet. Published odds, inventory-backed rewards. Connect a wallet, buy a pack with `$myst`, wait one block, open the trunk, take the win. Creators fund the prizes on-chain. Not real money, not VRF — a games demo for NEAR HACKATHON. Repo and contract are in the description.

---

## Shot list (match the VO)

| Time | Screen | Do |
|------|--------|-----|
| 0:00 | Home | Slow pan: logo, Testnet pill, Explore / Buy `$myst` |
| 0:12 | `#how` | Scroll the how-it-works tiles |
| 0:22 | `/buy` | Show 0.05 Ⓝ → `$myst` quote (don’t wait a full tx if short on time) |
| 0:32 | Explore → machine | Click one Active machine, show odds table |
| 0:42 | Buy 1 | Click Buy, approve wallet, show Buy → Wait → Open |
| 0:55 | Reveal | Let the trunk finish; linger on amount + rarity |
| 1:12 | `/create` | Scroll name + odds, don’t start a full create |
| 1:22 | Home or disclaimer | End on logo + “testnet demo” |

---

## On-screen text (lower thirds)

- NearMyst · NEAR testnet  
- Contract: `app.nearmyst.testnet`  
- Live URL · github.com/Lokmali/NearMyst  

## Do not say

- “Provably fair” or “VRF”
- Fake users, TVL, or “mainnet ready”
- That `$myst` has a market price (fixed demo mint only)

## End card (3 seconds)

```
NearMyst
Mystery packs on NEAR
Demo: (your live URL)
Repo: github.com/Lokmali/NearMyst
@Near_Myst · t.me/NearMyst
```
