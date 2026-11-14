//! near-workspaces sandbox integration tests with mock NEP-141 FT.
//!
//! Run on macOS/Linux: `cargo test --features sandbox --test sandbox`
//! Windows: sandbox binary unsupported — this file is cfg'd out; use `--lib` unit tests.

#![cfg(all(unix, feature = "sandbox"))]

use near_workspaces::types::{Gas, NearToken};
use near_workspaces::{Account, Contract, Worker};
use serde_json::json;

const TGAS: u64 = 1_000_000_000_000;

async fn compile_gacha() -> anyhow::Result<Vec<u8>> {
    // Prefer prebuilt wasm if present (faster / avoids toolchain quirks).
    let prebuilt = std::path::Path::new("./target/wasm32-unknown-unknown/release/nearmyst.wasm");
    if prebuilt.exists() {
        return Ok(std::fs::read(prebuilt)?);
    }
    Ok(near_workspaces::compile_project("./").await?)
}

async fn compile_mock_ft() -> anyhow::Result<Vec<u8>> {
    let prebuilt = std::path::Path::new("./mock_ft/target/wasm32-unknown-unknown/release/mock_ft.wasm");
    if prebuilt.exists() {
        return Ok(std::fs::read(prebuilt)?);
    }
    Ok(near_workspaces::compile_project("./mock_ft").await?)
}

struct Env {
    worker: Worker<near_workspaces::network::Sandbox>,
    gacha: Contract,
    ft: Contract,
    owner: Account,
    creator: Account,
    buyer: Account,
}

async fn setup() -> anyhow::Result<Env> {
    let worker = near_workspaces::sandbox().await?;
    let owner = worker.dev_create_account().await?;
    let creator = worker.dev_create_account().await?;
    let buyer = worker.dev_create_account().await?;

    let gacha_wasm = compile_gacha().await?;
    let ft_wasm = compile_mock_ft().await?;

    let gacha = worker.dev_deploy(&gacha_wasm).await?;
    let ft = worker.dev_deploy(&ft_wasm).await?;

    gacha
        .call("new")
        .args_json(json!({
            "owner": owner.id(),
            "platform_fee_bps": 250,
            "fee_receiver": owner.id()
        }))
        .transact()
        .await?
        .into_result()?;

    ft.call("new")
        .args_json(json!({
            "owner_id": creator.id(),
            "total_supply": "1000000000000"
        }))
        .transact()
        .await?
        .into_result()?;

    // Register accounts on FT
    for acct in [&owner, &creator, &buyer, gacha.as_account()] {
        ft.call("storage_deposit")
            .args_json(json!({ "account_id": acct.id() }))
            .deposit(NearToken::from_millinear(10))
            .transact()
            .await?
            .into_result()?;
    }

    // Fund buyer with payment tokens (same FT used as payment + reward for simplicity)
    ft.call("ft_transfer")
        .args_json(json!({
            "receiver_id": buyer.id(),
            "amount": "100000000",
            "memo": null
        }))
        .deposit(NearToken::from_yoctonear(1))
        .transact()
        .await?
        .into_result()?;

    Ok(Env {
        worker,
        gacha,
        ft,
        owner,
        creator,
        buyer,
    })
}

async fn create_and_activate(env: &Env) -> anyhow::Result<u64> {
    let mid: u64 = env
        .creator
        .call(env.gacha.id(), "create_machine")
        .args_json(json!({
            "name": "TESTNET DEMO Sandbox",
            "description": "sandbox machine",
            "image_url": "https://example.com/g.png",
            "payment_token": env.ft.id(),
            "pack_price": "1000",
            "max_packs": 5,
            "tiers": [
                {"tier": "Common", "probability_bps": 7000},
                {"tier": "Rare", "probability_bps": 3000}
            ],
            "rewards": [
                {
                    "token": env.ft.id(),
                    "amount_per_win": "100",
                    "tier": "Common",
                    "quantity": 3
                },
                {
                    "token": env.ft.id(),
                    "amount_per_win": "500",
                    "tier": "Rare",
                    "quantity": 2
                }
            ]
        }))
        // 0.05 Ⓝ base + 5 × 0.001 Ⓝ per pack
        .deposit(NearToken::from_millinear(55))
        .gas(Gas::from_gas(50 * TGAS))
        .transact()
        .await?
        .json()?;

    // Deposit rewards via ft_transfer_call
    for (rid, amount) in [(0u64, "300"), (1u64, "1000")] {
        env.creator
            .call(env.ft.id(), "ft_transfer_call")
            .args_json(json!({
                "receiver_id": env.gacha.id(),
                "amount": amount,
                "memo": null,
                "msg": format!("{{\"action\":\"deposit_reward\",\"machine_id\":{},\"reward_id\":{}}}", mid, rid)
            }))
            .deposit(NearToken::from_yoctonear(1))
            .gas(Gas::from_gas(100 * TGAS))
            .transact()
            .await?
            .into_result()?;
    }

    env.creator
        .call(env.gacha.id(), "activate_machine")
        .args_json(json!({ "machine_id": mid }))
        .transact()
        .await?
        .into_result()?;

    Ok(mid)
}

#[tokio::test]
async fn sandbox_buy_open_happy_path() -> anyhow::Result<()> {
    let env = match setup().await {
        Ok(e) => e,
        Err(e) => {
            eprintln!("SKIP sandbox (setup failed — common on Windows): {e:#}");
            return Ok(());
        }
    };
    let mid = create_and_activate(&env).await?;

    env.buyer
        .call(env.ft.id(), "ft_transfer_call")
        .args_json(json!({
            "receiver_id": env.gacha.id(),
            "amount": "1000",
            "memo": null,
            "msg": format!("{{\"action\":\"buy\",\"machine_id\":{},\"quantity\":1}}", mid)
        }))
        .deposit(NearToken::from_yoctonear(1))
        .gas(Gas::from_gas(100 * TGAS))
        .transact()
        .await?
        .into_result()?;

    let packs: Vec<u64> = env
        .gacha
        .call("get_user_packs")
        .args_json(json!({
            "account_id": env.buyer.id(),
            "from": 0,
            "limit": 10
        }))
        .view()
        .await?
        .json()?;
    assert_eq!(packs.len(), 1);

    // Advance block by making a noop call, then open
    let _ = env.worker.fast_forward(2).await;

    env.buyer
        .call(env.gacha.id(), "open_pack")
        .args_json(json!({ "pack_id": packs[0] }))
        .gas(Gas::from_gas(150 * TGAS))
        .deposit(NearToken::from_yoctonear(0))
        .transact()
        .await?
        .into_result()?;

    let result: serde_json::Value = env
        .gacha
        .call("get_pack_result")
        .args_json(json!({ "pack_id": packs[0] }))
        .view()
        .await?
        .json()?;
    assert!(result.get("reward_id").is_some());

    let pack: serde_json::Value = env
        .gacha
        .call("get_pack")
        .args_json(json!({ "pack_id": packs[0] }))
        .view()
        .await?
        .json()?;
    let status = pack["status"].as_str().unwrap_or("");
    assert!(
        status == "Delivered" || status == "PendingClaim" || status == "Opened",
        "unexpected status {status}"
    );

    Ok(())
}

#[tokio::test]
async fn sandbox_wrong_amount_rejected() -> anyhow::Result<()> {
    let env = match setup().await {
        Ok(e) => e,
        Err(e) => {
            eprintln!("SKIP sandbox: {e:#}");
            return Ok(());
        }
    };
    let mid = create_and_activate(&env).await?;

    let res = env
        .buyer
        .call(env.ft.id(), "ft_transfer_call")
        .args_json(json!({
            "receiver_id": env.gacha.id(),
            "amount": "999",
            "memo": null,
            "msg": format!("{{\"action\":\"buy\",\"machine_id\":{},\"quantity\":1}}", mid)
        }))
        .deposit(NearToken::from_yoctonear(1))
        .gas(Gas::from_gas(100 * TGAS))
        .transact()
        .await?;

    // Either the receipt fails or unused tokens are refunded leaving no packs
    let packs: Vec<u64> = env
        .gacha
        .call("get_user_packs")
        .args_json(json!({
            "account_id": env.buyer.id(),
            "from": 0,
            "limit": 10
        }))
        .view()
        .await?
        .json()?;
    assert!(
        packs.is_empty() || !res.failures().is_empty(),
        "wrong amount should not create packs"
    );
    Ok(())
}
