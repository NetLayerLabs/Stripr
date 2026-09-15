use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::{
    constants::{OFFER_ESCROW_SEED, OFFER_SEED},
    errors::StriprError,
    events::OfferCreated,
    state::{Market, Offer},
};

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct CreateOffer<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    pub market: Box<Account<'info, Market>>,

    #[account(
        mint::token_program = token_program,
        constraint = token_mint.key() == market.pt_mint || token_mint.key() == market.yt_mint
            @ StriprError::InvalidOfferToken
    )]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init,
        payer = maker,
        space = 8 + Offer::INIT_SPACE,
        seeds = [OFFER_SEED, market.key().as_ref(), maker.key().as_ref(), &id.to_le_bytes()],
        bump
    )]
    pub offer: Box<Account<'info, Offer>>,

    #[account(
        init,
        payer = maker,
        seeds = [OFFER_ESCROW_SEED, offer.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = offer,
        token::token_program = token_program
    )]
    pub escrow: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = maker,
        token::token_program = token_program
    )]
    pub maker_token: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Token program of the PT/YT mints (the underlying stock's program).
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

/// Lists `amount` PT or YT for sale at `price` quote token base units per whole token.
pub fn handle_create_offer(ctx: Context<CreateOffer>, id: u64, amount: u64, price: u64) -> Result<()> {
    require!(amount > 0 && price > 0, StriprError::ZeroAmount);
    let bump = ctx.bumps.offer;
    let accounts = ctx.accounts;

    token_interface::transfer_checked(
        CpiContext::new(
            accounts.token_program.key(),
            TransferChecked {
                from: accounts.maker_token.to_account_info(),
                mint: accounts.token_mint.to_account_info(),
                to: accounts.escrow.to_account_info(),
                authority: accounts.maker.to_account_info(),
            },
        ),
        amount,
        accounts.token_mint.decimals,
    )?;

    accounts.offer.set_inner(Offer {
        maker: accounts.maker.key(),
        market: accounts.market.key(),
        token_mint: accounts.token_mint.key(),
        quote_mint: accounts.market.dividend_mint,
        id,
        price,
        amount,
        initial_amount: amount,
        created_at: Clock::get()?.unix_timestamp,
        bump,
    });

    emit!(OfferCreated {
        market: accounts.market.key(),
        offer: accounts.offer.key(),
        maker: accounts.maker.key(),
        token_mint: accounts.token_mint.key(),
        amount,
        price,
    });
    Ok(())
}
