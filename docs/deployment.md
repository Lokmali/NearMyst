# Deployment (testnet)

NearMyst accounts (current):

| Account | Role |
|---------|------|
| `nearmyst.testnet` | Owner, fee receiver, demo buyer |
| `app.nearmyst.testnet` | NearMyst gacha contract |
| `ft.nearmyst.testnet` | Demo payment / reward FT |
| `creator.nearmyst.testnet` | Seed / creator account |

## Build WASM

```bash
cd contract
cargo test --lib
cargo build --target wasm32-unknown-unknown --release
```

Output: `contract/target/wasm32-unknown-unknown/release/nearmyst.wasm`

**Note:** `cargo-near` is optional. near-sdk 5.30 prefers `cargo near build`; if it is not installed, use the wasm32 target above.

## Create account + deploy + init

**Never paste private keys into chat or git.** Use temp JSON args files and delete them after.

```bash
# 1) Create sub-account funded by nearmyst.testnet
near account create-account fund-myself app.nearmyst.testnet '8 NEAR' \
  autogenerate-new-keypair save-to-keychain \
  sign-as nearmyst.testnet network-config testnet sign-with-keychain send

# Also create ft.nearmyst.testnet (~3 NEAR) and creator.nearmyst.testnet (~4 NEAR).
# Wasm storage ≈ 1 NEAR per 100 KB (nearmyst.wasm ~495 KB → ~5 NEAR; mock_ft ~220 KB → ~2.3 NEAR).

# 2) Deploy
cd contract
near contract deploy app.nearmyst.testnet \
  use-file ./target/wasm32-unknown-unknown/release/nearmyst.wasm \
  without-init-call \
  network-config testnet sign-with-keychain send

# 3) Initialize ONCE (temp new-args.json then delete)
# { "owner": "nearmyst.testnet", "fee_receiver": "nearmyst.testnet", "platform_fee_bps": 250 }
near contract call-function as-transaction app.nearmyst.testnet new \
  file-args ./new-args.json \
  prepaid-gas "50.0 Tgas" attached-deposit "0 NEAR" \
  sign-as app.nearmyst.testnet network-config testnet sign-with-keychain send
```

Register the contract on the demo FT:

```bash
near contract call-function as-transaction ft.nearmyst.testnet storage_deposit \
  json-args '{"account_id":"app.nearmyst.testnet","registration_only":true}' \
  prepaid-gas "30.0 Tgas" attached-deposit "0.00125 NEAR" \
  sign-as creator.nearmyst.testnet network-config testnet sign-with-keychain send
```

## Frontend env

```bash
cd web
cp ../.env.example .env.local
# NEXT_PUBLIC_GACHA_CONTRACT=app.nearmyst.testnet
# NEXT_PUBLIC_DEFAULT_PAYMENT_TOKEN=ft.nearmyst.testnet
npm install
npm run dev
```

## Seed

```powershell
$env:GACHA_CONTRACT="app.nearmyst.testnet"
$env:GACHA_FT_ACCOUNT="ft.nearmyst.testnet"
$env:GACHA_CREATOR="creator.nearmyst.testnet"
.\scripts\seed-testnet.ps1 -Wallet nearmyst.testnet
```

```bash
export GACHA_CONTRACT=app.nearmyst.testnet
export GACHA_FT_ACCOUNT=ft.nearmyst.testnet
export GACHA_CREATOR=creator.nearmyst.testnet
./scripts/seed-testnet.sh nearmyst.testnet
```

## Platform fee withdraw (CLI)

```bash
near contract call-function as-transaction app.nearmyst.testnet withdraw_platform_earnings \
  json-args '{"machine_id":1}' \
  prepaid-gas "100.0 Tgas" attached-deposit "0 NEAR" \
  sign-as nearmyst.testnet network-config testnet sign-with-keychain send
```

Owner / fee_receiver can also use the in-app **Platform fees** panel on `/machine/[id]`.

## Frontend host

See [vercel.md](./vercel.md).
