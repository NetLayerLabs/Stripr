use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

use crate::{multiplier::sync_market, state::Market};

#[derive(Accounts)]
pub struct SyncMultiplier<'info> {
    #[account(mut, has_one = underlying_mint)]
    pub market: Box<Account<'info, Market>>,

    pub underlying_mint: Box<InterfaceAccount<'info, Mint>>,
}

/// Permissionless: applies the stock's latest scaled UI multiplier to the market.
pub fn handle_sync_multiplier(ctx: Context<SyncMultiplier>) -> Result<()> {
    let accounts = ctx.accounts;
    sync_market(
        &mut accounts.market,
        &accounts.underlying_mint.to_account_info(),
    )
}
