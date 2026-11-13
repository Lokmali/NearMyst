#Requires -Version 5.1
# NearMyst TESTNET E2E against app.nearmyst.testnet
# Never prints private keys. Uses file-args for JSON.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Root "contract"))) {
  $Root = (Get-Location).Path
}
Set-Location $Root

$GACHA = if ($env:GACHA_CONTRACT) { $env:GACHA_CONTRACT } else { "app.nearmyst.testnet" }
$FT = if ($env:GACHA_FT_ACCOUNT) { $env:GACHA_FT_ACCOUNT } else { "ft.nearmyst.testnet" }
$CREATOR = if ($env:GACHA_CREATOR) { $env:GACHA_CREATOR } else { "creator.nearmyst.testnet" }
$BUYER = if ($env:GACHA_BUYER) { $env:GACHA_BUYER } else { "nearmyst.testnet" }
$PARENT = if ($env:GACHA_PARENT) { $env:GACHA_PARENT } else { "nearmyst.testnet" }
$NETWORK = "testnet"
$EXPLORER = "https://explorer.testnet.near.org/transactions"
$ArgsDir = Join-Path $Root "scripts\e2e-args"
$FT_WASM = Join-Path $Root "contract\mock_ft\target\wasm32-unknown-unknown\release\mock_ft.wasm"
$LOG = Join-Path $Root "scripts\e2e-last-run.log"

function Write-Step([string]$msg) {
  Write-Host ""
  Write-Host ("=== " + $msg + " ===") -ForegroundColor Cyan
}

function Write-JsonFile([string]$path, [string]$json) {
  [System.IO.File]::WriteAllText($path, $json)
}

function Invoke-Near {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$CmdArgs)
  Write-Host ("> near " + ($CmdArgs -join " ")) -ForegroundColor DarkGray
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $out = & near @CmdArgs 2>&1 | ForEach-Object { "$_" }
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  $text = $out -join "`n"
  Add-Content -Path $LOG -Value $text
  Add-Content -Path $LOG -Value "`n-----`n"
  $tx = $null
  if ($text -match "Transaction ID:\s*(\S+)") { $tx = $Matches[1] }
  $ok = ($code -eq 0)
  return [pscustomobject]@{ Text = $text; Tx = $tx; Ok = $ok; Code = $code }
}

function Get-BlockHeight {
  $body = '{"jsonrpc":"2.0","id":"dontcare","method":"block","params":{"finality":"final"}}'
  $r = Invoke-RestMethod -Uri "https://rpc.testnet.near.org" -Method Post -ContentType "application/json" -Body $body
  return [int64]$r.result.header.height
}

function Wait-LaterBlock([int64]$after) {
  Write-Host ("Waiting for block > " + $after + " ...")
  for ($i = 0; $i -lt 90; $i++) {
    Start-Sleep -Seconds 1
    $h = Get-BlockHeight
    if ($h -gt $after) {
      Write-Host ("Now at block " + $h)
      return $h
    }
  }
  throw "Timed out waiting for later block"
}

function Ensure-SubAccount([string]$id, [string]$balance) {
  Write-Step ("Ensure account " + $id)
  $view = Invoke-Near account view-account-summary $id network-config $NETWORK now
  if ($view.Text -match "Native account balance") {
    Write-Host ("Account " + $id + " already exists")
    return
  }
  $r = Invoke-Near account create-account fund-myself $id $balance `
    autogenerate-new-keypair save-to-keychain `
    sign-as $PARENT network-config $NETWORK sign-with-keychain send
  if (-not $r.Ok) { throw ("Failed creating " + $id + ": " + $r.Text) }
  Write-Host ("Created " + $id + " tx=" + $r.Tx)
  if ($r.Tx) { Write-Host ($EXPLORER + "/" + $r.Tx) }
}

function Get-FtBalance([string]$account) {
  $tmp = Join-Path $ArgsDir ("bal-" + ($account -replace "\.", "_") + ".json")
  Write-JsonFile $tmp ('{"account_id":"' + $account + '"}')
  $r = Invoke-Near contract call-function as-read-only $FT ft_balance_of file-args $tmp network-config $NETWORK now
  foreach ($line in ($r.Text -split "`n")) {
    $t = $line.Trim().Trim('"')
    if ($t -match '^\d+$') { return $t }
  }
  return ("UNPARSED:" + $r.Text)
}

function Show-Tx($label, $result) {
  Write-Host ($label + " ok=" + $result.Ok + " tx=" + $result.Tx)
  if ($result.Tx) { Write-Host ($EXPLORER + "/" + $result.Tx) }
}

# ------------------------------------------------------------------------------
if (Test-Path $LOG) { Remove-Item $LOG -Force }
Set-Content -Path $LOG -Value ("E2E start " + (Get-Date -Format o))
Write-Host "NearMyst TESTNET E2E" -ForegroundColor Green
Write-Host ("GACHA=" + $GACHA + " FT=" + $FT)

if (-not (Test-Path $FT_WASM)) {
  throw ("Missing mock_ft wasm at " + $FT_WASM)
}

Ensure-SubAccount $CREATOR "1.2 NEAR"
Ensure-SubAccount $BUYER "1.2 NEAR"
# FT account should already exist (faucet-funded). Verify only.
Write-Step ("Verify FT account " + $FT)
$ftView = Invoke-Near account view-account-summary $FT network-config $NETWORK now
if ($ftView.Text -notmatch "Native account balance") {
  throw ("FT account missing: " + $FT + ". Create via faucet and set GACHA_FT_ACCOUNT.")
}

Write-Step ("Deploy mock_ft to " + $FT)
$dep = Invoke-Near contract deploy $FT use-file $FT_WASM without-init-call `
  network-config $NETWORK sign-with-keychain send
Show-Tx "Deploy" $dep
if (-not $dep.Ok -and $dep.Text -notmatch "successfully deployed") {
  Write-Host "Deploy may have failed; continuing if code already present"
}

Write-Step "Init FT (new) if needed"
$supplyCheck = Invoke-Near contract call-function as-read-only $FT ft_total_supply file-args (Join-Path $ArgsDir "empty.json") network-config $NETWORK now
if ($supplyCheck.Text -match '\d{3,}') {
  Write-Host "FT already initialized (ft_total_supply ok) - skipping new"
} else {
  $initFt = Invoke-Near contract call-function as-transaction $FT new file-args (Join-Path $ArgsDir "ft-new.json") `
    prepaid-gas "50.0 Tgas" attached-deposit "0 NEAR" `
    sign-as $FT network-config $NETWORK sign-with-keychain send
  Show-Tx "FT init" $initFt
  if (-not $initFt.Ok) {
    throw ("FT init failed: " + $initFt.Text)
  }
}

Write-Step "FT storage_deposit for all parties"
foreach ($f in @("storage-creator.json", "storage-buyer.json", "storage-gacha.json", "storage-root.json")) {
  $r = Invoke-Near contract call-function as-transaction $FT storage_deposit file-args (Join-Path $ArgsDir $f) `
    prepaid-gas "30.0 Tgas" attached-deposit "0.00125 NEAR" `
    sign-as $CREATOR network-config $NETWORK sign-with-keychain send
  Show-Tx ("storage_deposit " + $f) $r
}

Write-Step "Transfer FT to buyer"
$xfer = Invoke-Near contract call-function as-transaction $FT ft_transfer file-args (Join-Path $ArgsDir "transfer-buyer.json") `
  prepaid-gas "30.0 Tgas" attached-deposit "1 yoctoNEAR" `
  sign-as $CREATOR network-config $NETWORK sign-with-keychain send
Show-Tx "transfer" $xfer
if (-not $xfer.Ok) { throw ("FT transfer to buyer failed: " + $xfer.Text) }

# Ensure create-machine.json payment/reward token matches $FT
$cmJson = @"
{"name":"TESTNET DEMO E2E Machine","description":"E2E script machine","image_url":"https://example.com/nearmyst-e2e.png","payment_token":"$FT","pack_price":"1000","max_packs":3,"tiers":[{"tier":"Common","probability_bps":7000},{"tier":"Rare","probability_bps":3000}],"rewards":[{"token":"$FT","amount_per_win":"100","tier":"Common","quantity":2},{"token":"$FT","amount_per_win":"500","tier":"Rare","quantity":1}]}
"@
Write-JsonFile (Join-Path $ArgsDir "create-machine.json") $cmJson

Write-Step "create_machine"
# 0.05 NEAR base + 3 * 0.001 NEAR per pack
$cm = Invoke-Near contract call-function as-transaction $GACHA create_machine file-args (Join-Path $ArgsDir "create-machine.json") `
  prepaid-gas "100.0 Tgas" attached-deposit "0.053 NEAR" `
  sign-as $CREATOR network-config $NETWORK sign-with-keychain send
Show-Tx "create_machine" $cm
if (-not $cm.Ok) { throw ("create_machine failed: " + $cm.Text) }

$mid = 1
$list = Invoke-Near contract call-function as-read-only $GACHA list_machines file-args (Join-Path $ArgsDir "list-machines.json") network-config $NETWORK now
# Machine views include packs_remaining; reward rows also have "id" — do not take max of all ids.
$ids = [regex]::Matches($list.Text, '"id"\s*:\s*(\d+)(?=[\s\S]{0,800}?"packs_remaining")') |
  ForEach-Object { [int64]$_.Groups[1].Value } |
  Select-Object -Unique
if ($ids -and $ids.Count -gt 0) { $mid = ($ids | Measure-Object -Maximum).Maximum }
Write-Host ("Using machine_id=" + $mid)

$dep0Path = Join-Path $ArgsDir "deposit-reward-0.runtime.json"
$dep1Path = Join-Path $ArgsDir "deposit-reward-1.runtime.json"
Write-JsonFile $dep0Path ('{"receiver_id":"' + $GACHA + '","amount":"200","memo":null,"msg":"{\"action\":\"deposit_reward\",\"machine_id\":' + $mid + ',\"reward_id\":0}"}')
Write-JsonFile $dep1Path ('{"receiver_id":"' + $GACHA + '","amount":"500","memo":null,"msg":"{\"action\":\"deposit_reward\",\"machine_id\":' + $mid + ',\"reward_id\":1}"}')

Write-Step "deposit rewards via ft_transfer_call"
$d0 = Invoke-Near contract call-function as-transaction $FT ft_transfer_call file-args $dep0Path `
  prepaid-gas "100.0 Tgas" attached-deposit "1 yoctoNEAR" `
  sign-as $CREATOR network-config $NETWORK sign-with-keychain send
Show-Tx "deposit0" $d0
if (-not $d0.Ok) { throw ("deposit reward 0 failed: " + $d0.Text) }

$d1 = Invoke-Near contract call-function as-transaction $FT ft_transfer_call file-args $dep1Path `
  prepaid-gas "100.0 Tgas" attached-deposit "1 yoctoNEAR" `
  sign-as $CREATOR network-config $NETWORK sign-with-keychain send
Show-Tx "deposit1" $d1
if (-not $d1.Ok) { throw ("deposit reward 1 failed: " + $d1.Text) }

$actPath = Join-Path $ArgsDir "activate.runtime.json"
Write-JsonFile $actPath ('{"machine_id":' + $mid + '}')
Write-Step "activate_machine"
$act = Invoke-Near contract call-function as-transaction $GACHA activate_machine file-args $actPath `
  prepaid-gas "50.0 Tgas" attached-deposit "0 NEAR" `
  sign-as $CREATOR network-config $NETWORK sign-with-keychain send
Show-Tx "activate" $act
if (-not $act.Ok) { throw ("activate failed: " + $act.Text) }

Write-Step "HAPPY PATH: buyer FT balance BEFORE buy"
$balBeforeBuy = Get-FtBalance $BUYER
Write-Host ("buyer FT balance before buy: " + $balBeforeBuy)

$buyPath = Join-Path $ArgsDir "buy.runtime.json"
Write-JsonFile $buyPath ('{"receiver_id":"' + $GACHA + '","amount":"1000","memo":null,"msg":"{\"action\":\"buy\",\"machine_id\":' + $mid + ',\"quantity\":1}"}')

$blockBeforeBuy = Get-BlockHeight
Write-Step ("Buyer buys 1 pack (block=" + $blockBeforeBuy + ")")
$buy = Invoke-Near contract call-function as-transaction $FT ft_transfer_call file-args $buyPath `
  prepaid-gas "100.0 Tgas" attached-deposit "1 yoctoNEAR" `
  sign-as $BUYER network-config $NETWORK sign-with-keychain send
Show-Tx "buy" $buy
if (-not $buy.Ok) { throw ("buy failed: " + $buy.Text) }

$balAfterBuy = Get-FtBalance $BUYER
Write-Host ("buyer FT balance after buy: " + $balAfterBuy)

$packsArgs = Join-Path $ArgsDir "get-user-packs.runtime.json"
Write-JsonFile $packsArgs ('{"account_id":"' + $BUYER + '","from":0,"limit":10}')
$packsOut = Invoke-Near contract call-function as-read-only $GACHA get_user_packs file-args $packsArgs network-config $NETWORK now
Write-Host ("get_user_packs:`n" + $packsOut.Text)

$packId = $null
$arrMatch = [regex]::Match($packsOut.Text, '\[\s*(\d+(?:\s*,\s*\d+)*)\s*\]')
if ($arrMatch.Success) {
  $nums = [regex]::Matches($arrMatch.Groups[1].Value, '\d+') | ForEach-Object { [int64]$_.Value }
  $packId = $nums[-1]
}
if (-not $packId) { throw "Could not parse pack id from get_user_packs" }
Write-Host ("pack_id=" + $packId)

$packArgs = Join-Path $ArgsDir "get-pack.runtime.json"
Write-JsonFile $packArgs ('{"pack_id":' + $packId + '}')
$packView = Invoke-Near contract call-function as-read-only $GACHA get_pack file-args $packArgs network-config $NETWORK now
Write-Host ("get_pack:`n" + $packView.Text)
$purchasedAt = $blockBeforeBuy
if ($packView.Text -match '"purchased_at_block"\s*:\s*(\d+)') {
  $purchasedAt = [int64]$Matches[1]
}

Wait-LaterBlock $purchasedAt | Out-Null

Write-Step "HAPPY PATH: buyer FT balance BEFORE open"
$balBeforeOpen = Get-FtBalance $BUYER
Write-Host ("buyer FT balance before open: " + $balBeforeOpen)

$openArgs = Join-Path $ArgsDir "open-pack.runtime.json"
Write-JsonFile $openArgs ('{"pack_id":' + $packId + '}')
Write-Step ("open_pack " + $packId)
$open = Invoke-Near contract call-function as-transaction $GACHA open_pack file-args $openArgs `
  prepaid-gas "200.0 Tgas" attached-deposit "0 NEAR" `
  sign-as $BUYER network-config $NETWORK sign-with-keychain send
Show-Tx "open" $open
if (-not $open.Ok) { throw ("open_pack failed: " + $open.Text) }

Start-Sleep -Seconds 3
$resultArgs = Join-Path $ArgsDir "get-result.runtime.json"
Write-JsonFile $resultArgs ('{"pack_id":' + $packId + '}')
$res = Invoke-Near contract call-function as-read-only $GACHA get_pack_result file-args $resultArgs network-config $NETWORK now
Write-Host ("get_pack_result:`n" + $res.Text)
$packAfter = Invoke-Near contract call-function as-read-only $GACHA get_pack file-args $packArgs network-config $NETWORK now
Write-Host ("get_pack after open:`n" + $packAfter.Text)

$balAfterOpen = Get-FtBalance $BUYER
Write-Host ("buyer FT balance after open: " + $balAfterOpen)

# Failure path
Write-Step "FAILURE PATH: buy second pack then unregister buyer before open"
$buy2 = Invoke-Near contract call-function as-transaction $FT ft_transfer_call file-args $buyPath `
  prepaid-gas "100.0 Tgas" attached-deposit "1 yoctoNEAR" `
  sign-as $BUYER network-config $NETWORK sign-with-keychain send
Show-Tx "buy2" $buy2
if (-not $buy2.Ok) { throw ("second buy failed: " + $buy2.Text) }

$packsOut2 = Invoke-Near contract call-function as-read-only $GACHA get_user_packs file-args $packsArgs network-config $NETWORK now
$arrMatch2 = [regex]::Match($packsOut2.Text, '\[\s*(\d+(?:\s*,\s*\d+)*)\s*\]')
$packId2 = $null
if ($arrMatch2.Success) {
  $nums2 = [regex]::Matches($arrMatch2.Groups[1].Value, '\d+') | ForEach-Object { [int64]$_.Value }
  $packId2 = $nums2[-1]
}
if (-not $packId2) { throw "Could not parse failure-path pack id" }
Write-Host ("failure-path pack_id=" + $packId2)

$packArgs2 = Join-Path $ArgsDir "get-pack2.runtime.json"
Write-JsonFile $packArgs2 ('{"pack_id":' + $packId2 + '}')
$pv2 = Invoke-Near contract call-function as-read-only $GACHA get_pack file-args $packArgs2 network-config $NETWORK now
$purchasedAt2 = Get-BlockHeight
if ($pv2.Text -match '"purchased_at_block"\s*:\s*(\d+)') {
  $purchasedAt2 = [int64]$Matches[1]
}

$unregArgs = Join-Path $ArgsDir "force-unregister.runtime.json"
Write-JsonFile $unregArgs ('{"account_id":"' + $BUYER + '"}')
Write-Step "force_unregister buyer on FT"
$un = Invoke-Near contract call-function as-transaction $FT force_unregister file-args $unregArgs `
  prepaid-gas "30.0 Tgas" attached-deposit "0 NEAR" `
  sign-as $FT network-config $NETWORK sign-with-keychain send
Show-Tx "unregister" $un

Wait-LaterBlock $purchasedAt2 | Out-Null

$openArgs2 = Join-Path $ArgsDir "open-pack2.runtime.json"
Write-JsonFile $openArgs2 ('{"pack_id":' + $packId2 + '}')
Write-Step "open_pack (expect PendingClaim)"
$open2 = Invoke-Near contract call-function as-transaction $GACHA open_pack file-args $openArgs2 `
  prepaid-gas "200.0 Tgas" attached-deposit "0 NEAR" `
  sign-as $BUYER network-config $NETWORK sign-with-keychain send
Show-Tx "open2" $open2

Start-Sleep -Seconds 3
$packFail = Invoke-Near contract call-function as-read-only $GACHA get_pack file-args $packArgs2 network-config $NETWORK now
Write-Host ("pack after failed payout:`n" + $packFail.Text)
$pending = Invoke-Near contract call-function as-read-only $GACHA is_pending_claim file-args $openArgs2 network-config $NETWORK now
Write-Host ("is_pending_claim:`n" + $pending.Text)

Write-Step "Re-register buyer + claim_pending"
$reg = Invoke-Near contract call-function as-transaction $FT storage_deposit file-args (Join-Path $ArgsDir "storage-buyer.json") `
  prepaid-gas "30.0 Tgas" attached-deposit "0.00125 NEAR" `
  sign-as $BUYER network-config $NETWORK sign-with-keychain send
Show-Tx "re-register" $reg

$balBeforeClaim = Get-FtBalance $BUYER
Write-Host ("buyer FT before claim_pending: " + $balBeforeClaim)

$claim = Invoke-Near contract call-function as-transaction $GACHA claim_pending file-args $openArgs2 `
  prepaid-gas "200.0 Tgas" attached-deposit "0 NEAR" `
  sign-as $BUYER network-config $NETWORK sign-with-keychain send
Show-Tx "claim_pending" $claim
if (-not $claim.Ok) { throw ("claim_pending failed: " + $claim.Text) }

Start-Sleep -Seconds 3
$packClaimed = Invoke-Near contract call-function as-read-only $GACHA get_pack file-args $packArgs2 network-config $NETWORK now
Write-Host ("pack after claim:`n" + $packClaimed.Text)
$balAfterClaim = Get-FtBalance $BUYER
Write-Host ("buyer FT after claim_pending: " + $balAfterClaim)

Write-Step "E2E SUMMARY"
Write-Host ("Happy pack_id=" + $packId + " Failure pack_id=" + $packId2)
Write-Host ("Balances beforeBuy=" + $balBeforeBuy + " afterBuy=" + $balAfterBuy + " beforeOpen=" + $balBeforeOpen + " afterOpen=" + $balAfterOpen + " beforeClaim=" + $balBeforeClaim + " afterClaim=" + $balAfterClaim)
Write-Host ("Full log: " + $LOG)
Write-Host "DONE" -ForegroundColor Green
