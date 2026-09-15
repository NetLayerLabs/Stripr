# Stripr: Stocklana submission

**Track:** Main track, Credit and yield (dividends, structured products)

**Links**
- GitHub: https://github.com/NetLayerLabs/Stripr
- Live demo: _add the hosted app URL_
- Video: _add the demo video URL_

## One-liner

Stripr splits a tokenized stock into its principal (PT) and its dividends (YT), so holders can sell future dividends for USDC today and income investors can buy only the dividend stream.

## The problem

Tokenized stocks like xStocks already trade on Solana. But a share's two parts are still bundled, just like in a brokerage account:

- A long-term holder who doesn't need income can't turn years of small dividends into cash today without selling the share.
- An income investor can't buy a stock's dividends without paying for the whole share and taking its price risk.

## Who uses it

**Maya, a long-term AAPLx holder.** She strips 100 AAPLx into 100 PT-AAPL and 100 YT-AAPL. She keeps PT, which is her claim on the shares, and lists the YT for USDC. When it sells she has cash today, and she still owns the shares' price exposure.

**Dan, an income investor.** He buys Maya's YT-AAPL for a fraction of the share price and locks it in the same transaction. Every dividend AAPLx pays from then on flows to him.

## How it works

1. **Strip.** Deposit a stock and receive equal PT and YT.
2. **Keep, sell or earn.**
   - **Lock YT** to earn.
   - **List PT or YT** in the on-chain offer book at a fixed USDC price.
   - **Buyers** fill all or part of a listing, and can lock YT in the same transaction.
3. **Dividends land.** xStocks pay dividends by raising the token's Token-2022 Scaled UI Amount multiplier. Stripr turns that growth into extra stock for locked YT holders, and any cash dividend is split the same way.
4. **Claim or redeem.** Claim earned stock and USDC any time. Return equal PT and YT to withdraw the stock.

## Why Solana

- **Real dividend mechanics.** xStocks live on Solana and pass dividends on through the Token-2022 Scaled UI Amount multiplier. Stripr reads that multiplier on-chain, so reinvested dividends reach YT holders without an oracle or an admin.
- **Every holder can be paid.** Splitting a payout across thousands of YT holders costs the same as for one, because Stripr uses O(1) accumulator indexes. Claims and trades each cost a fraction of a cent.
- **Composable tokens.** PT and YT are standard SPL tokens that wallets, AMMs and lending protocols can use directly.

## What's built

- **Anchor program** with 12 instructions: strip, redeem, lock and unlock YT, cash dividends, reinvested-dividend sync and claims, and a fixed-price offer book (create, fill, cancel).
  - **Tokens:** works with classic SPL and Token-2022 mints, including the xStocks extensions (ScaledUiAmount, Pausable, PermanentDelegate, TransferHook).
  - **Accounting:** rounding always favors the vault, so it stays solvent.
  - **Trading:** fills check the price the buyer saw, and sold-out offers close and refund their rent.
- **Tests:**
  - 8 accounting unit tests.
  - 19 end-to-end tests, including a market on the real mainnet AAPLx mint and an xStock-style Token-2022 mint.
- **Live on Devnet:**
  - Five demo markets (AAPL, MSFT, JNJ, KO, PG) with several dividend rounds of history.
  - Listings and sales in the offer book.
  - A faucet for test stock.
- **Web app:**
  - Markets dashboard.
  - Market pages with strip, redeem, earn and trade.
  - On-chain analytics: supply, reinvested and cash dividends, and activity.
  - A transaction modal with explorer links.
  - A Devnet/Mainnet switch.
  - A live mainnet AAPLx data panel on the landing page.

## What's next

- **Mainnet:** deploy with real xStocks markets (AAPLx, SPYx, NVDAx, TSLAx, MSFTx).
- **Multiplier keeper:** a permissionless bot that syncs multipliers when issuers update them.
- **Pricing and audit:** maturity-dated PT and YT, a PT/YT AMM with an implied dividend yield, and a security audit.

## Honest limitations

- Unaudited hackathon build.
- xStocks issuers can pause or move tokens, including Stripr's vaults.
- Dividend capture: someone can lock YT just before a known multiplier update.
- Prices come from fixed listings rather than an AMM.

## Open-source components

Original work built on Anchor, Agave, SPL Token and Token-2022 (`@solana/spl-token`, `@solana/web3.js`), Solana Wallet Adapter, Next.js, React, TanStack Query, Tailwind CSS, Lucide, Mocha, Chai and tsx.
