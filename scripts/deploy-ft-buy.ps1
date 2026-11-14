# Redeploy mock_ft.wasm to ft.nearmyst.testnet (adds buy() — keeps existing balances).
# Usage: .\scripts\deploy-ft-buy.ps1
# Requires: rustc + wasm32 target, near CLI, keychain access for the FT account.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$FT = if ($env:GACHA_FT_ACCOUNT) { $env:GACHA_FT_ACCOUNT } else { "ft.nearmyst.testnet" }
$NETWORK = if ($env:NEAR_NETWORK) { $env:NEAR_NETWORK } else { "testnet" }
$MockDir = Join-Path $Root "contract\mock_ft"
$Wasm = Join-Path $MockDir "target\wasm32-unknown-unknown\release\mock_ft.wasm"

Write-Host "==> Building mock_ft"
Push-Location $MockDir
try {
  cargo build --target wasm32-unknown-unknown --release
} finally {
  Pop-Location
}

if (-not (Test-Path $Wasm)) {
  throw "Missing wasm: $Wasm"
}

Write-Host "==> Deploying $Wasm -> $FT ($NETWORK)"
near contract deploy $FT `
  use-file $Wasm `
  without-init-call `
  network-config $NETWORK sign-with-keychain send

Write-Host "==> Verifying get_buy_rate"
near contract call-function as-read-only $FT get_buy_rate json-args "{}" `
  network-config $NETWORK now

Write-Host "Done. Open /buy and swap testnet NEAR for `$myst."
