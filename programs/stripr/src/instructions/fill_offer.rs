use anchor_lang::{prelude::*, AccountsClose};
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, CloseAccount, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{
    constants::OFFER_ESCROW_SEED,
    errors::StriprError,
    events::OfferFilled,
    state::{Market, Offer},
};

#[derive(Accounts)]
pub struct FillOffer<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    /// Receives the payment and, once the offer sells out, its rent.
    #[account(mut)]
    pub maker: SystemAccount<'info>,

    #[account(has_one = dividend_mint)]
    pub market: Box<Account<'info, Market>>,

    #[account(mut, has_one = market, has_one = maker, has_one = token_mint)]
    pub offer: Box<Account<'info, Offer>>,

    #[account(mint::token_program = token_program)]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut, seeds = [OFFER_ESCROW_SEED, offer.key().as_ref()], bump)]
    pub escrow: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = token_mint,
        associated_token::authority = taker,
        associated_token::token_program = token_program
    )]
    pub taker_token: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mint::token_program = dividend_token_program)]
    pub dividend_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        token::mint = dividend_mint,
        token::authority = taker,
        token::token_program = dividend_token_program
    )]
    pub taker_quote: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = dividend_mint,
        associated_token::authority = maker,
        associated_token::token_program = dividend_token_program
    )]
    pub maker_quote: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub dividend_token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

/// Buys `amount` share units from the offer. `expected_price` must match the
/// offer's price, so a relisted offer at a new price can't surprise the taker.
pub fn handle_fill_offer(ctx: Context<FillOffer>, amount: u64, expected_price: u64) -> Result<()> {
    require!(amount > 0, StriprError::ZeroAmount);
    let accounts = ctx.accounts;
    require!(
        accounts.offer.price == expected_price,
        StriprError::OfferPriceChanged
    );
    require!(
        amount <= accounts.offer.amount,
        StriprError::InsufficientOfferAmount
    );
    let cost = Offer::cost(accounts.offer.price, amount, accounts.token_mint.decimals)?;
    let remaining = accounts.offer.amount - amount;

    token_interface::transfer_checked(
        CpiContext::new(
            accounts.dividend_token_program.key(),
            TransferChecked {
                from: accounts.taker_quote.to_account_info(),
                mint: accounts.dividend_mint.to_account_info(),
                to: accounts.maker_quote.to_account_info(),
                authority: accounts.taker.to_account_info(),
            },
        ),
        cost,
        accounts.dividend_mint.decimals,
    )?;

    let id_bytes = accounts.offer.id.to_le_bytes();
    let seeds = accounts.offer.signer_seeds(&id_bytes);
    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            accounts.token_program.key(),
            TransferChecked {
                from: accounts.escrow.to_account_info(),
                mint: accounts.token_mint.to_account_info(),
                to: accounts.taker_token.to_account_info(),
                authority: accounts.offer.to_account_info(),
            },
            &[&seeds[..]],
        ),
        amount,
        accounts.token_mint.decimals,
    )?;

    // A sold-out offer closes and refunds its rent, unless someone sent extra
    // tokens to the escrow; then it stays open at zero for the maker to cancel.
    accounts.escrow.reload()?;
    let close = remaining == 0 && accounts.escrow.amount == 0;
    if close {
        token_interface::close_account(CpiContext::new_with_signer(
            accounts.token_program.key(),
            CloseAccount {
                account: accounts.escrow.to_account_info(),
                destination: accounts.maker.to_account_info(),
                authority: accounts.offer.to_account_info(),
            },
            &[&seeds[..]],
        ))?;
    }

    emit!(OfferFilled {
        market: accounts.market.key(),
        offer: accounts.offer.key(),
        maker: accounts.maker.key(),
        taker: accounts.taker.key(),
        token_mint: accounts.token_mint.key(),
        amount,
        price: accounts.offer.price,
        cost,
        remaining,
    });

    accounts.offer.amount = remaining;
    if close {
        accounts.offer.close(accounts.maker.to_account_info())?;
    }
    Ok(())
}
