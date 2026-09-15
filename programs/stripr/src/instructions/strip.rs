use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{
    constants::UNDERLYING_VAULT_SEED, errors::StriprError, events::Stripped,
    multiplier::sync_market, state::Market,
};

#[derive(Accounts)]
pub struct Strip<'info> {
    #[account(mut)]
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
        init_if_needed,
        payer = user,
        associated_token::mint = pt_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program
    )]
    pub user_pt: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = yt_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program
    )]
    pub user_yt: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

/// Deposits `amount` raw underlying and mints PT + YT for its value in share units.
pub fn handle_strip(ctx: Context<Strip>, amount: u64) -> Result<()> {
    require!(amount > 0, StriprError::ZeroAmount);
    let accounts = ctx.accounts;

    sync_market(
        &mut accounts.market,
        &accounts.underlying_mint.to_account_info(),
    )?;
    let shares = accounts.market.shares_for_raw(amount)?;
    require!(shares > 0, StriprError::ZeroAmount);

    let token_program = accounts.token_program.key();
    token_interface::transfer_checked(
        CpiContext::new(
            token_program,
            TransferChecked {
                from: accounts.user_underlying.to_account_info(),
                mint: accounts.underlying_mint.to_account_info(),
                to: accounts.underlying_vault.to_account_info(),
                authority: accounts.user.to_account_info(),
            },
        ),
        amount,
        accounts.underlying_mint.decimals,
    )?;

    let seeds = accounts.market.signer_seeds();
    let signer = &[&seeds[..]];
    for (mint, to) in [
        (&accounts.pt_mint, &accounts.user_pt),
        (&accounts.yt_mint, &accounts.user_yt),
    ] {
        token_interface::mint_to(
            CpiContext::new_with_signer(
                token_program,
                MintTo {
                    mint: mint.to_account_info(),
                    to: to.to_account_info(),
                    authority: accounts.market.to_account_info(),
                },
                signer,
            ),
            shares,
        )?;
    }

    let market = &mut accounts.market;
    market.total_stripped = market
        .total_stripped
        .checked_add(shares)
        .ok_or(StriprError::MathOverflow)?;

    emit!(Stripped {
        market: market.key(),
        user: accounts.user.key(),
        amount,
        shares,
    });
    Ok(())
}
