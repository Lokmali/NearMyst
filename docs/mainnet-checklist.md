# Mainnet readiness checklist

NearMyst is a **testnet demo**. Do not take real value until every item below is closed.

## Randomness

- [ ] Replace `TestnetRandomness` / `env::random_seed` with VRF or a reputable oracle
- [ ] Remove or gate any UX that implies cryptographic proofs of fairness
- [ ] Document the entropy source and commit/reveal or VRF verify path

## Security & money

- [ ] Third-party smart-contract audit
- [ ] Confirm withdraw resolve callbacks on the mainnet build
- [ ] Threat model for malicious NEP-141 contracts
- [ ] Storage economics review (prepaid create deposit vs usage)
- [ ] Formal pause / incident response runbook

## Tokens & product

- [ ] Production payment + reward FTs (e.g. wNEAR, USDC.e) — not mock_ft
- [ ] Storage registration UX verified on those FTs
- [ ] Legal / compliance review for gacha / chance-based rewards in target jurisdictions
- [ ] Optional indexer for history (RPC-only UI will not scale)

## Ops

- [ ] Fresh mainnet account + reproducible WASM (`cargo near` preferred)
- [ ] Key ceremony / multisig for `owner` and `fee_receiver`
- [ ] Monitoring on `withdraw_failed` / `reward_failed` events
- [ ] Frontend env pointed at mainnet RPC + explorer
