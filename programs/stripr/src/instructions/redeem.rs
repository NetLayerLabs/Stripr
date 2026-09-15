use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    self, Burn, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::{
    constants::UNDERLYING_VAULT_SEED, errors::StriprError, events::Redeemed,
    multiplier::sync_market, state::Market,
};

#[derive(Accounts)]
pub struct Redeem<'info> {
    pub user: Signer<'info>,

    #[account(mut, has_one = underlying_mint, has_one = pt_mint, has_one = yt_mint)]
    pub market: Box<Account<'info, Market>>,

    #[account(mint::token_program = token_program)]
    pub underlying_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub pt_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub yt_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut, seeds = [UNDERLYING_VAULT_SEED, market.key().as_ref()], bump)]
    pub underlying_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = underlying_mint,
        token::authority = user,
        token::token_program = token_program
    )]
    pub user_underlying: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = pt_mint,
        token::authority = user,
        token::token_program = token_program
    )]
    pub user_pt: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = yt_mint,
        token::authority = user,
        token::token_program = token_program
    )]
    pub user_yt: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
}

/// Burns `shares` PT + YT and returns their principal in raw underlying at the current multiplier.
pub fn handle_redeem(ctx: Context<Redeem>, shares: u64) -> Result<()> {
    require!(shares > 0, StriprError::ZeroAmount);
    let accounts = ctx.accounts;

    sync_market(
        &mut accounts.market,
        &accounts.underlying_mint.to_account_info(),
    )?;
    let amount = accounts.market.raw_for_shares(shares)?;
    require!(amount > 0, StriprError::ZeroAmount);

    let token_program = accounts.token_program.key();
    for (mint, from) in [
        (&accounts.pt_mint, &accounts.user_pt),
        (&accounts.yt_mint, &accounts.user_yt),
    ] {
        token_interface::burn(
            CpiContext::new(
                token_program,
                Burn {
                    mint: mint.to_account_info(),
                    from: from.to_account_info(),
                    authority: accounts.user.to_account_info(),
                },
            ),
            shares,
        )?;
    }

    let seeds = accounts.market.signer_seeds();
    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            token_program,
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

    let market = &mut accounts.market;
    market.total_stripped = market
        .total_stripped
        .checked_sub(shares)
        .ok_or(StriprError::MathOverflow)?;

    emit!(Redeemed {
        market: market.key(),
        user: accounts.user.key(),
        amount,
        shares,
    });
    Ok(())
}
