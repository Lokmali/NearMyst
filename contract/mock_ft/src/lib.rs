//! Minimal NEP-141 FT for sandbox tests (supports `ft_transfer` + `ft_transfer_call`).
//!
//! `storage_deposit` is payable and accepts the standard NEP-141 arg shape
//! (`account_id`, `registration_only`). Min storage is 0.00125 Ⓝ to mirror
//! common FT contracts; excess deposit is kept (simplified — no refund helper).

use near_sdk::borsh::BorshSerialize;
use near_sdk::json_types::U128;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::store::LookupMap;
use near_sdk::{
    env, ext_contract, near, require, AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault,
    PromiseOrValue, PromiseResult,
};

const GAS_FOR_FT_TRANSFER_CALL: Gas = Gas::from_tgas(30);
const GAS_FOR_RESOLVE: Gas = Gas::from_tgas(10);
/// ~0.00125 Ⓝ — typical NEP-141 registration.
const STORAGE_BYTE_COST: u128 = 1_250_000_000_000_000_000;
/// 1 NEAR = 10^24 yoctoNEAR.
const YOCTO_PER_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
/// Demo swap rate: 1 NEAR → 100_000 $myst (0 decimals).
/// 0.01 Ⓝ ≈ 1_000 tokens (one default pack).
const MYST_PER_NEAR: u128 = 100_000;

#[derive(BorshSerialize, BorshStorageKey)]
#[borsh(crate = "near_sdk::borsh")]
enum StorageKey {
    Accounts,
}

#[ext_contract(ext_ft_receiver)]
pub trait ExtFtReceiver {
    fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128>;
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    accounts: LookupMap<AccountId, u128>,
    total_supply: u128,
}

#[near]
impl Contract {
    #[init]
    pub fn new(owner_id: AccountId, total_supply: U128) -> Self {
        let mut accounts = LookupMap::new(StorageKey::Accounts);
        accounts.insert(owner_id, total_supply.0);
        Self {
            accounts,
            total_supply: total_supply.0,
        }
    }

    pub fn ft_total_supply(&self) -> U128 {
        U128(self.total_supply)
    }

    pub fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        U128(self.accounts.get(&account_id).copied().unwrap_or(0))
    }

    pub fn storage_balance_bounds(&self) -> StorageBalanceBounds {
        StorageBalanceBounds {
            min: U128(STORAGE_BYTE_COST),
            max: None,
        }
    }

    pub fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        if self.accounts.contains_key(&account_id) {
            Some(StorageBalance {
                total: U128(STORAGE_BYTE_COST),
                available: U128(0),
            })
        } else {
            None
        }
    }

    /// NEP-141-compatible storage registration. Attach at least `storage_balance_bounds().min`.
    #[payable]
    pub fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> StorageBalance {
        let account_id = account_id.unwrap_or_else(env::predecessor_account_id);
        let deposit = env::attached_deposit().as_yoctonear();
        let already = self.accounts.contains_key(&account_id);
        if already {
            let _ = registration_only;
            // Already registered — accept (or ignore) extra deposit like many FTs.
            return StorageBalance {
                total: U128(STORAGE_BYTE_COST),
                available: U128(0),
            };
        }
        require!(
            deposit >= STORAGE_BYTE_COST,
            "attached deposit below storage minimum (0.00125 NEAR)"
        );
        let _ = registration_only;
        self.accounts.insert(account_id, 0);
        StorageBalance {
            total: U128(STORAGE_BYTE_COST),
            available: U128(0),
        }
    }

    #[payable]
    pub fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        require!(
            env::attached_deposit() >= NearToken::from_yoctonear(1),
            "Requires attached deposit of exactly 1 yoctoNEAR"
        );
        let sender = env::predecessor_account_id();
        self.internal_transfer(&sender, &receiver_id, amount.0);
        let _ = memo;
    }

    #[payable]
    pub fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128> {
        require!(
            env::attached_deposit() >= NearToken::from_yoctonear(1),
            "Requires attached deposit of exactly 1 yoctoNEAR"
        );
        let sender = env::predecessor_account_id();
        self.internal_transfer(&sender, &receiver_id, amount.0);
        let _ = memo;
        ext_ft_receiver::ext(receiver_id.clone())
            .with_static_gas(GAS_FOR_FT_TRANSFER_CALL)
            .ft_on_transfer(sender.clone(), amount, msg)
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_FOR_RESOLVE)
                    .ft_resolve_transfer(sender, receiver_id, amount),
            )
            .into()
    }

    #[private]
    pub fn ft_resolve_transfer(
        &mut self,
        sender_id: AccountId,
        receiver_id: AccountId,
        amount: U128,
    ) -> U128 {
        let unused = match env::promise_result(0) {
            PromiseResult::Successful(value) => {
                near_sdk::serde_json::from_slice::<U128>(&value)
                    .map(|v| v.0)
                    .unwrap_or(0)
                    .min(amount.0)
            }
            _ => amount.0,
        };
        if unused > 0 {
            self.internal_transfer(&receiver_id, &sender_id, unused);
        }
        U128(amount.0.saturating_sub(unused))
    }

    /// Test helper: remove account registration so transfers fail.
    pub fn force_unregister(&mut self, account_id: AccountId) {
        self.accounts.remove(&account_id);
    }

    /// Fixed demo rate: how many $myst you get per 1 NEAR attached.
    pub fn get_buy_rate(&self) -> U128 {
        U128(MYST_PER_NEAR)
    }

    /// Preview $myst minted for an attached NEAR amount (yocto), including
    /// first-time storage registration deduction when `account_id` is new.
    pub fn quote_buy(&self, account_id: AccountId, attached_yocto: U128) -> BuyQuote {
        let registered = self.accounts.contains_key(&account_id);
        let (spendable, storage_used) =
            Self::spendable_after_storage(registered, attached_yocto.0);
        let tokens = Self::myst_for_yocto(spendable);
        BuyQuote {
            tokens: U128(tokens),
            spendable_yocto: U128(spendable),
            storage_yocto: U128(storage_used),
            rate_myst_per_near: U128(MYST_PER_NEAR),
            registered,
        }
    }

    /// Pay testnet NEAR → mint demo $myst at `get_buy_rate()`.
    /// Auto-registers the buyer (takes 0.00125 Ⓝ from the deposit once).
    #[payable]
    pub fn buy(&mut self) -> U128 {
        let buyer = env::predecessor_account_id();
        let deposit = env::attached_deposit().as_yoctonear();
        require!(deposit > 0, "attach NEAR to buy $myst");

        let registered = self.accounts.contains_key(&buyer);
        let (spendable, storage_used) = Self::spendable_after_storage(registered, deposit);
        if !registered {
            require!(
                storage_used > 0,
                "attach at least 0.00125 NEAR to register and buy"
            );
            self.accounts.insert(buyer.clone(), 0);
        }

        let amount = Self::myst_for_yocto(spendable);
        require!(
            amount > 0,
            "deposit too small after storage — attach more NEAR"
        );

        let bal = self.accounts.get(&buyer).copied().unwrap_or(0);
        self.accounts.insert(buyer, bal + amount);
        self.total_supply = self
            .total_supply
            .checked_add(amount)
            .unwrap_or_else(|| env::panic_str("total_supply overflow"));
        U128(amount)
    }

    fn spendable_after_storage(registered: bool, deposit: u128) -> (u128, u128) {
        if registered {
            return (deposit, 0);
        }
        if deposit < STORAGE_BYTE_COST {
            return (0, 0);
        }
        (deposit - STORAGE_BYTE_COST, STORAGE_BYTE_COST)
    }

    fn myst_for_yocto(spendable_yocto: u128) -> u128 {
        spendable_yocto
            .checked_mul(MYST_PER_NEAR)
            .unwrap_or_else(|| env::panic_str("quote overflow"))
            / YOCTO_PER_NEAR
    }

    fn internal_transfer(&mut self, from: &AccountId, to: &AccountId, amount: u128) {
        require!(amount > 0, "amount > 0");
        let from_bal = self.accounts.get(from).copied().unwrap_or(0);
        require!(from_bal >= amount, "insufficient balance");
        require!(
            self.accounts.contains_key(to),
            "receiver not registered"
        );
        let to_bal = self.accounts.get(to).copied().unwrap_or(0);
        self.accounts.insert(from.clone(), from_bal - amount);
        self.accounts.insert(to.clone(), to_bal + amount);
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct StorageBalance {
    pub total: U128,
    pub available: U128,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct StorageBalanceBounds {
    pub min: U128,
    pub max: Option<U128>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct BuyQuote {
    pub tokens: U128,
    pub spendable_yocto: U128,
    pub storage_yocto: U128,
    pub rate_myst_per_near: U128,
    pub registered: bool,
}
