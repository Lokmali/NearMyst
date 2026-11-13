//! NearMyst — FT mystery-pack launchpad (NEAR testnet demo).
//!
//! # Randomness disclaimer
//! Testnet demo uses `env::random_seed()`. NOT production secure.
//! Block producers can influence it. Production needs VRF/oracle.

pub mod allocation;
pub mod events;
pub mod ft_ext;
pub mod randomness;
pub mod types;
pub mod validation;

use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use near_sdk::borsh::BorshSerialize;
use near_sdk::json_types::U128;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::store::{IterableMap, LookupMap, Vector};
use near_sdk::{
    env, near, require, AccountId, BorshStorageKey, PanicOnDefault, Promise, PromiseError,
    PromiseOrValue,
};

use crate::allocation::{
    consume_reward_unit, max_withdrawable_units, reserve_slots, select_reward, sellable_slots,
};
use crate::events::{
    emit_machine_activated, emit_machine_created, emit_machine_paused, emit_pack_opened,
    emit_packs_purchased, emit_reward_deposited, emit_reward_failed, emit_reward_paid,
    emit_withdraw_failed, emit_withdraw_paid,
};
use crate::ft_ext::{ext_ft, one_yocto};
use crate::randomness::{random_ref_hex, roll_bps, RandomnessSource, TestnetRandomness};
use crate::types::{
    required_create_deposit, FtAction, Machine, MachineStatus, MachineView, Pack, PackResult,
    PackStatus, PlatformConfig, Reward, Tier, TierConfig, GAS_FOR_FT_RESOLVE, GAS_FOR_FT_TRANSFER,
    MAX_BUY_QUANTITY, MAX_FT_MSG_LEN, MAX_PLATFORM_FEE_BPS, PROBABILITY_DENOMINATOR,
    STORAGE_CREATE_BASE, STORAGE_PER_PACK_YOCTO,
};
use crate::validation::{assert_tier_probabilities, split_fee, validate_create_machine};

#[derive(BorshSerialize, BorshStorageKey)]
#[borsh(crate = "near_sdk::borsh")]
enum StorageKey {
    Machines,
    MachineIds,
    Packs,
    UserPacks,
    PackResults,
    PendingClaims,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub owner: AccountId,
    pub platform_fee_bps: u16,
    pub fee_receiver: AccountId,
    pub machines: IterableMap<u64, Machine>,
    pub machine_ids: Vector<u64>,
    pub packs: LookupMap<u64, Pack>,
    pub user_packs: LookupMap<AccountId, Vec<u64>>,
    pub pack_results: LookupMap<u64, PackResult>,
    pub pending_claims: LookupMap<u64, bool>,
    pub next_machine_id: u64,
    pub next_pack_id: u64,
}

#[near]
impl Contract {
    #[init]
    pub fn new(owner: AccountId, platform_fee_bps: u16, fee_receiver: AccountId) -> Self {
        require!(
            platform_fee_bps <= MAX_PLATFORM_FEE_BPS,
            format!(
                "platform_fee_bps exceeds hard max of {} (10%)",
                MAX_PLATFORM_FEE_BPS
            )
        );
        Self {
            owner,
            platform_fee_bps,
            fee_receiver,
            machines: IterableMap::new(StorageKey::Machines),
            machine_ids: Vector::new(StorageKey::MachineIds),
            packs: LookupMap::new(StorageKey::Packs),
            user_packs: LookupMap::new(StorageKey::UserPacks),
            pack_results: LookupMap::new(StorageKey::PackResults),
            pending_claims: LookupMap::new(StorageKey::PendingClaims),
            next_machine_id: 1,
            next_pack_id: 1,
        }
    }

    // -----------------------------------------------------------------------
    // Create / activate (Day 1)
    // -----------------------------------------------------------------------

    /// Prepaid storage for machine metadata + up to `max_packs` pack rows.
    /// Formula: 0.05 Ⓝ + `max_packs` × 0.001 Ⓝ (see `get_required_create_deposit`).
    #[payable]
    pub fn create_machine(
        &mut self,
        name: String,
        description: String,
        image_url: String,
        payment_token: AccountId,
        pack_price: U128,
        max_packs: u64,
        tiers: Vec<TierConfig>,
        rewards: Vec<CreateRewardInput>,
    ) -> u64 {
        validate_create_machine(
            &name,
            &description,
            &image_url,
            pack_price.0,
            max_packs,
            &tiers,
            &rewards,
        );
        assert_tier_probabilities(&tiers);

        let needed = required_create_deposit(max_packs);
        require!(
            env::attached_deposit() >= needed,
            format!(
                "Attach at least {} yoctoNEAR for storage (0.05 Ⓝ + {} × 0.001 Ⓝ per pack)",
                needed.as_yoctonear(),
                max_packs
            )
        );

        let creator = env::predecessor_account_id();
        let machine_id = self.next_machine_id;
        self.next_machine_id = machine_id
            .checked_add(1)
            .unwrap_or_else(|| env::panic_str("machine id overflow"));

        let reward_structs: Vec<Reward> = rewards
            .into_iter()
            .enumerate()
            .map(|(i, r)| Reward {
                id: i as u64,
                token: r.token,
                amount_per_win: r.amount_per_win,
                tier: r.tier,
                quantity_total: r.quantity,
                quantity_deposited: 0,
                quantity_reserved: 0,
                quantity_remaining: 0,
            })
            .collect();

        let machine = Machine {
            id: machine_id,
            creator: creator.clone(),
            name: name.clone(),
            description,
            image_url,
            payment_token,
            pack_price,
            max_packs,
            packs_sold: 0,
            unopened_packs: 0,
            status: MachineStatus::Draft,
            tiers,
            rewards: reward_structs,
            creator_earnings: U128(0),
            platform_earnings: U128(0),
        };

        self.machines.insert(machine_id, machine);
        self.machine_ids.push(machine_id);
        emit_machine_created(machine_id, &creator, &name);
        machine_id
    }

    pub fn activate_machine(&mut self, machine_id: u64) {
        let machine = self
            .machines
            .get_mut(&machine_id)
            .unwrap_or_else(|| env::panic_str("machine not found"));

        require!(
            machine.creator == env::predecessor_account_id(),
            "only creator can activate"
        );
        require!(
            machine.status == MachineStatus::Draft,
            "machine must be in Draft status"
        );

        let deposited: u64 = machine.rewards.iter().map(|r| r.quantity_deposited).sum();
        require!(
            deposited >= machine.max_packs,
            format!(
                "insufficient inventory: deposited {} slots, need >= max_packs ({})",
                deposited, machine.max_packs
            )
        );

        for reward in machine.rewards.iter_mut() {
            reward.quantity_remaining = reward
                .quantity_deposited
                .checked_sub(reward.quantity_reserved)
                .unwrap_or_else(|| env::panic_str("remaining underflow"));
        }

        machine.status = MachineStatus::Active;
        emit_machine_activated(machine_id);
    }

    // -----------------------------------------------------------------------
    // Pause
    // -----------------------------------------------------------------------

    pub fn pause_machine(&mut self, machine_id: u64) {
        let caller = env::predecessor_account_id();
        let machine = self
            .machines
            .get_mut(&machine_id)
            .unwrap_or_else(|| env::panic_str("machine not found"));
        require!(
            caller == machine.creator || caller == self.owner,
            "only creator or platform owner may pause"
        );
        require!(
            machine.status == MachineStatus::Active,
            "machine must be Active to pause"
        );
        machine.status = MachineStatus::Paused;
        emit_machine_paused(machine_id, true);
    }

    pub fn unpause_machine(&mut self, machine_id: u64) {
        let caller = env::predecessor_account_id();
        let machine = self
            .machines
            .get_mut(&machine_id)
            .unwrap_or_else(|| env::panic_str("machine not found"));
        require!(
            caller == machine.creator || caller == self.owner,
            "only creator or platform owner may unpause"
        );
        require!(
            machine.status == MachineStatus::Paused,
            "machine must be Paused to unpause"
        );
        // Remaining inventory (after reserved/unopened) must cover packs not yet sold.
        let unsold = machine.max_packs.saturating_sub(machine.packs_sold);
        let sellable = sellable_slots(&machine.rewards, machine.unopened_packs);
        require!(
            sellable >= unsold,
            format!(
                "cannot unpause: sellable inventory {} < unsold packs {}",
                sellable, unsold
            )
        );
        machine.status = MachineStatus::Active;
        emit_machine_paused(machine_id, false);
    }

    // -----------------------------------------------------------------------
    // Open pack + payout
    // -----------------------------------------------------------------------

    /// Open an unopened pack. Must be a **later block** than purchase.
    ///
    /// Checks-effects-interactions: status → Opened before any FT call.
    /// Result is stored on-chain (`get_pack_result`); payout settles via callback.
    pub fn open_pack(&mut self, pack_id: u64) -> Promise {
        let opener = env::predecessor_account_id();
        let mut pack = self
            .packs
            .get(&pack_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str("pack not found"));

        require!(pack.owner == opener, "only pack owner can open");
        require!(
            pack.status == PackStatus::Unopened,
            "pack already opened or claimed"
        );

        let machine_id = pack.machine_id;
        let purchased_at = pack.purchased_at_block;
        let current_block = env::block_height();

        let entropy = TestnetRandomness.entropy(
            pack_id,
            machine_id,
            opener.as_str(),
            purchased_at,
            current_block,
        );
        let roll = roll_bps(&entropy, PROBABILITY_DENOMINATOR);
        let random_ref = random_ref_hex(&entropy);

        let (reward_token, reward_amount, reward_tier, reward_id) = {
            let machine = self
                .machines
                .get_mut(&machine_id)
                .unwrap_or_else(|| env::panic_str("machine not found"));
            // Paused machines: opens still allowed (documented).

            let reward_id = select_reward(&machine.rewards, &machine.tiers, roll)
                .unwrap_or_else(|| env::panic_str("no inventory left to award"));
            let reward = machine
                .rewards
                .iter()
                .find(|r| r.id == reward_id)
                .cloned()
                .unwrap_or_else(|| env::panic_str("reward missing"));

            consume_reward_unit(&mut machine.rewards, reward_id);
            machine.unopened_packs = machine
                .unopened_packs
                .checked_sub(1)
                .unwrap_or_else(|| env::panic_str("unopened_packs underflow"));

            (
                reward.token,
                reward.amount_per_win,
                reward.tier,
                reward_id,
            )
        };

        // Effects before interactions
        pack.status = PackStatus::Opened;
        pack.reward_id.replace(reward_id);
        pack.random_ref.replace(random_ref.clone());
        self.packs.insert(pack_id, pack);

        let result = PackResult {
            machine_id,
            pack_id,
            reward_id,
            random_ref: random_ref.clone(),
            opened_at_block: current_block,
            tier: reward_tier,
            token: reward_token.clone(),
            amount: reward_amount,
        };
        self.pack_results.insert(pack_id, result);
        emit_pack_opened(pack_id, reward_id, &random_ref);

        self.pay_reward(pack_id, reward_token, reward_amount, opener)
    }

    /// Retry a failed FT payout.
    pub fn claim_pending(&mut self, pack_id: u64) -> Promise {
        let caller = env::predecessor_account_id();
        let pack = self
            .packs
            .get(&pack_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str("pack not found"));
        require!(pack.owner == caller, "only pack owner can claim");
        require!(
            pack.status == PackStatus::PendingClaim,
            "pack is not PendingClaim"
        );
        let result = self
            .pack_results
            .get(&pack_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str("missing pack result"));

        // Mark Opened again while payout in flight (prevents double claim races).
        let mut pack = pack;
        pack.status = PackStatus::Opened;
        self.packs.insert(pack_id, pack);
        self.pending_claims.remove(&pack_id);

        self.pay_reward(pack_id, result.token, result.amount, caller)
    }

    fn pay_reward(
        &self,
        pack_id: u64,
        token: AccountId,
        amount: U128,
        winner: AccountId,
    ) -> Promise {
        ext_ft::ext(token.clone())
            .with_static_gas(GAS_FOR_FT_TRANSFER)
            .with_attached_deposit(one_yocto())
            .ft_transfer(winner, amount, Some("nearmyst reward".into()))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_FOR_FT_RESOLVE)
                    .on_reward_paid(pack_id, token, amount),
            )
    }

    /// Private callback — only mark Delivered when FT transfer succeeds.
    #[private]
    pub fn on_reward_paid(
        &mut self,
        pack_id: u64,
        token: AccountId,
        amount: U128,
        #[callback_result] transfer_result: Result<(), PromiseError>,
    ) {
        let mut pack = self
            .packs
            .get(&pack_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str("pack not found"));

        match transfer_result {
            Ok(()) => {
                pack.status = PackStatus::Delivered;
                self.packs.insert(pack_id, pack);
                self.pending_claims.remove(&pack_id);
                emit_reward_paid(pack_id, &token, amount.0);
            }
            Err(_) => {
                pack.status = PackStatus::PendingClaim;
                self.packs.insert(pack_id, pack);
                self.pending_claims.insert(pack_id, true);
                emit_reward_failed(pack_id);
            }
        }
    }

    // -----------------------------------------------------------------------
    // Withdrawals (CEI + resolve callbacks — restore ledger on FT failure)
    // -----------------------------------------------------------------------

    /// Creator withdraws accumulated payment-token earnings.
    pub fn withdraw_creator_earnings(&mut self, machine_id: u64) -> Promise {
        let caller = env::predecessor_account_id();
        let machine = self
            .machines
            .get_mut(&machine_id)
            .unwrap_or_else(|| env::panic_str("machine not found"));
        require!(machine.creator == caller, "only creator");
        let amount = machine.creator_earnings.0;
        require!(amount > 0, "no creator earnings");
        machine.creator_earnings = U128(0);
        let token = machine.payment_token.clone();
        ext_ft::ext(token)
            .with_static_gas(GAS_FOR_FT_TRANSFER)
            .with_attached_deposit(one_yocto())
            .ft_transfer(caller, U128(amount), Some("creator earnings".into()))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_FOR_FT_RESOLVE)
                    .on_creator_earnings_withdrawn(machine_id, U128(amount)),
            )
    }

    #[private]
    pub fn on_creator_earnings_withdrawn(
        &mut self,
        machine_id: u64,
        amount: U128,
        #[callback_result] transfer_result: Result<(), PromiseError>,
    ) {
        match transfer_result {
            Ok(()) => emit_withdraw_paid("creator_earnings", machine_id, amount.0),
            Err(_) => {
                let machine = self
                    .machines
                    .get_mut(&machine_id)
                    .unwrap_or_else(|| env::panic_str("machine not found"));
                machine.creator_earnings = U128(
                    machine
                        .creator_earnings
                        .0
                        .checked_add(amount.0)
                        .unwrap_or_else(|| env::panic_str("creator earnings restore overflow")),
                );
                emit_withdraw_failed("creator_earnings", machine_id, amount.0);
            }
        }
    }

    /// Platform fee_receiver withdraws platform earnings for a machine.
    pub fn withdraw_platform_earnings(&mut self, machine_id: u64) -> Promise {
        let caller = env::predecessor_account_id();
        require!(
            caller == self.fee_receiver || caller == self.owner,
            "only fee_receiver or owner"
        );
        let machine = self
            .machines
            .get_mut(&machine_id)
            .unwrap_or_else(|| env::panic_str("machine not found"));
        let amount = machine.platform_earnings.0;
        require!(amount > 0, "no platform earnings");
        machine.platform_earnings = U128(0);
        let token = machine.payment_token.clone();
        let receiver = self.fee_receiver.clone();
        ext_ft::ext(token)
            .with_static_gas(GAS_FOR_FT_TRANSFER)
            .with_attached_deposit(one_yocto())
            .ft_transfer(receiver, U128(amount), Some("platform fee".into()))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_FOR_FT_RESOLVE)
                    .on_platform_earnings_withdrawn(machine_id, U128(amount)),
            )
    }

    #[private]
    pub fn on_platform_earnings_withdrawn(
        &mut self,
        machine_id: u64,
        amount: U128,
        #[callback_result] transfer_result: Result<(), PromiseError>,
    ) {
        match transfer_result {
            Ok(()) => emit_withdraw_paid("platform_earnings", machine_id, amount.0),
            Err(_) => {
                let machine = self
                    .machines
                    .get_mut(&machine_id)
                    .unwrap_or_else(|| env::panic_str("machine not found"));
                machine.platform_earnings = U128(
                    machine
                        .platform_earnings
                        .0
                        .checked_add(amount.0)
                        .unwrap_or_else(|| env::panic_str("platform earnings restore overflow")),
                );
                emit_withdraw_failed("platform_earnings", machine_id, amount.0);
            }
        }
    }

    /// Withdraw unreserved reward inventory. Never touches reserved units.
    pub fn withdraw_unreserved_inventory(
        &mut self,
        machine_id: u64,
        reward_id: u64,
        units: u64,
    ) -> Promise {
        require!(units > 0, "units must be > 0");
        let caller = env::predecessor_account_id();
        let machine = self
            .machines
            .get_mut(&machine_id)
            .unwrap_or_else(|| env::panic_str("machine not found"));
        require!(machine.creator == caller, "only creator");
        require!(
            machine.status != MachineStatus::Active,
            "pause or keep Draft before withdrawing inventory"
        );

        let max_w = max_withdrawable_units(&machine.rewards, reward_id, machine.unopened_packs);
        require!(
            units <= max_w,
            format!("cannot withdraw reserved/needed inventory (max {})", max_w)
        );

        let reward = machine
            .rewards
            .iter_mut()
            .find(|r| r.id == reward_id)
            .unwrap_or_else(|| env::panic_str("reward not found"));

        reward.quantity_remaining = reward
            .quantity_remaining
            .checked_sub(units)
            .unwrap_or_else(|| env::panic_str("remaining underflow"));
        reward.quantity_deposited = reward
            .quantity_deposited
            .checked_sub(units)
            .unwrap_or_else(|| env::panic_str("deposited underflow"));

        let token = reward.token.clone();
        let amount = u128::from(units)
            .checked_mul(reward.amount_per_win.0)
            .unwrap_or_else(|| env::panic_str("withdraw amount overflow"));

        ext_ft::ext(token)
            .with_static_gas(GAS_FOR_FT_TRANSFER)
            .with_attached_deposit(one_yocto())
            .ft_transfer(caller, U128(amount), Some("unreserved inventory".into()))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_FOR_FT_RESOLVE)
                    .on_inventory_withdrawn(machine_id, reward_id, units, U128(amount)),
            )
    }

    #[private]
    pub fn on_inventory_withdrawn(
        &mut self,
        machine_id: u64,
        reward_id: u64,
        units: u64,
        amount: U128,
        #[callback_result] transfer_result: Result<(), PromiseError>,
    ) {
        match transfer_result {
            Ok(()) => emit_withdraw_paid("unreserved_inventory", machine_id, amount.0),
            Err(_) => {
                let machine = self
                    .machines
                    .get_mut(&machine_id)
                    .unwrap_or_else(|| env::panic_str("machine not found"));
                let reward = machine
                    .rewards
                    .iter_mut()
                    .find(|r| r.id == reward_id)
                    .unwrap_or_else(|| env::panic_str("reward not found"));
                reward.quantity_remaining = reward
                    .quantity_remaining
                    .checked_add(units)
                    .unwrap_or_else(|| env::panic_str("remaining restore overflow"));
                reward.quantity_deposited = reward
                    .quantity_deposited
                    .checked_add(units)
                    .unwrap_or_else(|| env::panic_str("deposited restore overflow"));
                emit_withdraw_failed("unreserved_inventory", machine_id, amount.0);
            }
        }
    }

    // -----------------------------------------------------------------------
    // Views
    // -----------------------------------------------------------------------

    pub fn get_config(&self) -> PlatformConfig {
        PlatformConfig {
            owner: self.owner.clone(),
            platform_fee_bps: self.platform_fee_bps,
            fee_receiver: self.fee_receiver.clone(),
            max_platform_fee_bps: MAX_PLATFORM_FEE_BPS,
            probability_denominator: PROBABILITY_DENOMINATOR,
            storage_create_base_yocto: STORAGE_CREATE_BASE.as_yoctonear().to_string(),
            storage_per_pack_yocto: STORAGE_PER_PACK_YOCTO.to_string(),
        }
    }

    /// View helper: NEAR (yocto string) required to attach on `create_machine`.
    pub fn get_required_create_deposit(&self, max_packs: u64) -> U128 {
        U128(required_create_deposit(max_packs).as_yoctonear())
    }

    /// Max units creator may withdraw for a reward line without breaking inventory.
    pub fn get_max_withdrawable_inventory(
        &self,
        machine_id: u64,
        reward_id: u64,
    ) -> u64 {
        let machine = match self.machines.get(&machine_id) {
            Some(m) => m,
            None => return 0,
        };
        max_withdrawable_units(&machine.rewards, reward_id, machine.unopened_packs)
    }

    pub fn get_machine(&self, machine_id: u64) -> Option<MachineView> {
        self.machines.get(&machine_id).cloned().map(MachineView::from)
    }

    pub fn list_machines(&self, from: u64, limit: u64) -> Vec<MachineView> {
        let limit = limit.min(50);
        let len = u64::from(self.machine_ids.len());
        let mut out = Vec::new();
        let mut i = from;
        while i < len && (out.len() as u64) < limit {
            if let Some(id) = self.machine_ids.get(i as u32) {
                if let Some(m) = self.machines.get(id) {
                    out.push(MachineView::from(m.clone()));
                }
            }
            i += 1;
        }
        out
    }

    pub fn get_pack(&self, pack_id: u64) -> Option<Pack> {
        self.packs.get(&pack_id).cloned()
    }

    pub fn get_user_packs(&self, account_id: AccountId, from: u64, limit: u64) -> Vec<u64> {
        let limit = limit.min(100);
        let all = self
            .user_packs
            .get(&account_id)
            .cloned()
            .unwrap_or_default();
        all.into_iter()
            .skip(from as usize)
            .take(limit as usize)
            .collect()
    }

    pub fn get_pack_result(&self, pack_id: u64) -> Option<PackResult> {
        self.pack_results.get(&pack_id).cloned()
    }

    pub fn is_pending_claim(&self, pack_id: u64) -> bool {
        self.pending_claims.get(&pack_id).copied().unwrap_or(false)
    }

    // -----------------------------------------------------------------------
    // Internal FT handlers
    // -----------------------------------------------------------------------

    pub(crate) fn internal_deposit_reward(
        &mut self,
        sender_id: &AccountId,
        token: &AccountId,
        amount: u128,
        machine_id: u64,
        reward_id: u64,
    ) -> u128 {
        let machine = self
            .machines
            .get_mut(&machine_id)
            .unwrap_or_else(|| env::panic_str("machine not found"));

        require!(
            &machine.creator == sender_id,
            "only creator may deposit rewards"
        );
        require!(
            machine.status == MachineStatus::Draft || machine.status == MachineStatus::Paused,
            "deposits only allowed in Draft or Paused"
        );

        let reward = machine
            .rewards
            .iter_mut()
            .find(|r| r.id == reward_id)
            .unwrap_or_else(|| env::panic_str("reward not found"));

        require!(&reward.token == token, "wrong token for this reward");

        let needed_units = reward
            .quantity_total
            .checked_sub(reward.quantity_deposited)
            .unwrap_or_else(|| env::panic_str("deposit overflow"));
        require!(needed_units > 0, "reward already fully deposited");

        let unit_amount = reward.amount_per_win.0;
        require!(unit_amount > 0, "amount_per_win must be > 0");
        require!(
            amount % unit_amount == 0,
            "deposit amount must be a multiple of amount_per_win"
        );

        let units = amount / unit_amount;
        let accept_units = units.min(u128::from(needed_units)) as u64;
        let accepted = u128::from(accept_units)
            .checked_mul(unit_amount)
            .unwrap_or_else(|| env::panic_str("accepted amount overflow"));
        let unused = amount
            .checked_sub(accepted)
            .unwrap_or_else(|| env::panic_str("unused underflow"));

        reward.quantity_deposited = reward
            .quantity_deposited
            .checked_add(accept_units)
            .unwrap_or_else(|| env::panic_str("quantity_deposited overflow"));
        reward.quantity_remaining = reward
            .quantity_remaining
            .checked_add(accept_units)
            .unwrap_or_else(|| env::panic_str("quantity_remaining overflow"));

        emit_reward_deposited(machine_id, reward_id, accept_units, accepted);
        unused
    }

    pub(crate) fn internal_buy(
        &mut self,
        buyer: &AccountId,
        token: &AccountId,
        amount: u128,
        machine_id: u64,
        quantity: u64,
    ) -> u128 {
        require!(quantity > 0, "quantity must be > 0");
        require!(
            quantity <= MAX_BUY_QUANTITY,
            format!(
                "quantity exceeds per-buy cap of {} (buy in multiple txs)",
                MAX_BUY_QUANTITY
            )
        );

        let platform_fee_bps = self.platform_fee_bps;
        let block = env::block_height();

        {
            let machine = self
                .machines
                .get_mut(&machine_id)
                .unwrap_or_else(|| env::panic_str("machine not found"));

            require!(
                machine.status == MachineStatus::Active,
                "machine not Active (paused or draft)"
            );
            require!(
                &machine.payment_token == token,
                "wrong payment token for this machine"
            );

            let packs_left = machine
                .max_packs
                .checked_sub(machine.packs_sold)
                .unwrap_or_else(|| env::panic_str("packs_sold overflow"));
            require!(quantity <= packs_left, "not enough packs remaining");

            let sellable = sellable_slots(&machine.rewards, machine.unopened_packs);
            require!(
                quantity <= sellable,
                "insufficient unreserved inventory to guarantee fulfillment"
            );

            let price = machine.pack_price.0;
            let total = price
                .checked_mul(u128::from(quantity))
                .unwrap_or_else(|| env::panic_str("purchase total overflow"));
            require!(amount == total, "exact payment required (price * quantity)");

            let (platform_cut, creator_cut) = split_fee(total, platform_fee_bps);
            machine.platform_earnings = U128(
                machine
                    .platform_earnings
                    .0
                    .checked_add(platform_cut)
                    .unwrap_or_else(|| env::panic_str("platform earnings overflow")),
            );
            machine.creator_earnings = U128(
                machine
                    .creator_earnings
                    .0
                    .checked_add(creator_cut)
                    .unwrap_or_else(|| env::panic_str("creator earnings overflow")),
            );

            reserve_slots(&mut machine.rewards, quantity);
            machine.unopened_packs = machine
                .unopened_packs
                .checked_add(quantity)
                .unwrap_or_else(|| env::panic_str("unopened_packs overflow"));
            machine.packs_sold = machine
                .packs_sold
                .checked_add(quantity)
                .unwrap_or_else(|| env::panic_str("packs_sold overflow"));
        }

        let mut pack_ids = Vec::with_capacity(quantity as usize);
        for _ in 0..quantity {
            let pack_id = self.next_pack_id;
            self.next_pack_id = pack_id
                .checked_add(1)
                .unwrap_or_else(|| env::panic_str("pack id overflow"));
            let pack = Pack {
                id: pack_id,
                machine_id,
                owner: buyer.clone(),
                status: PackStatus::Unopened,
                purchased_at_block: block,
                reward_id: None,
                random_ref: None,
            };
            self.packs.insert(pack_id, pack);
            pack_ids.push(pack_id);
        }

        let mut user_list = self.user_packs.get(buyer).cloned().unwrap_or_default();
        user_list.extend(pack_ids.iter().copied());
        self.user_packs.insert(buyer.clone(), user_list);

        emit_packs_purchased(machine_id, buyer, quantity, &pack_ids);
        0
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct CreateRewardInput {
    pub token: AccountId,
    pub amount_per_win: U128,
    pub tier: Tier,
    pub quantity: u64,
}

#[near]
impl FungibleTokenReceiver for Contract {
    fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        let token = env::predecessor_account_id();
        require!(
            msg.len() <= MAX_FT_MSG_LEN,
            format!("ft_on_transfer msg too long (max {} bytes)", MAX_FT_MSG_LEN)
        );
        let action: FtAction = near_sdk::serde_json::from_str(&msg)
            .unwrap_or_else(|_| env::panic_str("invalid ft_on_transfer msg JSON"));

        match action {
            FtAction::DepositReward {
                machine_id,
                reward_id,
            } => {
                let unused =
                    self.internal_deposit_reward(&sender_id, &token, amount.0, machine_id, reward_id);
                PromiseOrValue::Value(U128(unused))
            }
            FtAction::Buy {
                machine_id,
                quantity,
            } => {
                let unused =
                    self.internal_buy(&sender_id, &token, amount.0, machine_id, quantity);
                PromiseOrValue::Value(U128(unused))
            }
        }
    }
}

#[cfg(test)]
mod tests;