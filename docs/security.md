# NearMyst Security Notes

> **TESTNET DEMO — not for real value.**  
> Pack randomness uses NEAR `env::random_seed()` mixed with pack/machine/opener/block data. **This is not VRF and not production-secure.** Block producers can influence the seed; open timing / MEV can matter. **Mainnet needs a verifiable randomness source (VRF or oracle)** before real funds. See [mainnet-checklist.md](./mainnet-checklist.md).

## Controls implemented

| Risk | Mitigation |
|------|------------|
| Double-open | CEI: pack status → Opened before FT call |
| Double-claim | PendingClaim + status gates; `claim_pending` |
| Unauthorized deposit | Creator-only; predecessor = reward token |
| Wrong buy token/amount | `payment_token` + exact `price * qty` |
| Fee overflow | `u128` checked math; fee bps capped at 1000 |
| Bad odds | Probabilities must equal 10_000; **unique tiers** |
| Per-buy pack spam | `MAX_BUY_QUANTITY` = 50 |
| Oversized FT msg | `ft_on_transfer` msg ≤ 256 bytes |
| Reserved / unopened drift | Consume releases reserved on awarded line or another reserved line |
| Reserved withdrawal | `max_withdrawable_units` + pause/Draft only |
| FT payout failure | Callback → PendingClaim + `claim_pending` |
| Earnings / inventory FT failure | Resolve callbacks restore ledger (`on_*_withdrawn`) |
| Pause bypass | No buys when Paused; opens still allowed |
| Pack storage griefing | Create attaches `0.05 Ⓝ + max_packs × 0.001 Ⓝ` prepaid |
| Oversized metadata | description ≤ 512, image_url ≤ 256 |
| FT callback gas | Transfer 50 Tgas + resolve 40 Tgas (prepaid open/claim/withdraw ≥ 200 Tgas) |

## Remaining / accepted for demo

| Risk | Status |
|------|--------|
| Validator / seed influence | **Accepted** — testnet RNG only; mainnet needs VRF/oracle |
| Open timing / MEV | **Accepted** for demo |
| Malicious FT reentrancy beyond CEI | Partially mitigated; audit before mainnet |
| Unbounded `user_packs` growth | Mitigated by per-buy cap; full storage redesign deferred |
| No formal audit | Explicit |
| Demo FT (`mock_ft`) | Raw integer units; not a production NEP-141 |

## Assumptions

- No audit. Do not use with real value.
- FT rewards only — no NFTs.
- Frontend trusts RPC views; always verify critical txs on the explorer.
