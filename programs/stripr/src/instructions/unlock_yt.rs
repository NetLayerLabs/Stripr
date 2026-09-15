use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::{
    constants::{POSITION_SEED, YT_ESCROW_SEED},
    errors::StriprError,
    events::YtUnlocked,
    multiplier::sync_market,
    state::{Market, YieldPosition},
};

#[derive(Accounts)]
pub struct UnlockYt<'info> {
    pub user: Signer<'info>,

    #[account(mut, has_one = underlying_mint, has_one = yt_mint)]
    pub market: Box<Account<'info, Market>>,

    #[account(mint::token_program = token_program)]
    pub underlying_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mint::token_program = token_program)]
    pub yt_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut, seeds = [YT_ESCROW_SEED, market.key().as_ref()], bump)]
    pub yt_escrow: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = yt_mint,
        token::authority = user,
        token::token_program = token_program
    )]
    pub user_yt: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [POSITION_SEED, market.key().as_ref(), user.key().as_ref()],
        bump = position.bump
    )]
    pub position: Box<Account<'info, YieldPosition>>,

    pub token_program: Interface<'info, TokenInterface>,
}

/// Returns `amount` locked YT to the user. Yield earned so far stays claimable.
pub fn handle_unlock_yt(ctx: Context<UnlockYt>, amount: u64) -> Result<()> {
    require!(amount > 0, StriprError::ZeroAmount);
    let accounts = ctx.accounts;
    require!(
        accounts.position.yt_locked >= amount,
        StriprError::InsufficientLockedYt
    );

    // Credit multiplier growth up to now before this YT stops earning.
    sync_market(
        &mut accounts.market,
        &accounts.underlying_mint.to_account_info(),
    )?;

    let seeds = accounts.market.signer_seeds();
    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            accounts.token_program.key(),
            TransferChecked {
                from: accounts.yt_escrow.to_account_info(),
                mint: accounts.yt_mint.to_account_info(),
                to: accounts.user_yt.to_account_info(),
                authority: accounts.market.to_account_info(),
            },
            &[&seeds[..]],
        ),
        amount,
        accounts.yt_mint.decimals,
    )?;

    let market = &mut accounts.market;
    let position = &mut accounts.position;
    position.settle(market.acc_dividend_per_yt, market.acc_stock_per_yt)?;
    let locked = position.yt_locked - amount;
    position.set_locked(locked, market.acc_dividend_per_yt, market.acc_stock_per_yt)?;
    market.total_yt_locked = market
        .total_yt_locked
        .checked_sub(amount)
        .ok_or(StriprError::MathOverflow)?;

    emit!(YtUnlocked {
        market: market.key(),
        user: accounts.user.key(),
        amount,
    });
    Ok(())
}
