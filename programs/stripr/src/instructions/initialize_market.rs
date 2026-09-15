use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::{constants::*, multiplier::current_multiplier, state::Market};

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mint::token_program = token_program)]
    pub underlying_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mint::token_program = dividend_token_program)]
    pub dividend_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init,
        payer = admin,
        space = 8 + Market::INIT_SPACE,
        seeds = [MARKET_SEED, underlying_mint.key().as_ref()],
        bump
    )]
    pub market: Box<Account<'info, Market>>,

    #[account(
        init,
        payer = admin,
        seeds = [PT_MINT_SEED, market.key().as_ref()],
        bump,
        mint::decimals = underlying_mint.decimals,
        mint::authority = market,
        mint::token_program = token_program
    )]
    pub pt_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init,
        payer = admin,
        seeds = [YT_MINT_SEED, market.key().as_ref()],
        bump,
        mint::decimals = underlying_mint.decimals,
        mint::authority = market,
        mint::token_program = token_program
    )]
    pub yt_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init,
        payer = admin,
        seeds = [UNDERLYING_VAULT_SEED, market.key().as_ref()],
        bump,
        token::mint = underlying_mint,
        token::authority = market,
        token::token_program = token_program
    )]
    pub underlying_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init,
        payer = admin,
        seeds = [YT_ESCROW_SEED, market.key().as_ref()],
        bump,
        token::mint = yt_mint,
        token::authority = market,
        token::token_program = token_program
    )]
    pub yt_escrow: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init,
        payer = admin,
        seeds = [DIVIDEND_VAULT_SEED, market.key().as_ref()],
        bump,
        token::mint = dividend_mint,
        token::authority = market,
        token::token_program = dividend_token_program
    )]
    pub dividend_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Token program of the underlying stock; PT and YT are minted under it too.
    pub token_program: Interface<'info, TokenInterface>,
    pub dividend_token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_market(ctx: Context<InitializeMarket>) -> Result<()> {
    let bump = ctx.bumps.market;
    let accounts = ctx.accounts;
    let multiplier = current_multiplier(&accounts.underlying_mint.to_account_info())?;
    let market = Market {
        admin: accounts.admin.key(),
        underlying_mint: accounts.underlying_mint.key(),
        dividend_mint: accounts.dividend_mint.key(),
        pt_mint: accounts.pt_mint.key(),
        yt_mint: accounts.yt_mint.key(),
        total_stripped: 0,
        total_yt_locked: 0,
        acc_dividend_per_yt: 0,
        total_dividends: 0,
        multiplier,
        acc_stock_per_yt: 0,
        pending_stock_yield: 0,
        total_stock_yield: 0,
        bump,
    };
    accounts.market.set_inner(market);
    Ok(())
}
