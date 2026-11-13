#Requires -Version 5.1
<#
.SYNOPSIS
  Seed a TESTNET DEMO machine and fund YOUR wallet with test FT.

.PARAMETER Wallet
  Your testnet account id (e.g. alice.testnet). Required.

.EXAMPLE
  .\scripts\seed-testnet.ps1 -Wallet alice.testnet

Never prints or commits private keys. Uses near CLI keychain.
#>
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-z0-9._-]+\.testnet$')]
  [string]$Wallet
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Root "contract"))) {
  $Root = (Get-Location).Path
}
Set-Location $Root

$GACHA = if ($env:GACHA_CONTRACT) { $env:GACHA_CONTRACT } else { "app.nearmyst.testnet" }
$FT = if ($env:GACHA_FT_ACCOUNT) { $env:GACHA_FT_ACCOUNT } else { "ft.nearmyst.testnet" }
$CREATOR = if ($env:GACHA_CREATOR) { $env:GACHA_CREATOR } else { "creator.nearmyst.testnet" }
$NETWORK = "testnet"
$EXPLORER = "https://testnet.nearblocks.io/txns"
$ArgsDir = Join-Path $Root "scripts\seed-args"
New-Item -ItemType Directory -Force -Path $ArgsDir | Out-Null
$LOG = Join-Path $Root "scripts\seed-last-run.log"

function Write-Step([string]$msg) {
  Write-Host ""
  Write-Host ("=== " + $msg + " ===") -ForegroundColor Cyan
}

function Write-JsonFile([string]$path, [string]$json) {
  [System.IO.File]::WriteAllText($path, $json)
}

function Invoke-Near {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$CmdArgs)
  # Never log secrets - only the public command shape.
  Write-Host ("> near " + ($CmdArgs -join " ")) -ForegroundColor DarkGray
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $out = & near @CmdArgs 2>&1 | ForEach-Object { "$_" }
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  $text = $out -join "`n"
  # Strip anything that looks like a private key / seed before logging
  $safe = $text -replace '(ed25519:)?[A-Za-z0-9]{40,}', '[REDACTED]'
  Add-Content -Path $LOG -Value $safe
  Add-Content -Path $LOG -Value "`n-----`n"
  $tx = $null
  if ($text -match "Transaction ID:\s*(\S+)") { $tx = $Matches[1] }
  return [pscustomobject]@{ Text = $text; Tx = $tx; Ok = ($code -eq 0); Code = $code }
}

function Show-Tx($label, $result) {
  Write-Host ($label + " ok=" + $result.Ok + " tx=" + $result.Tx)
  if ($result.Tx) { Write-Host ($EXPLORER + "/" + $result.Tx) }
  if (-not $result.Ok) {
    throw ($label + " failed: " + $result.Text)
  }
}

if (Test-Path $LOG) { Remove-Item $LOG -Force }
Set-Content -Path $LOG -Value ("Seed start " + (Get-Date -Format o) + " wallet=" + $Wallet)
Write-Host "NearMyst TESTNET seed" -ForegroundColor Green
Write-Host ("GACHA=" + $GACHA + " FT=" + $FT + " Wallet=" + $Wallet)
Write-Host "Keys are never printed. Signing via near keychain only." -ForegroundColor Yellow

# --- Verify accounts exist (no key creation here) ---
Write-Step "Verify wallet account exists"
$wView = Invoke-Near account view-account-summary $Wallet network-config $NETWORK now
if ($wView.Text -notmatch "Native account balance") {
  throw ("Wallet account not found on testnet: " + $Wallet + ". Create it via faucet first.")
}

Write-Step "Verify creator + FT accounts"
foreach ($acct in @($CREATOR, $FT, $GACHA)) {
  $v = Invoke-Near account view-account-summary $acct network-config $NETWORK now
  if ($v.Text -notmatch "Native account balance") {
    throw ("Required account missing: " + $acct)
  }
}

# --- Register wallet on FT (NEP-141-style min ~0.00125 NEAR) ---
Write-Step ("storage_deposit for " + $Wallet + " on " + $FT)
$storPath = Join-Path $ArgsDir "storage-wallet.json"
Write-JsonFile $storPath ('{"account_id":"' + $Wallet + '","registration_only":true}')
$stor = Invoke-Near contract call-function as-transaction $FT storage_deposit file-args $storPath `
  prepaid-gas "30.0 Tgas" attached-deposit "0.00125 NEAR" `
  sign-as $CREATOR network-config $NETWORK sign-with-keychain send
Show-Tx "storage_deposit wallet" $stor

# --- Send test FT to wallet ---
Write-Step ("Transfer test FT to " + $Wallet)
$xferPath = Join-Path $ArgsDir "transfer-wallet.json"
# 50_000 demo units (mock FT has 0 decimals in e2e)
Write-JsonFile $xferPath ('{"receiver_id":"' + $Wallet + '","amount":"50000","memo":"TESTNET DEMO seed"}')
$xfer = Invoke-Near contract call-function as-transaction $FT ft_transfer file-args $xferPath `
  prepaid-gas "30.0 Tgas" attached-deposit "1 yoctoNEAR" `
  sign-as $CREATOR network-config $NETWORK sign-with-keychain send
Show-Tx "ft_transfer to wallet" $xfer

# --- Create fresh machine (10 packs, 3 tiers) ---
# Inventory slots: Common 6 + Rare 3 + Epic 1 = 10 >= max_packs
Write-Step "create_machine (TESTNET DEMO, 10 packs, 3 tiers)"
$cmJson = @"
{
  "name": "TESTNET DEMO Mystery #$(Get-Date -Format 'HHmmss')",
  "description": "TESTNET DEMO - seeded machine with Common / Rare / Epic FT rewards. Not production secure.",
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
"@
$cmPath = Join-Path $ArgsDir "create-machine.json"
Write-JsonFile $cmPath $cmJson
# 0.05 NEAR base + 10 * 0.001 NEAR per pack
$cm = Invoke-Near contract call-function as-transaction $GACHA create_machine file-args $cmPath `
  prepaid-gas "100.0 Tgas" attached-deposit "0.06 NEAR" `
  sign-as $CREATOR network-config $NETWORK sign-with-keychain send
Show-Tx "create_machine" $cm

$listPath = Join-Path $ArgsDir "list-machines.json"
Write-JsonFile $listPath '{"from":0,"limit":100}'
$list = Invoke-Near contract call-function as-read-only $GACHA list_machines file-args $listPath network-config $NETWORK now
# Machine views include packs_remaining; reward rows also have "id" — do not take max of all ids.
$ids = [regex]::Matches($list.Text, '"id"\s*:\s*(\d+)(?=[\s\S]{0,800}?"packs_remaining")') |
  ForEach-Object { [int64]$_.Groups[1].Value } |
  Select-Object -Unique
if (-not $ids -or $ids.Count -eq 0) { throw "Could not parse machine ids after create" }
$mid = ($ids | Measure-Object -Maximum).Maximum
Write-Host ("machine_id=" + $mid)

# Deposit amounts = amount_per_win * quantity
# reward 0: 100*6=600, reward 1: 500*3=1500, reward 2: 2000*1=2000
$deposits = @(
  @{ Id = 0; Amount = "600" },
  @{ Id = 1; Amount = "1500" },
  @{ Id = 2; Amount = "2000" }
)

Write-Step "deposit rewards via ft_transfer_call"
foreach ($d in $deposits) {
  $path = Join-Path $ArgsDir ("deposit-reward-" + $d.Id + ".json")
  $msg = '{\"action\":\"deposit_reward\",\"machine_id\":' + $mid + ',\"reward_id\":' + $d.Id + '}'
  Write-JsonFile $path ('{"receiver_id":"' + $GACHA + '","amount":"' + $d.Amount + '","memo":null,"msg":"' + $msg + '"}')
  $dep = Invoke-Near contract call-function as-transaction $FT ft_transfer_call file-args $path `
    prepaid-gas "100.0 Tgas" attached-deposit "1 yoctoNEAR" `
    sign-as $CREATOR network-config $NETWORK sign-with-keychain send
  Show-Tx ("deposit reward " + $d.Id) $dep
}

$actPath = Join-Path $ArgsDir "activate.json"
Write-JsonFile $actPath ('{"machine_id":' + $mid + '}')
Write-Step "activate_machine"
$act = Invoke-Near contract call-function as-transaction $GACHA activate_machine file-args $actPath `
  prepaid-gas "50.0 Tgas" attached-deposit "0 NEAR" `
  sign-as $CREATOR network-config $NETWORK sign-with-keychain send
Show-Tx "activate_machine" $act

Write-Step "Verify machine on-chain"
$gmPath = Join-Path $ArgsDir "get-machine.json"
Write-JsonFile $gmPath ('{"machine_id":' + $mid + '}')
$gm = Invoke-Near contract call-function as-read-only $GACHA get_machine file-args $gmPath network-config $NETWORK now
Write-Host $gm.Text
if ($gm.Text -notmatch '"status"\s*:\s*"Active"') {
  throw "Machine did not reach Active status - check deposits"
}

$balPath = Join-Path $ArgsDir "wallet-ft-bal.json"
Write-JsonFile $balPath ('{"account_id":"' + $Wallet + '"}')
$bal = Invoke-Near contract call-function as-read-only $FT ft_balance_of file-args $balPath network-config $NETWORK now
Write-Host ""
Write-Host "SEED COMPLETE" -ForegroundColor Green
Write-Host ("  Wallet:     " + $Wallet)
Write-Host ("  FT:         " + $FT)
Write-Host ("  FT balance: " + $bal.Text)
Write-Host ("  Machine:    #" + $mid + " on " + $GACHA + " (Active, TESTNET DEMO)")
Write-Host ("  Open UI:    /machine/" + $mid)
