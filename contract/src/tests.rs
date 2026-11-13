//! Unit / VM-context tests for Day 1 + Day 2.

use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use near_sdk::json_types::U128;
use near_sdk::test_utils::{accounts, VMContextBuilder};
use near_sdk::{testing_env, AccountId, NearToken, PromiseError};

use crate::types::{required_create_deposit, MachineStatus, PackStatus, Tier, TierConfig};
use crate::validation::split_fee;
use crate::{Contract, CreateRewardInput};

fn context(predecessor: AccountId, deposit: NearToken) -> VMContextBuilder {
    let mut builder = VMContextBuilder::new();
    builder
        .current_account_id(accounts(0))
        .signer_account_id(predecessor.clone())
        .predecessor_account_id(predecessor)
        .attached_deposit(deposit)
        .block_height(100);
    builder
}

fn owner() -> AccountId {
    accounts(1)
}
fn creator() -> AccountId {
    accounts(2)
}
fn stranger() -> AccountId {
    "stranger.testnet".parse().unwrap()
}
fn ft_token() -> AccountId {
    accounts(4)
}
fn payment_token() -> AccountId {
    accounts(5)
}
fn buyer() -> AccountId {
    // accounts() only has indices 0..=5 in near-sdk 5.30
    "buyer.testnet".parse().unwrap()
}

fn valid_tiers() -> Vec<TierConfig> {
    vec![
        TierConfig {
            tier: Tier::Common,
            probability_bps: 7_000,
        },
        TierConfig {
            tier: Tier::Rare,
            probability_bps: 2_500,
        },
        TierConfig {
            tier: Tier::Epic,
            probability_bps: 500,
        },
    ]
}

fn valid_rewards(max_packs: u64) -> Vec<CreateRewardInput> {
    vec![
        CreateRewardInput {
            token: ft_token(),
            amount_per_win: U128(1_000_000),
            tier: Tier::Common,
            quantity: max_packs.saturating_sub(5).max(1),
        },
        CreateRewardInput {
            token: ft_token(),
            amount_per_win: U128(5_000_000),
            tier: Tier::Rare,
            quantity: 4,
        },
        CreateRewardInput {
            token: ft_token(),
            amount_per_win: U128(20_000_000),
            tier: Tier::Epic,
            quantity: 1,
        },
    ]
}

fn new_contract(fee_bps: u16) -> Contract {
    testing_env!(context(owner(), NearToken::from_yoctonear(0)).build());
    Contract::new(owner(), fee_bps, owner())
}

fn create_sample(contract: &mut Contract, max_packs: u64) -> u64 {
    testing_env!(context(creator(), required_create_deposit(max_packs)).build());
    contract.create_machine(
        "TESTNET DEMO Machine".into(),
        "Day 2 test machine".into(),
        "https://example.com/gacha.png".into(),
        payment_token(),
        U128(1_000),
        max_packs,
        valid_tiers(),
        valid_rewards(max_packs),
    )
}

fn deposit_all(contract: &mut Contract, mid: u64) {
    testing_env!(context(ft_token(), NearToken::from_yoctonear(0)).build());
    for (rid, units, unit_amt) in [
        (0u64, 5u64, 1_000_000u128),
        (1, 4, 5_000_000),
        (2, 1, 20_000_000),
    ] {
        let msg = format!(
            r#"{{"action":"deposit_reward","machine_id":{},"reward_id":{}}}"#,
            mid, rid
        );
        let _ = contract.ft_on_transfer(creator(), U128(units as u128 * unit_amt), msg);
    }
}

fn activate(contract: &mut Contract, mid: u64) {
    deposit_all(contract, mid);
    testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
    contract.activate_machine(mid);
}

fn buy(
    contract: &mut Contract,
    mid: u64,
    qty: u64,
    amount: u128,
    block: u64,
) {
    let mut ctx = context(payment_token(), NearToken::from_yoctonear(0));
    ctx.block_height(block);
    testing_env!(ctx.build());
    let msg = format!(
        r#"{{"action":"buy","machine_id":{},"quantity":{}}}"#,
        mid, qty
    );
    let unused = match contract.ft_on_transfer(buyer(), U128(amount), msg) {
        near_sdk::PromiseOrValue::Value(u) => u.0,
        _ => panic!("expected value"),
    };
    assert_eq!(unused, 0);
}

// ---------------- Day 1 regression ----------------

#[test]
fn init_rejects_fee_above_max() {
    testing_env!(context(owner(), NearToken::from_yoctonear(0)).build());
    assert!(std::panic::catch_unwind(|| Contract::new(owner(), 1_001, owner())).is_err());
}

#[test]
fn create_machine_valid_config() {
    let mut c = new_contract(250);
    let id = create_sample(&mut c, 10);
    assert_eq!(id, 1);
    let view = c.get_machine(1).unwrap();
    assert_eq!(view.status, MachineStatus::Draft);
    assert_eq!(c.get_config().platform_fee_bps, 250);
}

#[test]
#[should_panic(expected = "tier probabilities must sum")]
fn create_rejects_bad_probabilities() {
    let mut c = new_contract(100);
    testing_env!(context(creator(), required_create_deposit(10)).build());
    c.create_machine(
        "Bad".into(),
        "x".into(),
        "https://x".into(),
        payment_token(),
        U128(1),
        10,
        vec![TierConfig {
            tier: Tier::Common,
            probability_bps: 5_000,
        }],
        valid_rewards(10),
    );
}

#[test]
fn activate_after_full_deposit() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    assert_eq!(c.get_machine(mid).unwrap().status, MachineStatus::Active);
}

// ---------------- Purchase ----------------

#[test]
fn buy_splits_fees_and_creates_packs() {
    let mut c = new_contract(250); // 2.5%
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);

    buy(&mut c, mid, 2, 2_000, 100);

    let m = c.get_machine(mid).unwrap();
    assert_eq!(m.packs_sold, 2);
    assert_eq!(m.unopened_packs, 2);
    let (plat, crea) = split_fee(2_000, 250);
    assert_eq!(m.platform_earnings.0, plat);
    assert_eq!(m.creator_earnings.0, crea);

    let packs = c.get_user_packs(buyer(), 0, 10);
    assert_eq!(packs.len(), 2);
    let p = c.get_pack(packs[0]).unwrap();
    assert_eq!(p.status, PackStatus::Unopened);
    assert_eq!(p.purchased_at_block, 100);

    // reserved accounting
    let reserved: u64 = m.rewards.iter().map(|r| r.quantity_reserved).sum();
    assert_eq!(reserved, 2);
}

#[test]
#[should_panic(expected = "wrong payment token")]
fn buy_wrong_token_rejected() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    testing_env!(context(ft_token(), NearToken::from_yoctonear(0)).build());
    let msg = format!(r#"{{"action":"buy","machine_id":{},"quantity":1}}"#, mid);
    let _ = c.ft_on_transfer(buyer(), U128(1_000), msg);
}

#[test]
#[should_panic(expected = "exact payment required")]
fn buy_wrong_amount_rejected() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    buy(&mut c, mid, 1, 999, 100);
}

#[test]
#[should_panic(expected = "not enough packs remaining")]
fn buy_sold_out_rejected() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    buy(&mut c, mid, 10, 10_000, 100);
    buy(&mut c, mid, 1, 1_000, 101);
}

#[test]
#[should_panic(expected = "machine not Active")]
fn buy_when_paused_rejected() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
    c.pause_machine(mid);
    buy(&mut c, mid, 1, 1_000, 100);
}

#[test]
#[should_panic(expected = "per-buy cap")]
fn buy_rejects_quantity_over_cap() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    // Cap is checked before packs_remaining — 51 fails even on a small machine.
    buy(&mut c, mid, 51, 51_000, 100);
}

#[test]
#[should_panic(expected = "ft_on_transfer msg too long")]
fn ft_on_transfer_rejects_huge_msg() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    testing_env!(context(payment_token(), NearToken::from_yoctonear(0)).build());
    let mut msg = format!(r#"{{"action":"buy","machine_id":{},"quantity":1}}"#, mid);
    while msg.len() <= 256 {
        msg.push(' ');
    }
    let _ = c.ft_on_transfer(buyer(), U128(1_000), msg);
}

// ---------------- Open / claim ----------------

#[test]
#[should_panic(expected = "later block")]
fn open_same_block_rejected() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    buy(&mut c, mid, 1, 1_000, 100);

    let pack_id = c.get_user_packs(buyer(), 0, 1)[0];
    let mut ctx = context(buyer(), NearToken::from_yoctonear(0));
    ctx.block_height(100); // same block
    testing_env!(ctx.build());
    let _ = c.open_pack(pack_id);
}

#[test]
#[should_panic(expected = "only pack owner")]
fn open_non_owner_rejected() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    buy(&mut c, mid, 1, 1_000, 100);
    let pack_id = c.get_user_packs(buyer(), 0, 1)[0];

    let mut ctx = context(stranger(), NearToken::from_yoctonear(0));
    ctx.block_height(101);
    testing_env!(ctx.build());
    let _ = c.open_pack(pack_id);
}

#[test]
fn open_once_then_reject_second() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    buy(&mut c, mid, 1, 1_000, 100);
    let pack_id = c.get_user_packs(buyer(), 0, 1)[0];

    let mut ctx = context(buyer(), NearToken::from_yoctonear(0));
    ctx.block_height(110);
    testing_env!(ctx.build());
    let _ = c.open_pack(pack_id);

    let pack = c.get_pack(pack_id).unwrap();
    assert_eq!(pack.status, PackStatus::Opened);
    assert!(c.get_pack_result(pack_id).is_some());
    assert_eq!(c.get_machine(mid).unwrap().unopened_packs, 0);

    // Simulate successful callback
    c.on_reward_paid(pack_id, ft_token(), U128(1_000_000), Ok(()));
    assert_eq!(c.get_pack(pack_id).unwrap().status, PackStatus::Delivered);

    let mut ctx = context(buyer(), NearToken::from_yoctonear(0));
    ctx.block_height(111);
    testing_env!(ctx.build());
    let err = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _ = c.open_pack(pack_id);
    }));
    assert!(err.is_err());
}

#[test]
fn ft_transfer_failure_pending_then_claim() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    buy(&mut c, mid, 1, 1_000, 100);
    let pack_id = c.get_user_packs(buyer(), 0, 1)[0];

    let mut ctx = context(buyer(), NearToken::from_yoctonear(0));
    ctx.block_height(120);
    testing_env!(ctx.build());
    let _ = c.open_pack(pack_id);

    c.on_reward_paid(
        pack_id,
        ft_token(),
        U128(1_000_000),
        Err(PromiseError::Failed),
    );
    assert_eq!(c.get_pack(pack_id).unwrap().status, PackStatus::PendingClaim);
    assert!(c.is_pending_claim(pack_id));

    testing_env!(context(buyer(), NearToken::from_yoctonear(0)).build());
    let _ = c.claim_pending(pack_id);
    assert_eq!(c.get_pack(pack_id).unwrap().status, PackStatus::Opened);

    c.on_reward_paid(pack_id, ft_token(), U128(1_000_000), Ok(()));
    assert_eq!(c.get_pack(pack_id).unwrap().status, PackStatus::Delivered);
}

#[test]
fn inventory_never_exceeds_deposited_after_opens() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    buy(&mut c, mid, 3, 3_000, 100);

    for (i, pack_id) in c.get_user_packs(buyer(), 0, 10).into_iter().enumerate() {
        let mut ctx = context(buyer(), NearToken::from_yoctonear(0));
        ctx.block_height(200 + i as u64);
        testing_env!(ctx.build());
        let _ = c.open_pack(pack_id);
        c.on_reward_paid(pack_id, ft_token(), U128(1), Ok(()));
    }

    let m = c.get_machine(mid).unwrap();
    let remaining: u64 = m.rewards.iter().map(|r| r.quantity_remaining).sum();
    let deposited: u64 = m.rewards.iter().map(|r| r.quantity_deposited).sum();
    assert!(remaining <= deposited);
    assert_eq!(remaining, deposited - 3);
    assert_eq!(m.unopened_packs, 0);
}

// ---------------- Pause / withdraw ----------------

#[test]
#[should_panic(expected = "only creator or platform owner may pause")]
fn unauthorized_pause() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    testing_env!(context(stranger(), NearToken::from_yoctonear(0)).build());
    c.pause_machine(mid);
}

#[test]
fn pause_allows_open_not_buy() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    buy(&mut c, mid, 1, 1_000, 100);

    testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
    c.pause_machine(mid);
    assert_eq!(c.get_machine(mid).unwrap().status, MachineStatus::Paused);

    let pack_id = c.get_user_packs(buyer(), 0, 1)[0];
    let mut ctx = context(buyer(), NearToken::from_yoctonear(0));
    ctx.block_height(150);
    testing_env!(ctx.build());
    let _ = c.open_pack(pack_id);
    assert!(c.get_pack_result(pack_id).is_some());
}

#[test]
#[should_panic(expected = "cannot withdraw reserved")]
fn withdraw_cannot_touch_reserved() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    // Sell all 10 packs → all remaining is needed for unopened
    buy(&mut c, mid, 10, 10_000, 100);

    testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
    c.pause_machine(mid);
    // Try to withdraw any of reward 0
    let _ = c.withdraw_unreserved_inventory(mid, 0, 1);
}

#[test]
fn withdraw_unreserved_when_headroom() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    // Deposit created 10 slots for max_packs=10; buy 0, so all unreserved.
    // But machine is Active — withdraw requires non-Active.
    testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
    c.pause_machine(mid);
    testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
    let _ = c.withdraw_unreserved_inventory(mid, 0, 1);
    let m = c.get_machine(mid).unwrap();
    assert_eq!(m.rewards[0].quantity_remaining, 4);
    assert_eq!(m.rewards[0].quantity_deposited, 4);
}

#[test]
fn deposit_by_non_creator_rejected() {
    let mut c = new_contract(100);
    let _ = create_sample(&mut c, 10);
    testing_env!(context(ft_token(), NearToken::from_yoctonear(0)).build());
    let msg = r#"{"action":"deposit_reward","machine_id":1,"reward_id":0}"#;
    let err = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _ = c.ft_on_transfer(stranger(), U128(1_000_000), msg.into());
    }));
    assert!(err.is_err());
}

#[test]
fn list_and_user_packs_pagination() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    buy(&mut c, mid, 3, 3_000, 100);
    assert_eq!(c.get_user_packs(buyer(), 0, 2).len(), 2);
    assert_eq!(c.get_user_packs(buyer(), 2, 10).len(), 1);
    assert_eq!(c.list_machines(0, 10).len(), 1);
}

// ---------------- Phase 1: withdraw restore / unpause / caps ----------------

#[test]
fn creator_earnings_withdraw_failure_restores() {
    let mut c = new_contract(250);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    buy(&mut c, mid, 2, 2_000, 100);
    let before = c.get_machine(mid).unwrap().creator_earnings.0;
    assert!(before > 0);

    testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
    let _ = c.withdraw_creator_earnings(mid);
    assert_eq!(c.get_machine(mid).unwrap().creator_earnings.0, 0);

    c.on_creator_earnings_withdrawn(mid, U128(before), Err(PromiseError::Failed));
    assert_eq!(c.get_machine(mid).unwrap().creator_earnings.0, before);

    testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
    let _ = c.withdraw_creator_earnings(mid);
    c.on_creator_earnings_withdrawn(mid, U128(before), Ok(()));
    assert_eq!(c.get_machine(mid).unwrap().creator_earnings.0, 0);
}

#[test]
fn platform_earnings_withdraw_failure_restores() {
    let mut c = new_contract(250);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    buy(&mut c, mid, 2, 2_000, 100);
    let before = c.get_machine(mid).unwrap().platform_earnings.0;
    assert!(before > 0);

    testing_env!(context(owner(), NearToken::from_yoctonear(0)).build());
    let _ = c.withdraw_platform_earnings(mid);
    assert_eq!(c.get_machine(mid).unwrap().platform_earnings.0, 0);

    c.on_platform_earnings_withdrawn(mid, U128(before), Err(PromiseError::Failed));
    assert_eq!(c.get_machine(mid).unwrap().platform_earnings.0, before);
}

#[test]
fn inventory_withdraw_failure_restores() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
    c.pause_machine(mid);

    let before_rem = c.get_machine(mid).unwrap().rewards[0].quantity_remaining;
    let before_dep = c.get_machine(mid).unwrap().rewards[0].quantity_deposited;
    testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
    let _ = c.withdraw_unreserved_inventory(mid, 0, 1);
    assert_eq!(
        c.get_machine(mid).unwrap().rewards[0].quantity_remaining,
        before_rem - 1
    );

    c.on_inventory_withdrawn(mid, 0, 1, U128(1_000_000), Err(PromiseError::Failed));
    let m = c.get_machine(mid).unwrap();
    assert_eq!(m.rewards[0].quantity_remaining, before_rem);
    assert_eq!(m.rewards[0].quantity_deposited, before_dep);
}

#[test]
fn unpause_allows_when_sellable_covers_unsold() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    buy(&mut c, mid, 5, 5_000, 100);

    testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
    c.pause_machine(mid);
    // Withdraw 1 unreserved unit — deposited drops below max_packs (10), but
    // sellable (4) still covers unsold (5)? remaining was 10, unopened 5 → sellable 5.
    // After withdraw 1: remaining 9, unopened 5 → sellable 4 < unsold 5 → should fail.
    // So withdraw 0 and unpause should work with old deposited check would also work.
    // Instead: withdraw nothing, unpause OK even though we could have deposited == max.
    testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
    c.unpause_machine(mid);
    assert_eq!(c.get_machine(mid).unwrap().status, MachineStatus::Active);
}

#[test]
#[should_panic(expected = "cannot unpause: sellable inventory")]
fn unpause_rejects_when_sellable_below_unsold() {
    let mut c = new_contract(100);
    let mid = create_sample(&mut c, 10);
    activate(&mut c, mid);
    buy(&mut c, mid, 5, 5_000, 100);
    // remaining=10, unopened=5, sellable=5, unsold=5
    // Reward 0 is fully reserved by waterfill; withdraw from rare (id 1).
    testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
    c.pause_machine(mid);
    assert!(c.get_max_withdrawable_inventory(mid, 1) >= 1);
    testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
    let _ = c.withdraw_unreserved_inventory(mid, 1, 1);
    // sellable=4 < unsold=5
    testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
    c.unpause_machine(mid);
}

#[test]
fn unpause_ok_when_sold_out() {
    // Sold out → unsold=0; unpause allowed even after withdrawing all spare remaining.
    let mut c = new_contract(100);
    testing_env!(context(creator(), required_create_deposit(10)).build());
    let mid = c.create_machine(
        "Extra".into(),
        "has spare slots".into(),
        "https://example.com/x.png".into(),
        payment_token(),
        U128(1_000),
        10,
        valid_tiers(),
        vec![
            CreateRewardInput {
                token: ft_token(),
                amount_per_win: U128(1),
                tier: Tier::Common,
                quantity: 12,
            },
            CreateRewardInput {
                token: ft_token(),
                amount_per_win: U128(1),
                tier: Tier::Rare,
                quantity: 1,
            },
            CreateRewardInput {
                token: ft_token(),
                amount_per_win: U128(1),
                tier: Tier::Epic,
                quantity: 1,
            },
        ],
    );
    testing_env!(context(ft_token(), NearToken::from_yoctonear(0)).build());
    for (rid, units) in [(0u64, 12u64), (1, 1), (2, 1)] {
        let msg = format!(
            r#"{{"action":"deposit_reward","machine_id":{},"reward_id":{}}}"#,
            mid, rid
        );
        let _ = c.ft_on_transfer(creator(), U128(units as u128), msg);
    }
    testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
    c.activate_machine(mid);
    buy(&mut c, mid, 10, 10_000, 100);
    for (i, pack_id) in c.get_user_packs(buyer(), 0, 20).into_iter().enumerate() {
        let mut ctx = context(buyer(), NearToken::from_yoctonear(0));
        ctx.block_height(400 + i as u64);
        testing_env!(ctx.build());
        let _ = c.open_pack(pack_id);
        c.on_reward_paid(pack_id, ft_token(), U128(1), Ok(()));
    }
    testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
    c.pause_machine(mid);
    let max_w = c.get_max_withdrawable_inventory(mid, 0);
    if max_w > 0 {
        testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
        let _ = c.withdraw_unreserved_inventory(mid, 0, max_w);
    }
    assert_eq!(c.get_machine(mid).unwrap().packs_sold, 10);
    testing_env!(context(creator(), NearToken::from_yoctonear(0)).build());
    c.unpause_machine(mid);
    assert_eq!(c.get_machine(mid).unwrap().status, MachineStatus::Active);
}

#[test]
#[should_panic(expected = "description too long")]
fn create_rejects_long_description() {
    let mut c = new_contract(100);
    let long = "d".repeat(513);
    testing_env!(context(creator(), required_create_deposit(10)).build());
    c.create_machine(
        "Ok".into(),
        long,
        "https://example.com/x.png".into(),
        payment_token(),
        U128(1_000),
        10,
        valid_tiers(),
        valid_rewards(10),
    );
}

#[test]
#[should_panic(expected = "image_url too long")]
fn create_rejects_long_image_url() {
    let mut c = new_contract(100);
    let long = format!("https://example.com/{}", "x".repeat(240));
    testing_env!(context(creator(), required_create_deposit(10)).build());
    c.create_machine(
        "Ok".into(),
        "desc".into(),
        long,
        payment_token(),
        U128(1_000),
        10,
        valid_tiers(),
        valid_rewards(10),
    );
}

#[test]
#[should_panic(expected = "Attach at least")]
fn create_rejects_insufficient_storage_deposit() {
    let mut c = new_contract(100);
    testing_env!(context(creator(), NearToken::from_millinear(50)).build()); // base only, need +0.01 for 10 packs
    c.create_machine(
        "Ok".into(),
        "desc".into(),
        "https://example.com/x.png".into(),
        payment_token(),
        U128(1_000),
        10,
        valid_tiers(),
        valid_rewards(10),
    );
}

#[test]
fn required_create_deposit_view() {
    let c = new_contract(100);
    let d = c.get_required_create_deposit(10);
    assert_eq!(d.0, required_create_deposit(10).as_yoctonear());
    let cfg = c.get_config();
    assert!(!cfg.storage_create_base_yocto.is_empty());
    assert!(!cfg.storage_per_pack_yocto.is_empty());
}
