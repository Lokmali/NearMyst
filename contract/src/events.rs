//! NEP-297 style structured event logs.

use near_sdk::serde::Serialize;
use near_sdk::{env, AccountId};

const EVENT_STANDARD: &str = "nearmyst";
const EVENT_VERSION: &str = "1.0.0";

#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
struct EventEnvelope<'a, T: Serialize> {
    standard: &'a str,
    version: &'a str,
    event: &'a str,
    data: T,
}

fn emit<T: Serialize>(event: &str, data: T) {
    let envelope = EventEnvelope {
        standard: EVENT_STANDARD,
        version: EVENT_VERSION,
        event,
        data,
    };
    env::log_str(&format!(
        "EVENT_JSON:{}",
        near_sdk::serde_json::to_string(&envelope).unwrap_or_default()
    ));
}

pub fn emit_machine_created(machine_id: u64, creator: &AccountId, name: &str) {
    #[derive(Serialize)]
    #[serde(crate = "near_sdk::serde")]
    struct D<'a> {
        machine_id: u64,
        creator: &'a AccountId,
        name: &'a str,
    }
    emit(
        "machine_created",
        D {
            machine_id,
            creator,
            name,
        },
    );
}

pub fn emit_reward_deposited(machine_id: u64, reward_id: u64, units: u64, amount: u128) {
    #[derive(Serialize)]
    #[serde(crate = "near_sdk::serde")]
    struct D {
        machine_id: u64,
        reward_id: u64,
        units: u64,
        amount: u128,
    }
    emit(
        "reward_deposited",
        D {
            machine_id,
            reward_id,
            units,
            amount,
        },
    );
}

pub fn emit_machine_activated(machine_id: u64) {
    #[derive(Serialize)]
    #[serde(crate = "near_sdk::serde")]
    struct D {
        machine_id: u64,
    }
    emit("machine_activated", D { machine_id });
}

pub fn emit_packs_purchased(machine_id: u64, buyer: &AccountId, quantity: u64, pack_ids: &[u64]) {
    #[derive(Serialize)]
    #[serde(crate = "near_sdk::serde")]
    struct D<'a> {
        machine_id: u64,
        buyer: &'a AccountId,
        quantity: u64,
        pack_ids: &'a [u64],
    }
    emit(
        "packs_purchased",
        D {
            machine_id,
            buyer,
            quantity,
            pack_ids,
        },
    );
}

pub fn emit_pack_opened(pack_id: u64, reward_id: u64, random_ref: &str) {
    #[derive(Serialize)]
    #[serde(crate = "near_sdk::serde")]
    struct D<'a> {
        pack_id: u64,
        reward_id: u64,
        random_ref: &'a str,
    }
    emit(
        "pack_opened",
        D {
            pack_id,
            reward_id,
            random_ref,
        },
    );
}

pub fn emit_reward_paid(pack_id: u64, token: &AccountId, amount: u128) {
    #[derive(Serialize)]
    #[serde(crate = "near_sdk::serde")]
    struct D<'a> {
        pack_id: u64,
        token: &'a AccountId,
        amount: u128,
    }
    emit(
        "reward_paid",
        D {
            pack_id,
            token,
            amount,
        },
    );
}

pub fn emit_reward_failed(pack_id: u64) {
    #[derive(Serialize)]
    #[serde(crate = "near_sdk::serde")]
    struct D {
        pack_id: u64,
    }
    emit("reward_failed", D { pack_id });
}

pub fn emit_machine_paused(machine_id: u64, paused: bool) {
    #[derive(Serialize)]
    #[serde(crate = "near_sdk::serde")]
    struct D {
        machine_id: u64,
        paused: bool,
    }
    emit("machine_paused", D { machine_id, paused });
}

pub fn emit_withdraw_paid(kind: &str, machine_id: u64, amount: u128) {
    #[derive(Serialize)]
    #[serde(crate = "near_sdk::serde")]
    struct D<'a> {
        kind: &'a str,
        machine_id: u64,
        amount: u128,
    }
    emit(
        "withdraw_paid",
        D {
            kind,
            machine_id,
            amount,
        },
    );
}

pub fn emit_withdraw_failed(kind: &str, machine_id: u64, amount: u128) {
    #[derive(Serialize)]
    #[serde(crate = "near_sdk::serde")]
    struct D<'a> {
        kind: &'a str,
        machine_id: u64,
        amount: u128,
    }
    emit(
        "withdraw_failed",
        D {
            kind,
            machine_id,
            amount,
        },
    );
}
