# Stripr: Stocklana submission

**Track:** Main track, Credit and yield (dividends, structured products)

**Links**
- GitHub: https://github.com/NetLayerLabs/Stripr
- Live demo: _add the hosted app URL_
- Video: _add the demo video URL_

**For judges:** the README's [For judges](https://github.com/NetLayerLabs/Stripr#for-judges) section has a three-minute click path, explorer links to a real reinvested dividend and a real YT sale, and a table of what is real versus demo.

## One-liner

Stripr is an on-chain primitive that turns the way xStocks actually pay dividends — a rising Token-2022 Scaled UI Amount multiplier — into a separately owned, tradeable yield token. Strip a stock into PT (the share) and YT (its dividends); locked YT captures every multiplier increase automatically, and an on-chain offer book prices YT in USDC.

## The problem

xStocks pay dividends by raising a multiplier on the token, so the value arrives silently, blended into every holder's balance. Nothing on Solana lets that dividend be owned, priced or traded on its own:

- A holder who wants the share but not the income has no way to sell the income.
- An investor who wants dividend exposure has to buy the whole share and take its price risk.
- Nobody can see what a stock's dividend stream is worth, because there is no market for it.

## Who uses it

**A holder of a dividend-paying xStock** (KOx, PGx, JNJx pay real quarterly dividends; AAPLx barely does) strips it, keeps PT for the price exposure, and lists YT for USDC. **A yield buyer** takes the YT at a fraction of the share price and locks it; every multiplier increase the issuer publishes from then on is paid to them in stock, with no oracle or admin in the loop. **Builders** get PT and YT as plain SPL tokens to compose into structured products, lending collateral or a future AMM.

We say this plainly: with no maturity date and a fixed-price book, PT and YT don't yet have a principled price, and on low-yield stocks the dividend is small. Maturity-dated series and an AMM are the stated next step; the primitive underneath — multiplier in, tradeable yield out — is what this submission is.

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
  - A faucet for test stock and demo USDC.
- **Web app:**
  - Markets dashboard.
  - Market pages with strip, redeem, earn and trade.
  - On-chain analytics: supply, reinvested and cash dividends, and activity.
  - A yield on every YT listing, from the dividend rate each stock's multiplier has actually delivered since launch (measured on mainnet, not assumed), plus the payback period and a ranked markets table.
  - Live reference prices, so every PT and YT listing is shown as a share of the stock's price and PT + YT is compared against one share. Sourced from Jupiter's price API for the matching xStock, with Pyth equity feeds as the preferred source when a key with entitlement is configured.
  - A transaction modal with explorer links.
  - A Devnet/Mainnet switch.
  - A live mainnet AAPLx data panel on the landing page.

## What's next

- **Mainnet:** deploy with real xStocks markets (AAPLx, SPYx, NVDAx, TSLAx, MSFTx).
- **Multiplier keeper:** a permissionless bot that syncs multipliers when issuers update them.
- **Pricing and audit:** maturity-dated PT and YT, a PT/YT AMM with an implied dividend yield, and a security audit.

## Honest limitations

- Unaudited hackathon build.
- Yields are computed from realized multiplier growth since each token launched; a stock can cut its dividend, and PT/YT have no maturity date yet, so neither has a term-structure price.
- xStocks issuers can pause or move tokens, including Stripr's vaults.
- Dividend capture: someone can lock YT just before a known multiplier update.
- Prices come from fixed listings rather than an AMM.

## Open-source components

Original work built on Anchor, Agave, SPL Token and Token-2022 (`@solana/spl-token`, `@solana/web3.js`), Solana Wallet Adapter, Jupiter's price API, Next.js, React, TanStack Query, Tailwind CSS, Lucide, Mocha, Chai and tsx.
