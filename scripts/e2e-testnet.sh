#!/usr/bin/env bash
# NearMyst TESTNET E2E (happy path). Full PendingClaim path: see e2e-testnet.ps1.
# Requires: near CLI keychain; env GACHA_CONTRACT set to deployed account.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GACHA="${GACHA_CONTRACT:-app.nearmyst.testnet}"
FT="${GACHA_FT_ACCOUNT:-ft.nearmyst.testnet}"
CREATOR="${GACHA_CREATOR:-creator.nearmyst.testnet}"
BUYER="${GACHA_BUYER:-nearmyst.testnet}"
NETWORK=testnet
ARGS_DIR="$ROOT/scripts/e2e-args"
LOG="$ROOT/scripts/e2e-last-run.log"
mkdir -p "$ARGS_DIR"
: >"$LOG"

near_cmd() {
  echo "> near $*" >&2
  # shellcheck disable=SC2068
  near $@ 2>&1 | tee -a "$LOG" | sed -E 's/(ed25519:)?[A-Za-z0-9]{40,}/[REDACTED]/g'
}

block_height() {
  curl -s https://rpc.testnet.near.org -H 'content-type: application/json' \
    -d '{"jsonrpc":"2.0","id":"1","method":"block","params":{"finality":"final"}}' \
    | sed -n 's/.*"height":\([0-9]*\).*/\1/p' | head -1
}

wait_later() {
  local after="$1" h
  for _ in $(seq 1 90); do
    sleep 1
    h="$(block_height)"
    if [[ -n "$h" && "$h" -gt "$after" ]]; then
      echo "block $h"
      return 0
    fi
  done
  echo "timeout waiting for later block" >&2
  exit 1
}

echo "E2E GACHA=$GACHA FT=$FT"

for acct in "$BUYER" "$CREATOR" "$GACHA"; do
  echo "{\"account_id\":\"$acct\",\"registration_only\":true}" >"$ARGS_DIR/storage-$acct.json"
  near_cmd contract call-function as-transaction "$FT" storage_deposit file-args "$ARGS_DIR/storage-$acct.json" \
    prepaid-gas "30.0 Tgas" attached-deposit "0.00125 NEAR" \
    sign-as "$CREATOR" network-config "$NETWORK" sign-with-keychain send || true
done

cat >"$ARGS_DIR/create-machine.json" <<EOF
{"name":"TESTNET DEMO E2E Machine","description":"E2E script machine","image_url":"https://example.com/nearmyst-e2e.png","payment_token":"$FT","pack_price":"1000","max_packs":3,"tiers":[{"tier":"Common","probability_bps":7000},{"tier":"Rare","probability_bps":3000}],"rewards":[{"token":"$FT","amount_per_win":"100","tier":"Common","quantity":2},{"token":"$FT","amount_per_win":"500","tier":"Rare","quantity":1}]}
EOF

near_cmd contract call-function as-transaction "$GACHA" create_machine file-args "$ARGS_DIR/create-machine.json" \
  prepaid-gas "100.0 Tgas" attached-deposit "0.053 NEAR" \
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

for pair in "0:200" "1:500"; do
  RID="${pair%%:*}"; AMT="${pair##*:}"
  MSG="{\\\"action\\\":\\\"deposit_reward\\\",\\\"machine_id\\\":$MID,\\\"reward_id\\\":$RID}"
  echo '{"receiver_id":"'"$GACHA"'","amount":"'"$AMT"'","memo":null,"msg":"'"$MSG"'"}' >"$ARGS_DIR/dep-$RID.json"
  near_cmd contract call-function as-transaction "$FT" ft_transfer_call file-args "$ARGS_DIR/dep-$RID.json" \
    prepaid-gas "100.0 Tgas" attached-deposit "1 yoctoNEAR" \
    sign-as "$CREATOR" network-config "$NETWORK" sign-with-keychain send
done

echo '{"machine_id":'"$MID"'}' >"$ARGS_DIR/activate.json"
near_cmd contract call-function as-transaction "$GACHA" activate_machine file-args "$ARGS_DIR/activate.json" \
  prepaid-gas "50.0 Tgas" attached-deposit "0 NEAR" \
  sign-as "$CREATOR" network-config "$NETWORK" sign-with-keychain send

MSG="{\\\"action\\\":\\\"buy\\\",\\\"machine_id\\\":$MID,\\\"quantity\\\":1}"
echo '{"receiver_id":"'"$GACHA"'","amount":"1000","memo":null,"msg":"'"$MSG"'"}' >"$ARGS_DIR/buy.json"
near_cmd contract call-function as-transaction "$FT" ft_transfer_call file-args "$ARGS_DIR/buy.json" \
  prepaid-gas "100.0 Tgas" attached-deposit "1 yoctoNEAR" \
  sign-as "$BUYER" network-config "$NETWORK" sign-with-keychain send

echo '{"account_id":"'"$BUYER"'","from":0,"limit":10}' >"$ARGS_DIR/user-packs.json"
PACKS=$(near contract call-function as-read-only "$GACHA" get_user_packs file-args "$ARGS_DIR/user-packs.json" network-config "$NETWORK" now)
PACK_ID=$(echo "$PACKS" | grep -oE '[0-9]+' | tail -1)
echo '{"pack_id":'"$PACK_ID"'}' >"$ARGS_DIR/pack.json"
PACK_VIEW=$(near contract call-function as-read-only "$GACHA" get_pack file-args "$ARGS_DIR/pack.json" network-config "$NETWORK" now)
PURCHASED=$(echo "$PACK_VIEW" | grep -oE '"purchased_at_block"[[:space:]]*:[[:space:]]*[0-9]+' | grep -oE '[0-9]+' | tail -1)
wait_later "$PURCHASED"

near_cmd contract call-function as-transaction "$GACHA" open_pack file-args "$ARGS_DIR/pack.json" \
  prepaid-gas "200.0 Tgas" attached-deposit "0 NEAR" \
  sign-as "$BUYER" network-config "$NETWORK" sign-with-keychain send

echo "E2E happy path done. For PendingClaim recovery use scripts/e2e-testnet.ps1"
