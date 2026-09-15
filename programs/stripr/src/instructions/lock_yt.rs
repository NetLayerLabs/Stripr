use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::{
    constants::{POSITION_SEED, YT_ESCROW_SEED},
    errors::StriprError,
    events::YtLocked,
    multiplier::sync_market,
    state::{Market, YieldPosition},
};

#[derive(Accounts)]
pub struct LockYt<'info> {
    #[account(mut)]
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
        init_if_needed,
        payer = user,
        space = 8 + YieldPosition::INIT_SPACE,
        seeds = [POSITION_SEED, market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub position: Box<Account<'info, YieldPosition>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

/// Moves `amount` YT into escrow so it earns cash dividends and stock yield.
pub fn handle_lock_yt(ctx: Context<LockYt>, amount: u64) -> Result<()> {
    require!(amount > 0, StriprError::ZeroAmount);
    let position_bump = ctx.bumps.position;
    let accounts = ctx.accounts;

    // Yield from multiplier growth before this lock belongs to the YT already locked.
    sync_market(
        &mut accounts.market,
        &accounts.underlying_mint.to_account_info(),
    )?;

    token_interface::transfer_checked(
        CpiContext::new(
            accounts.token_program.key(),
            TransferChecked {
                from: accounts.user_yt.to_account_info(),
                mint: accounts.yt_mint.to_account_info(),
                to: accounts.yt_escrow.to_account_info(),
                authority: accounts.user.to_account_info(),
            },
        ),
        amount,
        accounts.yt_mint.decimals,
    )?;

    let market = &mut accounts.market;
    let position = &mut accounts.position;
    if position.owner == Pubkey::default() {
        position.owner = accounts.user.key();
        position.market = market.key();
        position.bump = position_bump;
    }

    position.settle(market.acc_dividend_per_yt, market.acc_stock_per_yt)?;
    let locked = position
        .yt_locked
        .checked_add(amount)
        .ok_or(StriprError::MathOverflow)?;
    position.set_locked(locked, market.acc_dividend_per_yt, market.acc_stock_per_yt)?;
    market.total_yt_locked = market
        .total_yt_locked
        .checked_add(amount)
        .ok_or(StriprError::MathOverflow)?;

    emit!(YtLocked {
        market: market.key(),
        user: accounts.user.key(),
        amount,
    });
    Ok(())
}
