use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod multiplier;
pub mod state;

use instructions::*;

declare_id!("9wpHmYvuq7qrAuH4VV3LyC54d2VyTYFMfveMMph2nzZF");

/// Stripr splits a tokenized stock into a Principal Token (PT) and a Yield
/// Token (YT). Locked YT earns the stock's reinvested dividends (growth in the
/// mint's scaled UI multiplier) plus any cash dividends the admin distributes.
#[program]
pub mod stripr {
    use super::*;

    /// Creates the market, PT/YT mints and vaults for one underlying stock.
    pub fn initialize_market(ctx: Context<InitializeMarket>) -> Result<()> {
        handle_initialize_market(ctx)
    }

    /// Deposits raw underlying and mints PT + YT in share units.
    pub fn strip(ctx: Context<Strip>, amount: u64) -> Result<()> {
        handle_strip(ctx, amount)
    }

    /// Burns PT + YT (share units) and returns the principal in raw underlying.
    pub fn redeem(ctx: Context<Redeem>, shares: u64) -> Result<()> {
        handle_redeem(ctx, shares)
    }

    /// Locks YT so it earns stock yield and cash dividends.
    pub fn lock_yt(ctx: Context<LockYt>, amount: u64) -> Result<()> {
        handle_lock_yt(ctx, amount)
    }

    /// Unlocks YT back to the user's wallet.
    pub fn unlock_yt(ctx: Context<UnlockYt>, amount: u64) -> Result<()> {
        handle_unlock_yt(ctx, amount)
    }

    /// Admin deposits a cash dividend for all locked YT.
    pub fn distribute_dividend(ctx: Context<DistributeDividend>, amount: u64) -> Result<()> {
        handle_distribute_dividend(ctx, amount)
    }

    /// Claims all cash dividends earned by the caller's locked YT.
    pub fn claim_yield(ctx: Context<ClaimYield>) -> Result<()> {
        handle_claim_yield(ctx)
    }

    /// Claims the underlying stock earned from multiplier growth.
    pub fn claim_stock_yield(ctx: Context<ClaimStockYield>) -> Result<()> {
        handle_claim_stock_yield(ctx)
    }

    /// Permissionless: applies the stock's latest scaled UI multiplier.
    pub fn sync_multiplier(ctx: Context<SyncMultiplier>) -> Result<()> {
        handle_sync_multiplier(ctx)
    }

    /// Lists PT or YT for sale at a fixed price in the market's quote token.
    pub fn create_offer(ctx: Context<CreateOffer>, id: u64, amount: u64, price: u64) -> Result<()> {
        handle_create_offer(ctx, id, amount, price)
    }

    /// Buys all or part of an offer at the price the taker expects.
    pub fn fill_offer(ctx: Context<FillOffer>, amount: u64, expected_price: u64) -> Result<()> {
        handle_fill_offer(ctx, amount, expected_price)
    }

    /// Returns an offer's unsold tokens to the maker and closes it.
    pub fn cancel_offer(ctx: Context<CancelOffer>) -> Result<()> {
        handle_cancel_offer(ctx)
    }
}
