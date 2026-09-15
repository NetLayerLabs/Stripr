use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, CloseAccount, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{
    constants::OFFER_ESCROW_SEED,
    events::OfferCancelled,
    state::{Market, Offer},
};

#[derive(Accounts)]
pub struct CancelOffer<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    /// Included so cancellations show up in the market's transaction history.
    pub market: Box<Account<'info, Market>>,

    #[account(mut, has_one = maker, has_one = market, has_one = token_mint, close = maker)]
    pub offer: Box<Account<'info, Offer>>,

    #[account(mint::token_program = token_program)]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut, seeds = [OFFER_ESCROW_SEED, offer.key().as_ref()], bump)]
    pub escrow: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = maker,
        associated_token::mint = token_mint,
        associated_token::authority = maker,
        associated_token::token_program = token_program
    )]
    pub maker_token: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

/// Returns everything in the escrow to the maker and closes the offer.
pub fn handle_cancel_offer(ctx: Context<CancelOffer>) -> Result<()> {
    let accounts = ctx.accounts;
    let returned = accounts.escrow.amount;
    let id_bytes = accounts.offer.id.to_le_bytes();
    let seeds = accounts.offer.signer_seeds(&id_bytes);

    if returned > 0 {
        token_interface::transfer_checked(
            CpiContext::new_with_signer(
                accounts.token_program.key(),
                TransferChecked {
                    from: accounts.escrow.to_account_info(),
                    mint: accounts.token_mint.to_account_info(),
                    to: accounts.maker_token.to_account_info(),
                    authority: accounts.offer.to_account_info(),
                },
                &[&seeds[..]],
            ),
            returned,
            accounts.token_mint.decimals,
        )?;
    }

    token_interface::close_account(CpiContext::new_with_signer(
        accounts.token_program.key(),
        CloseAccount {
            account: accounts.escrow.to_account_info(),
            destination: accounts.maker.to_account_info(),
            authority: accounts.offer.to_account_info(),
        },
        &[&seeds[..]],
    ))?;

    emit!(OfferCancelled {
        market: accounts.market.key(),
        offer: accounts.offer.key(),
        maker: accounts.maker.key(),
        token_mint: accounts.token_mint.key(),
        amount: returned,
    });
    Ok(())
}
