use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::{
    constants::DIVIDEND_VAULT_SEED, errors::StriprError, events::DividendDistributed, state::Market,
};

#[derive(Accounts)]
pub struct DistributeDividend<'info> {
    pub admin: Signer<'info>,

    #[account(mut, has_one = admin @ StriprError::Unauthorized, has_one = dividend_mint)]
    pub market: Box<Account<'info, Market>>,

    #[account(mint::token_program = dividend_token_program)]
    pub dividend_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut, seeds = [DIVIDEND_VAULT_SEED, market.key().as_ref()], bump)]
    pub dividend_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = dividend_mint,
        token::authority = admin,
        token::token_program = dividend_token_program
    )]
    pub admin_dividend: Box<InterfaceAccount<'info, TokenAccount>>,

    pub dividend_token_program: Interface<'info, TokenInterface>,
}

/// Deposits a dividend payout and credits it pro-rata to all locked YT.
pub fn handle_distribute_dividend(ctx: Context<DistributeDividend>, amount: u64) -> Result<()> {
    require!(amount > 0, StriprError::ZeroAmount);
    let accounts = ctx.accounts;

    token_interface::transfer_checked(
        CpiContext::new(
            accounts.dividend_token_program.key(),
            TransferChecked {
                from: accounts.admin_dividend.to_account_info(),
                mint: accounts.dividend_mint.to_account_info(),
                to: accounts.dividend_vault.to_account_info(),
                authority: accounts.admin.to_account_info(),
            },
        ),
        amount,
        accounts.dividend_mint.decimals,
    )?;

    let market = &mut accounts.market;
    market.record_dividend(amount)?;

    emit!(DividendDistributed {
        market: market.key(),
        amount,
        acc_dividend_per_yt: market.acc_dividend_per_yt,
    });
    Ok(())
}
