use anchor_lang::prelude::*;
use anchor_spl::token_2022::{
    spl_token_2022::{
        extension::{
            scaled_ui_amount::ScaledUiAmountConfig, BaseStateWithExtensions, StateWithExtensions,
        },
        state::Mint,
    },
    Token2022,
};

use crate::{
    constants::MULTIPLIER_ONE, errors::StriprError, events::MultiplierSynced, state::Market,
};

/// The mint's effective scaled UI multiplier right now, scaled by `MULTIPLIER_ONE`.
/// Mints without the extension (classic SPL or plain Token-2022) count as 1.
pub fn current_multiplier(mint: &AccountInfo) -> Result<u128> {
    if *mint.owner != Token2022::id() {
        return Ok(MULTIPLIER_ONE);
    }
    let data = mint.try_borrow_data()?;
    let state = StateWithExtensions::<Mint>::unpack(&data)?;
    let Ok(config) = state.get_extension::<ScaledUiAmountConfig>() else {
        return Ok(MULTIPLIER_ONE);
    };

    let effective_at: i64 = config.new_multiplier_effective_timestamp.into();
    let multiplier: f64 = if Clock::get()?.unix_timestamp >= effective_at {
        config.new_multiplier.into()
    } else {
        config.multiplier.into()
    };
    let scaled = multiplier * MULTIPLIER_ONE as f64;
    require!(
        multiplier.is_finite() && scaled >= 1.0 && scaled < 1e30,
        StriprError::InvalidMultiplier
    );
    Ok(scaled as u128)
}

/// Brings the market up to the mint's current multiplier before any balance changes.
pub fn sync_market<'info>(
    market: &mut Account<'info, Market>,
    underlying_mint: &AccountInfo<'info>,
) -> Result<()> {
    let current = current_multiplier(underlying_mint)?;
    let (multiplier, pending_before, yield_before) = (
        market.multiplier,
        market.pending_stock_yield,
        market.total_stock_yield,
    );
    market.sync_multiplier(current)?;

    if market.multiplier != multiplier || market.total_stock_yield != yield_before {
        let allocated = market.total_stock_yield - yield_before;
        // Raw underlying this sync released from backing principal, allocated now or left pending.
        let freed = (market.pending_stock_yield + allocated).saturating_sub(pending_before);
        emit!(MultiplierSynced {
            market: market.key(),
            multiplier: market.multiplier,
            freed,
            allocated,
            acc_stock_per_yt: market.acc_stock_per_yt,
            pending_stock_yield: market.pending_stock_yield,
        });
    }
    Ok(())
}
