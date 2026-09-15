use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{
    constants::{DIVIDEND_VAULT_SEED, POSITION_SEED},
    errors::StriprError,
    events::YieldClaimed,
    state::{Market, YieldPosition},
};

#[derive(Accounts)]
pub struct ClaimYield<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(has_one = dividend_mint)]
    pub market: Box<Account<'info, Market>>,

    #[account(mint::token_program = dividend_token_program)]
    pub dividend_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut, seeds = [DIVIDEND_VAULT_SEED, market.key().as_ref()], bump)]
    pub dividend_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [POSITION_SEED, market.key().as_ref(), user.key().as_ref()],
        bump = position.bump
    )]
    pub position: Box<Account<'info, YieldPosition>>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = dividend_mint,
        associated_token::authority = user,
        associated_token::token_program = dividend_token_program
    )]
    pub user_dividend: Box<InterfaceAccount<'info, TokenAccount>>,

    pub dividend_token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

/// Pays out every dividend the position has earned.
pub fn handle_claim_yield(ctx: Context<ClaimYield>) -> Result<()> {
    let accounts = ctx.accounts;

    let position = &mut accounts.position;
    position.settle(
        accounts.market.acc_dividend_per_yt,
        accounts.market.acc_stock_per_yt,
    )?;
    let amount = position.unclaimed;
    require!(amount > 0, StriprError::NothingToClaim);
    position.unclaimed = 0;
    position.total_claimed = position
        .total_claimed
        .checked_add(amount)
        .ok_or(StriprError::MathOverflow)?;

    let seeds = accounts.market.signer_seeds();
    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            accounts.dividend_token_program.key(),
            TransferChecked {
                from: accounts.dividend_vault.to_account_info(),
                mint: accounts.dividend_mint.to_account_info(),
                to: accounts.user_dividend.to_account_info(),
                authority: accounts.market.to_account_info(),
            },
            &[&seeds[..]],
        ),
        amount,
        accounts.dividend_mint.decimals,
    )?;

    emit!(YieldClaimed {
        market: accounts.market.key(),
        user: accounts.user.key(),
        amount,
    });
    Ok(())
}
