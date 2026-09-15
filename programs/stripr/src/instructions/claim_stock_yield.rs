use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{
    constants::{POSITION_SEED, UNDERLYING_VAULT_SEED},
    errors::StriprError,
    events::StockYieldClaimed,
    multiplier::sync_market,
    state::{Market, YieldPosition},
};

#[derive(Accounts)]
pub struct ClaimStockYield<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, has_one = underlying_mint)]
    pub market: Box<Account<'info, Market>>,

    #[account(mint::token_program = token_program)]
    pub underlying_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut, seeds = [UNDERLYING_VAULT_SEED, market.key().as_ref()], bump)]
    pub underlying_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [POSITION_SEED, market.key().as_ref(), user.key().as_ref()],
        bump = position.bump
    )]
    pub position: Box<Account<'info, YieldPosition>>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = underlying_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program
    )]
    pub user_underlying: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

/// Pays out the underlying stock the position earned from multiplier growth.
pub fn handle_claim_stock_yield(ctx: Context<ClaimStockYield>) -> Result<()> {
    let accounts = ctx.accounts;
    sync_market(
        &mut accounts.market,
        &accounts.underlying_mint.to_account_info(),
    )?;

    let position = &mut accounts.position;
    position.settle(
        accounts.market.acc_dividend_per_yt,
        accounts.market.acc_stock_per_yt,
    )?;
    let amount = position.unclaimed_stock;
    require!(amount > 0, StriprError::NothingToClaim);
    position.unclaimed_stock = 0;
    position.total_stock_claimed = position
        .total_stock_claimed
        .checked_add(amount)
        .ok_or(StriprError::MathOverflow)?;

    let seeds = accounts.market.signer_seeds();
    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            accounts.token_program.key(),
            TransferChecked {
                from: accounts.underlying_vault.to_account_info(),
                mint: accounts.underlying_mint.to_account_info(),
                to: accounts.user_underlying.to_account_info(),
                authority: accounts.market.to_account_info(),
            },
            &[&seeds[..]],
        ),
        amount,
        accounts.underlying_mint.decimals,
    )?;

    emit!(StockYieldClaimed {
        market: accounts.market.key(),
        user: accounts.user.key(),
        amount,
    });
    Ok(())
}
