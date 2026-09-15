use anchor_lang::prelude::*;

use crate::{
    constants::{ACC_PRECISION, MARKET_SEED, MULTIPLIER_ONE},
    errors::StriprError,
};

/// One yield-stripping market per underlying stock mint. The market PDA is the
/// mint authority for PT/YT and the owner of every vault.
///
/// PT and YT are denominated in share units: raw underlying × the mint's scaled
/// UI multiplier (1 for mints without one). When the issuer raises the
/// multiplier to reinvest a dividend, fewer raw tokens back the same principal
/// and the freed tokens become yield for locked YT.
#[account]
#[derive(InitSpace)]
pub struct Market {
    pub admin: Pubkey,
    pub underlying_mint: Pubkey,
    pub dividend_mint: Pubkey,
    pub pt_mint: Pubkey,
    pub yt_mint: Pubkey,
    /// Outstanding PT (and YT) supply, in share units.
    pub total_stripped: u64,
    /// YT locked in the escrow and earning.
    pub total_yt_locked: u64,
    /// Cumulative cash dividends per locked YT, scaled by `ACC_PRECISION`.
    pub acc_dividend_per_yt: u128,
    pub total_dividends: u64,
    /// Highest effective scaled UI multiplier applied so far, scaled by `MULTIPLIER_ONE`.
    pub multiplier: u128,
    /// Cumulative raw underlying yield per locked YT, scaled by `ACC_PRECISION`.
    pub acc_stock_per_yt: u128,
    /// Raw underlying freed while no YT was locked; allocated once YT is locked.
    pub pending_stock_yield: u64,
    /// Raw underlying allocated to locked YT over the market's lifetime.
    pub total_stock_yield: u64,
    pub bump: u8,
}

impl Market {
    pub fn signer_seeds(&self) -> [&[u8]; 3] {
        [
            MARKET_SEED,
            self.underlying_mint.as_ref(),
            std::slice::from_ref(&self.bump),
        ]
    }

    pub fn record_dividend(&mut self, amount: u64) -> Result<()> {
        require!(self.total_yt_locked > 0, StriprError::NoYieldTokensLocked);
        let delta = (amount as u128)
            .checked_mul(ACC_PRECISION)
            .ok_or(StriprError::MathOverflow)?
            / self.total_yt_locked as u128;
        require!(delta > 0, StriprError::DividendTooSmall);

        self.acc_dividend_per_yt = self
            .acc_dividend_per_yt
            .checked_add(delta)
            .ok_or(StriprError::MathOverflow)?;
        self.total_dividends = self
            .total_dividends
            .checked_add(amount)
            .ok_or(StriprError::MathOverflow)?;
        Ok(())
    }

    /// Share units minted for depositing `raw` underlying (rounded down).
    pub fn shares_for_raw(&self, raw: u64) -> Result<u64> {
        let shares = (raw as u128)
            .checked_mul(self.multiplier)
            .ok_or(StriprError::MathOverflow)?
            / MULTIPLIER_ONE;
        u64::try_from(shares).map_err(|_| StriprError::MathOverflow.into())
    }

    /// Raw underlying returned for redeeming `shares` (rounded down).
    pub fn raw_for_shares(&self, shares: u64) -> Result<u64> {
        let raw = (shares as u128)
            .checked_mul(MULTIPLIER_ONE)
            .ok_or(StriprError::MathOverflow)?
            / self.multiplier;
        u64::try_from(raw).map_err(|_| StriprError::MathOverflow.into())
    }

    /// Raw underlying reserved to back `shares` of principal (rounded up).
    fn reserved_raw(shares: u64, multiplier: u128) -> Result<u128> {
        Ok((shares as u128)
            .checked_mul(MULTIPLIER_ONE)
            .ok_or(StriprError::MathOverflow)?
            .div_ceil(multiplier))
    }

    /// Applies the mint's current multiplier. Raw underlying no longer needed to
    /// back principal becomes yield for locked YT; with nothing locked it waits in
    /// `pending_stock_yield`. The multiplier never moves down, so a decrease
    /// can't make principal claims exceed the vault.
    pub fn sync_multiplier(&mut self, current: u128) -> Result<()> {
        if current > self.multiplier {
            let freed = Self::reserved_raw(self.total_stripped, self.multiplier)?
                .checked_sub(Self::reserved_raw(self.total_stripped, current)?)
                .ok_or(StriprError::MathOverflow)?;
            self.multiplier = current;
            self.pending_stock_yield = self
                .pending_stock_yield
                .checked_add(u64::try_from(freed).map_err(|_| StriprError::MathOverflow)?)
                .ok_or(StriprError::MathOverflow)?;
        }

        if self.pending_stock_yield > 0 && self.total_yt_locked > 0 {
            let delta = (self.pending_stock_yield as u128)
                .checked_mul(ACC_PRECISION)
                .ok_or(StriprError::MathOverflow)?
                / self.total_yt_locked as u128;
            if delta > 0 {
                self.acc_stock_per_yt = self
                    .acc_stock_per_yt
                    .checked_add(delta)
                    .ok_or(StriprError::MathOverflow)?;
                self.total_stock_yield = self
                    .total_stock_yield
                    .checked_add(self.pending_stock_yield)
                    .ok_or(StriprError::MathOverflow)?;
                self.pending_stock_yield = 0;
            }
        }
        Ok(())
    }
}

/// A user's locked YT in one market and the yield it has earned.
#[account]
#[derive(InitSpace)]
pub struct YieldPosition {
    pub owner: Pubkey,
    pub market: Pubkey,
    pub yt_locked: u64,
    /// Cash dividends (in token units) already accounted for at the current index.
    pub dividend_debt: u128,
    pub unclaimed: u64,
    pub total_claimed: u64,
    /// Raw underlying yield already accounted for at the current stock index.
    pub stock_debt: u128,
    pub unclaimed_stock: u64,
    pub total_stock_claimed: u64,
    pub bump: u8,
}

/// Moves what `locked` earned since `debt` into `unclaimed`. Accrual rounds down.
fn accrue(locked: u64, acc_per_yt: u128, debt: &mut u128, unclaimed: &mut u64) -> Result<()> {
    let accrued = (locked as u128)
        .checked_mul(acc_per_yt)
        .ok_or(StriprError::MathOverflow)?
        / ACC_PRECISION;
    if accrued > *debt {
        let pending = u64::try_from(accrued - *debt).map_err(|_| StriprError::MathOverflow)?;
        *unclaimed = unclaimed
            .checked_add(pending)
            .ok_or(StriprError::MathOverflow)?;
        *debt = accrued;
    }
    Ok(())
}

/// Debt for a fresh lock amount. Rounds up, so claims can never exceed deposits.
fn debt_for(locked: u64, acc_per_yt: u128) -> Result<u128> {
    Ok((locked as u128)
        .checked_mul(acc_per_yt)
        .ok_or(StriprError::MathOverflow)?
        .div_ceil(ACC_PRECISION))
}

impl YieldPosition {
    /// Moves cash dividends and stock yield earned since the last update into the unclaimed balances.
    pub fn settle(&mut self, acc_dividend_per_yt: u128, acc_stock_per_yt: u128) -> Result<()> {
        accrue(
            self.yt_locked,
            acc_dividend_per_yt,
            &mut self.dividend_debt,
            &mut self.unclaimed,
        )?;
        accrue(
            self.yt_locked,
            acc_stock_per_yt,
            &mut self.stock_debt,
            &mut self.unclaimed_stock,
        )
    }

    /// Call `settle` first.
    pub fn set_locked(
        &mut self,
        yt_locked: u64,
        acc_dividend_per_yt: u128,
        acc_stock_per_yt: u128,
    ) -> Result<()> {
        self.yt_locked = yt_locked;
        self.dividend_debt = debt_for(yt_locked, acc_dividend_per_yt)?;
        self.stock_debt = debt_for(yt_locked, acc_stock_per_yt)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn new_market() -> Market {
        Market {
            admin: Pubkey::default(),
            underlying_mint: Pubkey::default(),
            dividend_mint: Pubkey::default(),
            pt_mint: Pubkey::default(),
            yt_mint: Pubkey::default(),
            total_stripped: 0,
            total_yt_locked: 0,
            acc_dividend_per_yt: 0,
            total_dividends: 0,
            multiplier: MULTIPLIER_ONE,
            acc_stock_per_yt: 0,
            pending_stock_yield: 0,
            total_stock_yield: 0,
            bump: 0,
        }
    }

    fn new_position() -> YieldPosition {
        YieldPosition {
            owner: Pubkey::default(),
            market: Pubkey::default(),
            yt_locked: 0,
            dividend_debt: 0,
            unclaimed: 0,
            total_claimed: 0,
            stock_debt: 0,
            unclaimed_stock: 0,
            total_stock_claimed: 0,
            bump: 0,
        }
    }

    /// Mirrors the lock/unlock handlers: sync, settle, then change the lock.
    fn change_lock(market: &mut Market, position: &mut YieldPosition, new_locked: u64) {
        market.sync_multiplier(market.multiplier).unwrap();
        position
            .settle(market.acc_dividend_per_yt, market.acc_stock_per_yt)
            .unwrap();
        market.total_yt_locked = market.total_yt_locked - position.yt_locked + new_locked;
        position
            .set_locked(
                new_locked,
                market.acc_dividend_per_yt,
                market.acc_stock_per_yt,
            )
            .unwrap();
    }

    fn claimable(market: &Market, position: &mut YieldPosition) -> u64 {
        position
            .settle(market.acc_dividend_per_yt, market.acc_stock_per_yt)
            .unwrap();
        position.unclaimed
    }

    fn claimable_stock(market: &Market, position: &mut YieldPosition) -> u64 {
        position
            .settle(market.acc_dividend_per_yt, market.acc_stock_per_yt)
            .unwrap();
        position.unclaimed_stock
    }

    #[test]
    fn dividends_split_pro_rata() {
        let mut market = new_market();
        let (mut alice, mut bob) = (new_position(), new_position());
        change_lock(&mut market, &mut alice, 10_000_000);
        change_lock(&mut market, &mut bob, 30_000_000);
        market.record_dividend(20_000_000).unwrap();

        change_lock(&mut market, &mut alice, 0);
        market.record_dividend(30_000_000).unwrap();

        assert_eq!(claimable(&market, &mut alice), 5_000_000);
        assert_eq!(claimable(&market, &mut bob), 45_000_000);
    }

    #[test]
    fn rounding_never_pays_out_more_than_deposited() {
        let mut market = new_market();
        let mut positions = [new_position(), new_position(), new_position()];
        for (position, locked) in positions.iter_mut().zip([7, 13, 1_000_003]) {
            change_lock(&mut market, position, locked);
        }

        let mut deposited = 0;
        for round in 0..200u64 {
            let amount = 1 + round * 37 % 101;
            market.record_dividend(amount).unwrap();
            deposited += amount;

            let position = &mut positions[(round % 3) as usize];
            let new_locked = if round % 2 == 0 {
                position.yt_locked + 1 + round % 5
            } else {
                position.yt_locked - 1
            };
            change_lock(&mut market, position, new_locked);
        }

        let claimed: u64 = positions
            .iter_mut()
            .map(|position| claimable(&market, position))
            .sum();
        assert!(claimed <= deposited);
        assert!(
            deposited - claimed < 1_000,
            "too much dust: {deposited} vs {claimed}"
        );
    }

    #[test]
    fn dividend_requires_locked_yt() {
        let mut market = new_market();
        assert!(market.record_dividend(1).is_err());
    }

    #[test]
    fn multiplier_growth_pays_locked_yt_in_the_underlying() {
        let mut market = new_market();
        market.total_stripped = 1_000_000_000;
        let (mut alice, mut bob) = (new_position(), new_position());
        change_lock(&mut market, &mut alice, 250_000_000);
        change_lock(&mut market, &mut bob, 750_000_000);

        // The issuer reinvests a 1% dividend: the same principal now needs 1% fewer raw tokens.
        market.sync_multiplier(MULTIPLIER_ONE * 101 / 100).unwrap();
        assert_eq!(market.total_stock_yield, 9_900_990);

        let alice_raw = claimable_stock(&market, &mut alice);
        let bob_raw = claimable_stock(&market, &mut bob);
        assert!(alice_raw + bob_raw <= market.total_stock_yield);
        assert!(market.total_stock_yield - (alice_raw + bob_raw) <= 2);
        assert!((bob_raw as i64 - 3 * alice_raw as i64).abs() <= 3);
    }

    #[test]
    fn stock_yield_waits_for_the_next_locker() {
        let mut market = new_market();
        market.total_stripped = 1_000_000_000;
        market.sync_multiplier(MULTIPLIER_ONE * 101 / 100).unwrap();
        assert_eq!(market.pending_stock_yield, 9_900_990);
        assert_eq!(market.acc_stock_per_yt, 0);

        let mut carol = new_position();
        change_lock(&mut market, &mut carol, 500_000_000);
        market.sync_multiplier(market.multiplier).unwrap();

        assert_eq!(market.pending_stock_yield, 0);
        let raw = claimable_stock(&market, &mut carol);
        assert!(raw <= 9_900_990 && 9_900_990 - raw <= 1);
    }

    #[test]
    fn multiplier_never_moves_down() {
        let mut market = new_market();
        market.total_stripped = 1_000_000_000;
        market.sync_multiplier(MULTIPLIER_ONE * 101 / 100).unwrap();
        let (multiplier, pending) = (market.multiplier, market.pending_stock_yield);

        market.sync_multiplier(MULTIPLIER_ONE * 99 / 100).unwrap();
        assert_eq!(market.multiplier, multiplier);
        assert_eq!(market.pending_stock_yield, pending);
    }

    #[test]
    fn redemption_and_stock_yield_never_exceed_the_deposit() {
        let mut market = new_market();
        market.multiplier = 1_002_664_207_589;
        let deposit: u64 = 1_234_567_891;
        let shares = market.shares_for_raw(deposit).unwrap();
        market.total_stripped = shares;

        let mut dave = new_position();
        change_lock(&mut market, &mut dave, shares);
        market.sync_multiplier(1_003_269_012_539).unwrap();

        let stock_yield = claimable_stock(&market, &mut dave);
        let redeemed = market.raw_for_shares(shares).unwrap();
        assert!(stock_yield > 0);
        assert!(redeemed + stock_yield <= deposit);
    }
}
