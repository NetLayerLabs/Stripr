use anchor_lang::prelude::*;

#[event]
pub struct Stripped {
    pub market: Pubkey,
    pub user: Pubkey,
    /// Raw underlying deposited.
    pub amount: u64,
    /// PT and YT minted, in share units.
    pub shares: u64,
}

#[event]
pub struct Redeemed {
    pub market: Pubkey,
    pub user: Pubkey,
    /// Raw underlying returned.
    pub amount: u64,
    /// PT and YT burned, in share units.
    pub shares: u64,
}

#[event]
pub struct YtLocked {
    pub market: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
}

#[event]
pub struct YtUnlocked {
    pub market: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
}

#[event]
pub struct DividendDistributed {
    pub market: Pubkey,
    pub amount: u64,
    pub acc_dividend_per_yt: u128,
}

#[event]
pub struct YieldClaimed {
    pub market: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
}

#[event]
pub struct MultiplierSynced {
    pub market: Pubkey,
    pub multiplier: u128,
    /// Raw underlying released from backing principal by this sync.
    pub freed: u64,
    /// Raw underlying moved into the locked-YT index by this sync.
    pub allocated: u64,
    pub acc_stock_per_yt: u128,
    pub pending_stock_yield: u64,
}

#[event]
pub struct StockYieldClaimed {
    pub market: Pubkey,
    pub user: Pubkey,
    /// Raw underlying paid out.
    pub amount: u64,
}
