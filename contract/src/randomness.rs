//! Randomness abstraction for pack opening.
//!
//! # Honesty notice
//! Testnet demo randomness uses `env::random_seed()` combined with pack/machine/opener.
//! This is **NOT production secure**. Block producers can influence `random_seed`.
//! Production requires a verifiable randomness source (VRF / oracle).
//! Do NOT treat `random_ref` as a cryptographic proof.

/// Swappable randomness source.
pub trait RandomnessSource {
    /// Produce a 32-byte entropy buffer for this open attempt.
    fn entropy(
        &self,
        pack_id: u64,
        machine_id: u64,
        opener: &str,
        purchased_at_block: u64,
        current_block: u64,
    ) -> [u8; 32];
}

/// Testnet adapter — NOT production secure.
pub struct TestnetRandomness;

impl RandomnessSource for TestnetRandomness {
    fn entropy(
        &self,
        pack_id: u64,
        machine_id: u64,
        opener: &str,
        purchased_at_block: u64,
        current_block: u64,
    ) -> [u8; 32] {
        // Buyer must open in a LATER block so they cannot know the seed at purchase.
        near_sdk::require!(
            current_block > purchased_at_block,
            "open_pack requires a later block than purchase (testnet randomness rule)"
        );

        let seed = near_sdk::env::random_seed();
        let mut data = Vec::with_capacity(64 + opener.len());
        data.extend_from_slice(&seed);
        data.extend_from_slice(&pack_id.to_le_bytes());
        data.extend_from_slice(&machine_id.to_le_bytes());
        data.extend_from_slice(&purchased_at_block.to_le_bytes());
        data.extend_from_slice(&current_block.to_le_bytes());
        data.extend_from_slice(opener.as_bytes());

        // sha256 via env
        let hash = near_sdk::env::sha256(&data);
        let mut out = [0u8; 32];
        out.copy_from_slice(&hash);
        out
    }
}

/// Map entropy to a roll in `[0, denominator)`.
pub fn roll_bps(entropy: &[u8; 32], denominator: u16) -> u16 {
    let mut bytes = [0u8; 8];
    bytes.copy_from_slice(&entropy[0..8]);
    let v = u64::from_le_bytes(bytes);
    (v % u64::from(denominator)) as u16
}

/// Hex-encode first 16 bytes as a human-readable random_ref (not a proof).
pub fn random_ref_hex(entropy: &[u8; 32]) -> String {
    entropy[..16]
        .iter()
        .map(|b| format!("{:02x}", b))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roll_in_range() {
        let e = [1u8; 32];
        let r = roll_bps(&e, 10_000);
        assert!(r < 10_000);
    }

    #[test]
    fn ref_length() {
        let e = [0xabu8; 32];
        assert_eq!(random_ref_hex(&e).len(), 32);
    }
}
