use anchor_lang::prelude::*;

#[constant]
pub const MARKET_SEED: &[u8] = b"market";
#[constant]
pub const PT_MINT_SEED: &[u8] = b"pt_mint";
#[constant]
pub const YT_MINT_SEED: &[u8] = b"yt_mint";
#[constant]
pub const UNDERLYING_VAULT_SEED: &[u8] = b"underlying_vault";
#[constant]
pub const DIVIDEND_VAULT_SEED: &[u8] = b"dividend_vault";
#[constant]
pub const YT_ESCROW_SEED: &[u8] = b"yt_escrow";
#[constant]
pub const POSITION_SEED: &[u8] = b"position";

/// Fixed-point scale for the per-YT yield indexes.
pub const ACC_PRECISION: u128 = 1_000_000_000_000;

/// Fixed-point scale for a mint's scaled UI multiplier (1.0 = `MULTIPLIER_ONE`).
pub const MULTIPLIER_ONE: u128 = 1_000_000_000_000;
