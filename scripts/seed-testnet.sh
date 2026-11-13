#!/usr/bin/env bash
# Seed a TESTNET DEMO machine and fund YOUR wallet with test FT.
# Usage: ./scripts/seed-testnet.sh alice.testnet
# Requires: near CLI keychain for creator. Never prints private keys.
set -euo pipefail

WALLET="${1:-}"
if [[ -z "$WALLET" || ! "$WALLET" =~ \.testnet$ ]]; then
  echo "Usage: $0 YOUR_WALLET.testnet" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GACHA="${GACHA_CONTRACT:-app.nearmyst.testnet}"
FT="${GACHA_FT_ACCOUNT:-ft.nearmyst.testnet}"
CREATOR="${GACHA_CREATOR:-creator.nearmyst.testnet}"
NETWORK=testnet
ARGS_DIR="$ROOT/scripts/seed-args"
LOG="$ROOT/scripts/seed-last-run.log"
mkdir -p "$ARGS_DIR"
: >"$LOG"

near_cmd() {
  echo "> near $*" >&2
  # shellcheck disable=SC2068
  near $@ 2>&1 | tee -a "$LOG" | sed -E 's/(ed25519:)?[A-Za-z0-9]{40,}/[REDACTED]/g'
}

echo "NearMyst TESTNET seed GACHA=$GACHA FT=$FT Wallet=$WALLET"

echo '{"account_id":"'"$WALLET"'","registration_only":true}' >"$ARGS_DIR/storage-wallet.json"
near_cmd contract call-function as-transaction "$FT" storage_deposit file-args "$ARGS_DIR/storage-wallet.json" \
  prepaid-gas "30.0 Tgas" attached-deposit "0.00125 NEAR" \
  sign-as "$CREATOR" network-config "$NETWORK" sign-with-keychain send

echo '{"receiver_id":"'"$WALLET"'","amount":"50000","memo":"TESTNET DEMO seed"}' >"$ARGS_DIR/transfer-wallet.json"
near_cmd contract call-function as-transaction "$FT" ft_transfer file-args "$ARGS_DIR/transfer-wallet.json" \
  prepaid-gas "30.0 Tgas" attached-deposit "1 yoctoNEAR" \
  sign-as "$CREATOR" network-config "$NETWORK" sign-with-keychain send

TS="$(date +%H%M%S)"
cat >"$ARGS_DIR/create-machine.json" <<EOF
{
  "name": "TESTNET DEMO Mystery #$TS",
  "description": "TESTNET DEMO - seeded machine. Not production secure.",
  "image_url": "https://example.com/nearmyst-testnet-demo.png",
  "payment_token": "$FT",
  "pack_price": "1000",
  "max_packs": 10,
  "tiers": [
    { "tier": "Common", "probability_bps": 6000 },
    { "tier": "Rare", "probability_bps": 3000 },
    { "tier": "Epic", "probability_bps": 1000 }
  ],
  "rewards": [
    { "token": "$FT", "amount_per_win": "100", "tier": "Common", "quantity": 6 },
    { "token": "$FT", "amount_per_win": "500", "tier": "Rare", "quantity": 3 },
    { "token": "$FT", "amount_per_win": "2000", "tier": "Epic", "quantity": 1 }
  ]
}
EOF

# 0.05 + 10*0.001 NEAR
near_cmd contract call-function as-transaction "$GACHA" create_machine file-args "$ARGS_DIR/create-machine.json" \
  prepaid-gas "100.0 Tgas" attached-deposit "0.06 NEAR" \
  sign-as "$CREATOR" network-config "$NETWORK" sign-with-keychain send

echo '{"from":0,"limit":100}' >"$ARGS_DIR/list-machines.json"
LIST=$(near contract call-function as-read-only "$GACHA" list_machines file-args "$ARGS_DIR/list-machines.json" network-config "$NETWORK" now)
# Machine views include packs_remaining; reward rows also have "id" — do not take max of all ids.
MID=$(echo "$LIST" | python3 -c 'import sys,json,re; t=sys.stdin.read();
try:
  ms=json.loads(t[t.find("["):t.rfind("]")+1]); print(max(m["id"] for m in ms))
except Exception:
  ids=re.findall(r"\"id\"\s*:\s*(\d+)(?=[\s\S]{0,800}?\"packs_remaining\")", t); print(max(int(i) for i in ids) if ids else "")')
if [[ -z "$MID" ]]; then echo "Could not parse machine id" >&2; exit 1; fi
echo "machine_id=$MID"

for pair in "0:600" "1:1500" "2:2000"; do
  RID="${pair%%:*}"
  AMT="${pair##*:}"
  MSG="{\\\"action\\\":\\\"deposit_reward\\\",\\\"machine_id\\\":$MID,\\\"reward_id\\\":$RID}"
  echo '{"receiver_id":"'"$GACHA"'","amount":"'"$AMT"'","memo":null,"msg":"'"$MSG"'"}' >"$ARGS_DIR/deposit-reward-$RID.json"
  near_cmd contract call-function as-transaction "$FT" ft_transfer_call file-args "$ARGS_DIR/deposit-reward-$RID.json" \
    prepaid-gas "100.0 Tgas" attached-deposit "1 yoctoNEAR" \
    sign-as "$CREATOR" network-config "$NETWORK" sign-with-keychain send
done

echo '{"machine_id":'"$MID"'}' >"$ARGS_DIR/activate.json"
near_cmd contract call-function as-transaction "$GACHA" activate_machine file-args "$ARGS_DIR/activate.json" \
  prepaid-gas "50.0 Tgas" attached-deposit "0 NEAR" \
  sign-as "$CREATOR" network-config "$NETWORK" sign-with-keychain send

echo "SEED COMPLETE machine=#$MID on $GACHA — open /machine/$MID"
