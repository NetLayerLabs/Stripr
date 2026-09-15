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
}
