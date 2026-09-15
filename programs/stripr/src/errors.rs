use anchor_lang::prelude::*;

#[error_code]
pub enum StriprError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Only the market admin can do this")]
    Unauthorized,
    #[msg("No YT is locked in this market, so the dividend has no recipients")]
    NoYieldTokensLocked,
    #[msg("Dividend is too small to register against the locked YT supply")]
    DividendTooSmall,
    #[msg("Not enough YT locked in this position")]
    InsufficientLockedYt,
    #[msg("No dividends to claim")]
    NothingToClaim,
    #[msg("The stock's scaled UI multiplier is invalid")]
    InvalidMultiplier,
    #[msg("Offers can only sell this market's PT or YT")]
    InvalidOfferToken,
    #[msg("The offer's price changed. Review it and try again")]
    OfferPriceChanged,
    #[msg("Not enough left in this offer")]
    InsufficientOfferAmount,
}
