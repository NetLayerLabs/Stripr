# Stripr

**Yield stripping for tokenized stocks on Solana.** xStocks pay dividends by raising a Token-2022 multiplier on the token; Stripr turns that into a yield you can own and trade. It splits a tokenized share into two tokens:

- **PT (Principal Token):** the claim on the share itself.
- **YT (Yield Token):** the right to the share's dividends.

Holders can keep, sell or hedge each part separately, and a PT + YT pair always redeems for the original stock. A built-in on-chain offer book lets anyone sell future dividends for USDC today, or buy them.

**Live app: [stripr.xyz](https://stripr.xyz)** - deployed on Solana **mainnet** with fifteen real xStocks markets, and on devnet with a faucet so anyone can try the full flow without owning tokenized stock.

Built by NetLayer Labs for the [Stocklana Hackathon](https://hackathons.solana.com/hackathons/stocklana) (Credit & Yield track).

## For judges

Stripr runs on mainnet against the real xStocks, and on devnet with test tokens. Devnet is the faster route: it needs no KYC-gated stock and the faucet funds you in one click.

**Try it in three minutes** (Solana Devnet, no setup, at [stripr.xyz/app](https://stripr.xyz/app)):

1. Open the app. It opens on Mainnet, so switch to **Devnet** in the header, then pick the **PG** market - it pays both kinds of dividend.
2. Connect any wallet on Devnet and press **Get test PG + USDC**. You receive 100 PG, 1,000 demo USDC, and a little SOL for fees.
3. **Strip** 10 PG with "Lock YT to earn" on. One transaction mints 10 PT-PG and 10 YT-PG and locks the YT.
4. In **Trade PT and YT**, press **Sell**, list 5 YT-PG at any price, and watch it appear in the book as a % of the live PG share price.
5. Press **Buy** on someone else's listing with "Lock to start earning" on - one transaction buys and locks.
6. **Recent activity** shows every step with explorer links, and the charts are rebuilt from those on-chain events.

**Verify it on-chain**

| What | Where |
|---|---|
| Program (Mainnet) | [`9wpHm…nzZF`](https://explorer.solana.com/address/9wpHmYvuq7qrAuH4VV3LyC54d2VyTYFMfveMMph2nzZF) |
| Program (Devnet) | [`9wpHm…nzZF`](https://explorer.solana.com/address/9wpHmYvuq7qrAuH4VV3LyC54d2VyTYFMfveMMph2nzZF?cluster=devnet) |
| A real AAPLx stripped on mainnet | [`2iZTHs…iNTjC`](https://explorer.solana.com/address/2iZTHsJWMP78s5QARZrNNzFVLiSHMGAjyj8SzM6iNTjC) |
| A live YT offer escrowed on mainnet | [`2jK3uX…EfK8z`](https://explorer.solana.com/address/2jK3uXdDSFvvUtcWkhJvUtT6voiyj3ouEVcXvxgEfK8z) |
| A reinvested dividend reaching locked YT | [`5noUGW…Touve`](https://explorer.solana.com/tx/5noUGWJLGg6vEw8ynKaGcF68cW8kx8AnNitAR3sXYLUqTWpmhx7rXXjcJFyvxbtgnmFNa91RxsCf1WzJHjTTouve?cluster=devnet) |
| A YT sale filled from the order book | [`3E4yeZ…nYhiy`](https://explorer.solana.com/tx/3E4yeZqguWHTPgV8Ctq2bwtBozUcFcofRJetCrZZhzj6Dg7siQDTaSadvKumdcXJpTHyMJwnLysuB94psPXnYhiy?cluster=devnet) |
| Live mainnet dividend ledger | The "What each xStock last paid" table on the landing page, read from each mint's Scaled UI Amount config |

**What is real, and what is a demo**

On **mainnet** everything below is real: the markets hold Backed's own xStocks and quote in circulating USDC. The table describes the **devnet** demo, which exists so the flow can be tried without KYC-gated stock.

| | Real | Demo |
|---|---|---|
| Dividend mechanism | Read from the Token-2022 Scaled UI Amount multiplier, the way xStocks actually pay | - |
| Mainnet | Fifteen markets against the real xStocks, quoting circulating USDC, with every multiplier, dividend and price read live | - |
| Stocks in the markets | - | Team-minted Token-2022 tokens named after the companies, so anyone can strip without owning xStocks |
| USDC | - | A demo mint, so the faucet can hand out spending money |
| Cash dividends (KO, PG markets) | The program instruction is real | Real xStocks only reinvest; a cash payer must deposit the USDC |
| Trades and positions | Every transaction is on-chain and verifiable | Seeded by our own demo wallets |

**Tests:** `cargo test -p stripr` (8 accounting unit tests) and `npm run test:program` (19 end-to-end tests on a local validator, including a market on the real mainnet AAPLx mint).

## Who it's for

Stocks are coming on-chain as SPL tokens (for example xStocks), but a share's income still can't be separated from its principal. Stripr gives dividends their own token, much as Pendle does for DeFi yield, and a place to trade it.

- **Long-term holders.** They believe in the company but would rather have cash now than small payouts over years. With Stripr they strip their AAPLx, keep PT-AAPL for the share, and sell YT-AAPL for USDC in one transaction.
- **Income investors.** They want dividends without paying for the whole share or riding its price swings. With Stripr they buy YT-AAPL from holders for a fraction of the share price, lock it in the same transaction, and collect every dividend.

## How it works

1. **Strip.** Deposit a stock into the market vault and receive equal amounts of PT and YT.
2. **Lock YT.** Only locked YT earns. The app can lock it in the same transaction as the strip.
3. **Earn from two sources:**
   - **Reinvested dividends.** xStocks pay dividends by raising the token's Token-2022 *Scaled UI Amount* multiplier, so the vault needs fewer raw tokens to back the same shares. Stripr releases that surplus to locked YT, paid in the stock itself.
   - **Cash dividends.** A market admin can deposit a cash payout (e.g. USDC), which is split pro-rata across locked YT.
4. **Trade.** List PT or YT at a fixed USDC price. Buyers fill all or part of a listing on-chain, and YT buyers can lock in the same transaction.
5. **Claim** earned stock and cash at any time, including after unlocking or selling your YT.
6. **Redeem** equal PT + YT for the stock at the current multiplier.

### Accounting guarantees

- **O(1) payouts.** Payouts use accumulator indexes (1e12 precision), so each costs the same no matter how many holders there are.
- **Solvent by rounding.** Accrual rounds down and debt rounds up, so claims never exceed what the vault holds.
- **Share units.** PT and YT are minted in share units (`raw × multiplier`). Redemption and reinvested yield together never exceed the deposit.
- **Monotonic multiplier.** The multiplier never moves down. When nothing is locked, released yield waits as *pending* for the next locker.
- **Permissionless sync.** Anyone can call `sync_multiplier`, and every state-changing instruction syncs first.

## Live on Mainnet

| | Address |
|---|---|
| Program | [`9wpHmYvuq7qrAuH4VV3LyC54d2VyTYFMfveMMph2nzZF`](https://explorer.solana.com/address/9wpHmYvuq7qrAuH4VV3LyC54d2VyTYFMfveMMph2nzZF) |
| Upgrade authority | `3EGKfA8W2ocah3Gusox5JRfoN5WVAgXw9hubgyBGXvSy` |
| Quote token | Circulating USDC `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |

Fifteen markets, one per xStock, each holding the issuer's own Token-2022 mint:

[AAPLx](https://explorer.solana.com/address/2iZTHsJWMP78s5QARZrNNzFVLiSHMGAjyj8SzM6iNTjC) · [AMZNx](https://explorer.solana.com/address/99qu6rB3MxLZKpYKv1H3XsGL93s9YodPgecroXpFt4em) · [COINx](https://explorer.solana.com/address/7cq1bVESWKkcsqUKnqxygE7ZEAYS8oyMFpx8FKHCCEZS) · [GOOGLx](https://explorer.solana.com/address/GcvUEbszaNmH5656nS8ZaCD4anPK2YoZCYZrrZKTaqQV) · [JNJx](https://explorer.solana.com/address/CxUKQ1zGSVaJiwLGtb2V29E4GaDMF5yZ86E5B33oA56a) · [KOx](https://explorer.solana.com/address/9jBcvD9aze6EaFZRsaYTd3UFzoTHgtRsh4EuyFAaobeB) · [MCDx](https://explorer.solana.com/address/36a69s32YS3EPmSWWzPg9ZvidUimELUFGr3DXN7qgkPB) · [METAx](https://explorer.solana.com/address/CeFhFzH2sTuyL9YATdpHKMdoQz16rzaS3GeRzjH9AQwz) · [MSFTx](https://explorer.solana.com/address/9fqqyq1C84x2xgaLQf166WAgjPfhx2ZHgnwgSgiLXKw7) · [MSTRx](https://explorer.solana.com/address/2R3831uxCs9wUE98S7nEwA7Ly7MXzzM8VRD5b337pLZj) · [NVDAx](https://explorer.solana.com/address/Bv1hnygxeURXW4KGFJrBY1PuAqzpmkTmWWnDDGqQovnt) · [PGx](https://explorer.solana.com/address/7LnhwQ2RKHxAVWpZT7wR3815iFTEcaWs53V41NX4nX37) · [QQQx](https://explorer.solana.com/address/7kyGZitMYDeDF8ty36GofLTpB9C2eC89AgYFLCzUCB5c) · [SPYx](https://explorer.solana.com/address/7hUi98wVdrakk7AKHSxYCXmRZR1HQSejbiNHYZu5k27w) · [TSLAx](https://explorer.solana.com/address/G1LUzJuUknoE4AZsFCYs1YSjP8vuLvgkSbb4rZKGJUjW)

Dividend rates are read from each mint's Scaled UI Amount config and annualised since the token launched: KOx 1.75%/yr, PGx 1.68%, MCDx 1.65%, JNJx 1.52%, MSFTx 0.46%, AAPLx 0.25%. Those figures are computed live by `/api/dividends`, not stored.

## Live on Devnet

| | Address |
|---|---|
| Program | [`9wpHmYvuq7qrAuH4VV3LyC54d2VyTYFMfveMMph2nzZF`](https://explorer.solana.com/address/9wpHmYvuq7qrAuH4VV3LyC54d2VyTYFMfveMMph2nzZF?cluster=devnet) |
| AAPL market (reinvested dividends) | [`5skjAoJPtmEtSKSKX2LsWUeoRRLFUiTEtrjbjHQ8DEPT`](https://explorer.solana.com/address/5skjAoJPtmEtSKSKX2LsWUeoRRLFUiTEtrjbjHQ8DEPT?cluster=devnet) |
| MSFT market (reinvested dividends) | [`DTpinbLoRCjBLhMsT8hBybLLvL7DUiy8vEZDwdCziR8h`](https://explorer.solana.com/address/DTpinbLoRCjBLhMsT8hBybLLvL7DUiy8vEZDwdCziR8h?cluster=devnet) |
| JNJ market (reinvested dividends) | [`GZWRhhSeNtzmrmcTvAkK122828gLsPzcPcpifkXNwDbR`](https://explorer.solana.com/address/GZWRhhSeNtzmrmcTvAkK122828gLsPzcPcpifkXNwDbR?cluster=devnet) |
| KO market (cash dividends) | [`3vjNhamX7jEbkttwD3igm21ScDC6PVrF7JLEakcdxgSe`](https://explorer.solana.com/address/3vjNhamX7jEbkttwD3igm21ScDC6PVrF7JLEakcdxgSe?cluster=devnet) |
| PG market (both) | [`67YC3kn27N1K84N4KE1HeR33ccqqEywn7NKVWYPDwygX`](https://explorer.solana.com/address/67YC3kn27N1K84N4KE1HeR33ccqqEywn7NKVWYPDwygX?cluster=devnet) |

The demo stocks are Token-2022 mints with the Scaled UI Amount extension, seeded with several dividend rounds so the charts have real on-chain history. The app's faucet sends test stock, demo USDC and devnet SOL.

## Program

A single Anchor program (`programs/stripr`) with twelve instructions:

| Instruction | Who | What it does |
|---|---|---|
| `initialize_market` | Admin | Creates the stock vault, PT/YT mints and dividend vault for a stock |
| `strip` | Anyone | Deposits stock, mints equal PT and YT in share units |
| `redeem` | Anyone | Burns equal PT and YT, returns the stock |
| `lock_yt` | YT holder | Locks YT so it earns, settling yield first |
| `unlock_yt` | YT holder | Returns YT to the wallet; earned yield stays claimable |
| `distribute_dividend` | Admin | Deposits a cash dividend for locked YT |
| `claim_yield` | YT holder | Pays unclaimed cash dividends |
| `sync_multiplier` | Anyone | Releases reinvested dividends after the stock's multiplier rises |
| `claim_stock_yield` | YT holder | Pays unclaimed reinvested stock |
| `create_offer` | PT/YT holder | Escrows PT or YT for sale at a fixed price in the market's quote token (USDC) |
| `fill_offer` | Anyone | Buys all or part of an offer, paying the seller directly |
| `cancel_offer` | Seller | Returns unsold tokens and closes the offer |

Fills must pass the price the buyer saw, so a relisted offer at a new price can't overcharge anyone. Costs round up in the seller's favor, and a sold-out offer closes and refunds its rent.

Works with classic SPL tokens and Token-2022 mints, including the extensions xStocks use: ScaledUiAmount, Pausable, PermanentDelegate and TransferHook.

## App

A Next.js 14 app (`app/`):

- **Landing page:** explains the protocol, with a dividend calculator and a live mainnet AAPLx snapshot.
- **Markets dashboard:** KPIs and a sortable table.
- **Market pages:**
  - Strip, redeem and earn forms.
  - Your position.
  - Analytics rebuilt from on-chain events: supply, reinvested and cash dividends, and recent activity.
- **Trade section:** on each market page, an order book for PT and YT with best prices, lifetime dividends per YT, one-transaction "list" (unlocking first if needed) and "buy & lock", and cancelling your own listings.
- **Yield on every YT listing:** each stock's Scaled UI Amount multiplier is read on mainnet and annualized since the token launched - PGx has delivered 1.68%/yr, KOx 1.76%, AAPLx 0.26% - so a YT price becomes a yield and a payback period ("8.78 USDC ≈ 28% a year, pays for itself in 3.6 years"). The markets table ranks by it.
- **Reference prices:** each listing is shown as a percentage of the stock's live price, along with what PT and YT together cost against one share. Prices come from Jupiter's public price API for the matching xStock (no key needed), or from Pyth's equity feeds when `PYTH_API_KEY` has entitlement for them.
- **Transaction modal:** every action walks through each step and ends with an explorer link.
- **Network switch:** toggles Devnet and Mainnet. A server-side RPC proxy is used because public mainnet RPC blocks browser requests.

## Repository layout

```
programs/stripr/   Anchor program (state, instructions, multiplier sync, unit tests)
tests/             End-to-end tests (classic mints, real AAPLx fixture, xStock-like Token-2022 mint)
scripts/           Devnet demo setup, market seeding and a live reinvested-dividend trigger
app/               Next.js frontend and API routes (market history, RPC proxy, faucet, prices)
docs/              Mainnet xStocks research, deployment runbook and submission notes
```

## Getting started

### Prerequisites

- Rust 1.98+
- Solana / Agave CLI 4.1.2 (Agave client)
- Anchor 1.2.0 (via `avm`)
- Node.js 20+

### Program

```bash
npm install
npm run build:program      # anchor build (SBPF v2)
npm run test:program       # 19 end-to-end tests on a local validator
cargo test -p stripr       # 8 accounting unit tests
npm run idl:sync           # copy the IDL and types into the app
```

### App

```bash
cd app
npm install
cp .env.example .env.local
npm run dev                # http://localhost:3000
```

See [`app/.env.example`](app/.env.example) for network, RPC and faucet settings. Setting `FAUCET_SECRET_KEY` to the seeding wallet's key enables the devnet faucet.

### Devnet demo

```bash
npm run deploy:devnet
ROUNDS=3 ROUND_DELAY_SECONDS=45 npm run seed:devnet    # five markets with dividend history
npm run seed:offers:devnet                             # PT/YT listings and a sale in every market
npm run snapshot:devnet                                # commit decoded history so charts paint instantly when hosted
SYMBOL=AAPL RATE=0.005 npm run reinvest:devnet         # pay a reinvested dividend live
```

## Built with

Stripr's program and app are original work for this hackathon, built on these open-source projects:

- [Anchor](https://github.com/solana-foundation/anchor) and [Agave](https://github.com/anza-xyz/agave) for the on-chain program
- [SPL Token and Token-2022](https://github.com/solana-program) with `@solana/spl-token` and `@solana/web3.js`
- [Solana Wallet Adapter](https://github.com/anza-xyz/wallet-adapter)
- [Jupiter](https://jup.ag) price API and [Pyth Network](https://pyth.network) equity feeds for reference stock prices
- [Next.js](https://nextjs.org), [React](https://react.dev), [TanStack Query](https://tanstack.com/query), [Tailwind CSS](https://tailwindcss.com) and [Lucide](https://lucide.dev) icons
- [Mocha](https://mochajs.org), [Chai](https://www.chaijs.com) and [tsx](https://tsx.is) for tests

## Known limitations

- **Not audited.** This is a hackathon build. Don't use it with meaningful real assets.
- **Issuer controls.** xStocks issuers can pause transfers and move tokens from any account through a permanent delegate, including Stripr's vaults.
- **Dividend timing.** Yield goes to whoever holds locked YT when a multiplier update is synced, so someone can lock just before a known update.
- **Fixed-price offers, not an AMM.** Prices come from sellers' listings, so thin markets can have wide spreads. PT and YT don't expire yet. Maturity-dated series and a PT/YT AMM are on the roadmap.
