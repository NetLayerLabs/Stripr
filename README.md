# Stripr

<img width="2988" height="1692" alt="Stripr: split a tokenized stock into its principal and its yield" src="https://github.com/user-attachments/assets/12ff8c33-088d-4bf1-b151-a246c4120e6a" />

**Yield stripping for tokenized stocks on Solana.** xStocks pay dividends by raising a Token-2022 multiplier on the token, so a share's income arrives silently, blended into every holder's balance. Stripr turns that income into an asset of its own. It splits a tokenized share into two tokens:

- **PT (Principal Token):** the claim on the share itself.
- **YT (Yield Token):** every dividend the share pays.

Each part can be kept, sold or bought separately, and a PT + YT pair always redeems for the original stock. An on-chain offer book lets anyone sell future dividends for USDC today, or buy them.

**[Live app](https://stripr.xyz)** · **[Demo video](https://youtu.be/ZmsOdKGkx64)** · **[Technical video](https://youtu.be/JoxztgzW_N4)** · **[Program on mainnet](https://explorer.solana.com/address/9wpHmYvuq7qrAuH4VV3LyC54d2VyTYFMfveMMph2nzZF)** · **[Submission notes](docs/submission.md)**

Built by NetLayer Labs for the [Stocklana Hackathon](https://hackathons.solana.com/hackathons/stocklana), main track, Credit & Yield.

| | |
|---|---|
| **Live on Solana mainnet** | Fifteen markets against Backed's own xStocks, quoted in circulating USDC |
| **Dividends without an oracle** | Read straight from each mint's Scaled UI Amount multiplier; anyone can sync it |
| **Priced, not guessed** | Every YT listing carries a yield measured from the stock's realized dividend rate |
| **Real market data** | Pyth prices the underlying stock where the key is entitled; Jupiter prices every xStock |
| **Tested** | 19 end-to-end tests on a local validator, including the real AAPLx mint, and 8 accounting unit tests |

## Contents

- [For judges](#for-judges)
- [Who it's for](#who-its-for)
- [How it works](#how-it-works)
- [Deployments](#deployments)
- [Program](#program)
- [App](#app)
- [Market data](#market-data)
- [Demo video](#demo-video)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Built with](#built-with)
- [Known limitations](#known-limitations)
- [License](#license)

## For judges

Stripr runs on mainnet against the real xStocks, and on devnet with test tokens. Devnet is the fastest way to try the whole flow: it needs no KYC-gated stock, and the faucet funds you in one click.

**Try it in three minutes** (Solana Devnet, no setup, at [stripr.xyz/app](https://stripr.xyz/app)):

1. Open the app. It opens on Mainnet, so switch to **Devnet** in the header, then pick the **PG** market. It pays both kinds of dividend.
2. Connect any wallet on Devnet and press **Get test PG + USDC**. You receive 100 PG, 1,000 demo USDC and a little SOL for fees.
3. **Strip** 10 PG with "Lock YT to earn" on. One transaction mints 10 PT-PG and 10 YT-PG and locks the YT.
4. In **Trade PT and YT**, press **Sell** and list 5 YT-PG at any price. It appears in the book as a share of the live PG price, with the yield it implies.
5. Press **Buy** on someone else's listing with "Lock to start earning" on. One transaction buys and locks.
6. **Recent activity** shows every step with explorer links, and the charts are rebuilt from those on-chain events.

**Then look at mainnet** (switch back in the header):

- **TSLAx** or **QQQx**: the stock's price from Pyth, beside the xStock's own on-chain price and the gap between them.
- **AAPLx**: a real stripped position and a YT listing held in the program's escrow.
- The landing page's **"What each xStock last paid"** table: every xStock's latest dividend, read from its mint.

**Verify it on-chain**

| What | Where |
|---|---|
| Program (Mainnet) | [`9wpHm…nzZF`](https://explorer.solana.com/address/9wpHmYvuq7qrAuH4VV3LyC54d2VyTYFMfveMMph2nzZF), byte-identical to `target/deploy/stripr.so` built from this repo |
| Program (Devnet) | [`9wpHm…nzZF`](https://explorer.solana.com/address/9wpHmYvuq7qrAuH4VV3LyC54d2VyTYFMfveMMph2nzZF?cluster=devnet) |
| A real AAPLx market with a stripped position | [`2iZTHs…iNTjC`](https://explorer.solana.com/address/2iZTHsJWMP78s5QARZrNNzFVLiSHMGAjyj8SzM6iNTjC) |
| A YT offer escrowed on mainnet | [`2jK3uX…EfK8z`](https://explorer.solana.com/address/2jK3uXdDSFvvUtcWkhJvUtT6voiyj3ouEVcXvxgEfK8z) |
| A reinvested dividend reaching locked YT | [`5noUGW…Touve`](https://explorer.solana.com/tx/5noUGWJLGg6vEw8ynKaGcF68cW8kx8AnNitAR3sXYLUqTWpmhx7rXXjcJFyvxbtgnmFNa91RxsCf1WzJHjTTouve?cluster=devnet) (devnet) |
| A YT sale filled from the order book | [`3E4yeZ…nYhiy`](https://explorer.solana.com/tx/3E4yeZqguWHTPgV8Ctq2bwtBozUcFcofRJetCrZZhzj6Dg7siQDTaSadvKumdcXJpTHyMJwnLysuB94psPXnYhiy?cluster=devnet) (devnet) |

**What is real, and what is a demo**

On **mainnet** everything is real: the markets hold Backed's own xStocks and quote in circulating USDC. The demo column describes **devnet**, which exists so the flow can be tried without KYC-gated stock.

| | Real | Demo (devnet) |
|---|---|---|
| Dividend mechanism | Read from the Token-2022 Scaled UI Amount multiplier, the way xStocks actually pay | - |
| Mainnet markets | Fifteen, against the real xStocks, with every multiplier, dividend and price read live | - |
| Market data | Pyth for the underlying stock where entitled, Jupiter for every xStock | - |
| Stocks in the markets | - | Team-minted Token-2022 tokens named after the companies |
| USDC | - | A demo mint, so the faucet can hand out spending money |
| Cash dividends (KO, PG) | The program instruction is real | Real xStocks only reinvest; a cash payer must deposit the USDC |
| Trades and positions | Every transaction is on-chain and verifiable | Seeded by our own demo wallets |

## Who it's for

Stocks are coming on-chain as SPL tokens, but a share's income still can't be separated from its principal. Stripr gives dividends their own token, much as Pendle does for DeFi yield, and a place to trade it.

- **Long-term holders** believe in the company but would rather have cash now than small payouts over years. They strip their xStock, keep PT for the share, and sell YT for USDC.
- **Income investors** want dividends without paying for the whole share or riding its price. They buy YT for a fraction of the share price, lock it in the same transaction, and collect every dividend.
- **Builders** get PT and YT as plain SPL tokens, ready for structured products, lending collateral or an AMM.

## How it works

1. **Strip.** Deposit a stock into the market vault and receive equal amounts of PT and YT.
2. **Lock YT.** Only locked YT earns. The app locks it in the same transaction as the strip.
3. **Earn from two sources:**
   - **Reinvested dividends.** An xStock pays a dividend by raising its multiplier, so the vault needs fewer raw tokens to back the same shares. Stripr releases that surplus to locked YT, paid in the stock itself.
   - **Cash dividends.** A market admin can deposit a cash payout (for example USDC), split pro rata across locked YT.
4. **Trade.** List PT or YT at a fixed USDC price. Buyers fill all or part of a listing on-chain, and YT buyers can lock in the same transaction.
5. **Claim** earned stock and cash at any time, including after unlocking or selling the YT.
6. **Redeem** equal PT + YT for the stock at the current multiplier.

### Accounting guarantees

- **O(1) payouts.** Payouts use accumulator indexes (1e12 precision), so a dividend costs the same whether ten people hold YT or ten thousand.
- **Solvent by rounding.** Accrual rounds down and debt rounds up, so claims can never exceed what the vault holds.
- **Share units.** PT and YT are minted in share units (`raw × multiplier`). Redemption and reinvested yield together never exceed the deposit.
- **Monotonic multiplier.** The multiplier never moves down. When nothing is locked, released yield waits as *pending* for the next locker.
- **Permissionless sync.** Anyone can call `sync_multiplier`, and every state-changing instruction syncs first.

## Deployments

### Mainnet

| | Address |
|---|---|
| Program | [`9wpHmYvuq7qrAuH4VV3LyC54d2VyTYFMfveMMph2nzZF`](https://explorer.solana.com/address/9wpHmYvuq7qrAuH4VV3LyC54d2VyTYFMfveMMph2nzZF) |
| Upgrade authority | `3EGKfA8W2ocah3Gusox5JRfoN5WVAgXw9hubgyBGXvSy` |
| Quote token | Circulating USDC `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |

Fifteen markets, one per xStock, each holding the issuer's own Token-2022 mint:

[AAPLx](https://explorer.solana.com/address/2iZTHsJWMP78s5QARZrNNzFVLiSHMGAjyj8SzM6iNTjC) · [AMZNx](https://explorer.solana.com/address/99qu6rB3MxLZKpYKv1H3XsGL93s9YodPgecroXpFt4em) · [COINx](https://explorer.solana.com/address/7cq1bVESWKkcsqUKnqxygE7ZEAYS8oyMFpx8FKHCCEZS) · [GOOGLx](https://explorer.solana.com/address/GcvUEbszaNmH5656nS8ZaCD4anPK2YoZCYZrrZKTaqQV) · [JNJx](https://explorer.solana.com/address/CxUKQ1zGSVaJiwLGtb2V29E4GaDMF5yZ86E5B33oA56a) · [KOx](https://explorer.solana.com/address/9jBcvD9aze6EaFZRsaYTd3UFzoTHgtRsh4EuyFAaobeB) · [MCDx](https://explorer.solana.com/address/36a69s32YS3EPmSWWzPg9ZvidUimELUFGr3DXN7qgkPB) · [METAx](https://explorer.solana.com/address/CeFhFzH2sTuyL9YATdpHKMdoQz16rzaS3GeRzjH9AQwz) · [MSFTx](https://explorer.solana.com/address/9fqqyq1C84x2xgaLQf166WAgjPfhx2ZHgnwgSgiLXKw7) · [MSTRx](https://explorer.solana.com/address/2R3831uxCs9wUE98S7nEwA7Ly7MXzzM8VRD5b337pLZj) · [NVDAx](https://explorer.solana.com/address/Bv1hnygxeURXW4KGFJrBY1PuAqzpmkTmWWnDDGqQovnt) · [PGx](https://explorer.solana.com/address/7LnhwQ2RKHxAVWpZT7wR3815iFTEcaWs53V41NX4nX37) · [QQQx](https://explorer.solana.com/address/7kyGZitMYDeDF8ty36GofLTpB9C2eC89AgYFLCzUCB5c) · [SPYx](https://explorer.solana.com/address/7hUi98wVdrakk7AKHSxYCXmRZR1HQSejbiNHYZu5k27w) · [TSLAx](https://explorer.solana.com/address/G1LUzJuUknoE4AZsFCYs1YSjP8vuLvgkSbb4rZKGJUjW)

### Devnet

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

A single Anchor program ([`programs/stripr`](programs/stripr)) with twelve instructions:

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

A Next.js 14 app ([`app/`](app)), live at [stripr.xyz](https://stripr.xyz):

- **Landing page:** the protocol explained, a dividend calculator, and a live table of what every xStock last paid.
- **Markets dashboard:** fifteen markets with each issuer's own logo, key figures, a sortable table ranked by YT yield, eight per page.
- **Market pages:** strip, redeem and earn forms; your position; and analytics rebuilt from on-chain events (supply, reinvested and cash dividends, recent activity).
- **Order book:** PT and YT with best prices, lifetime dividends per YT, one-transaction "list" (unlocking first if needed) and "buy & lock", and cancelling your own listings.
- **Yield on every YT listing:** a YT price becomes a yield and a payback period. PGx has paid 1.67% a year through its multiplier, so a YT at 8.78 USDC is a 28% yield that pays for itself in 3.6 years.
- **Transaction modal:** every action walks through each step and ends with an explorer link.
- **Network switch:** Mainnet by default, Devnet one click away. A server-side RPC proxy keeps the provider key off the browser.

## Market data

Three sources, each used for what it is best at:

| Figure | Source |
|---|---|
| Dividends and dividend rates | Each xStock mint's Token-2022 Scaled UI Amount multiplier, read on-chain. No oracle. |
| The underlying stock's price | [Pyth](https://pyth.network) equity feeds, for every stock the configured key is entitled to |
| The xStock's own price | [Jupiter](https://jup.ag)'s public price API, for every xStock |

Where Pyth prices the underlying stock, the market page shows both prices and the gap between them: how closely the token tracks the stock it stands for. Each Pyth feed is requested on its own, so a key covering some stocks still prices those, and the rest fall back to Jupiter. The current key covers TSLA and QQQ; the configuration already maps all fifteen.

Realized dividend rates, annualized since each token launched (read live, 24 September 2026): KOx 1.75%, PGx 1.67%, MCDx 1.64%, JNJx 1.52%, MSFTx 0.46%, SPYx 0.44%, QQQx 0.27%, AAPLx 0.25%.

## Demo video

Two films, both rendered with [Remotion](https://remotion.dev):

- **[Walkthrough (2:31)](https://youtu.be/ZmsOdKGkx64):** the product, from recordings of the live app.
- **[Under the hood (1:57)](https://youtu.be/JoxztgzW_N4):** the program itself. Every line of code on screen is verbatim from `programs/stripr`, with its real line numbers.

The footage is real. The capture registers a Wallet Standard wallet in the page and sends every signature to a local signer that holds a devnet key, so the strip in the video is an actual devnet transaction. The pipeline lives in [`demo/remotion`](demo/remotion).

## Repository layout

```
programs/stripr/   Anchor program: state, instructions, multiplier sync, unit tests
tests/             End-to-end tests: classic mints, the real AAPLx mint, an xStock-like Token-2022 mint
scripts/           Market opening, devnet seeding, and a live reinvested-dividend trigger
app/               Next.js app and API routes: prices, dividends, market history, RPC proxy, faucet
demo/remotion/     The demo video: app capture, narration and the Remotion edit
docs/              Mainnet research, the deployment runbook and the submission notes
```

## Getting started

### Prerequisites

- Rust 1.98+
- Solana / Agave CLI 4.1.2
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

[`app/.env.example`](app/.env.example) documents every setting: network, RPC providers, the devnet faucet key and the optional Pyth key.

### Devnet demo data

```bash
npm run deploy:devnet
ROUNDS=3 ROUND_DELAY_SECONDS=45 npm run seed:devnet    # five markets with dividend history
npm run seed:offers:devnet                             # PT/YT listings and a sale in every market
npm run snapshot:devnet                                # decoded history, so charts paint instantly when hosted
SYMBOL=AAPL RATE=0.005 npm run reinvest:devnet         # pay a reinvested dividend live
```

### Mainnet markets

```bash
DRY_RUN=1 npm run open:mainnet:markets                 # plan and cost only, nothing is sent
DRY_RUN=0 SYMBOLS=AAPLx npm run open:mainnet:markets   # open the named markets
```

## Built with

Stripr's program, app and demo are original work for this hackathon, built on these open-source projects and services:

- [Anchor](https://github.com/solana-foundation/anchor) and [Agave](https://github.com/anza-xyz/agave) for the on-chain program
- [SPL Token and Token-2022](https://github.com/solana-program) with `@solana/spl-token` and `@solana/web3.js`
- [Solana Wallet Adapter](https://github.com/anza-xyz/wallet-adapter)
- [Pyth Network](https://pyth.network) equity feeds and [Jupiter](https://jup.ag)'s price API for market data
- [Next.js](https://nextjs.org), [React](https://react.dev), [TanStack Query](https://tanstack.com/query), [Tailwind CSS](https://tailwindcss.com) and [Lucide](https://lucide.dev) icons
- [Mocha](https://mochajs.org), [Chai](https://www.chaijs.com) and [tsx](https://tsx.is) for tests
- [Remotion](https://remotion.dev), [Playwright](https://playwright.dev) and [ElevenLabs](https://elevenlabs.io) for the demo video

## Known limitations

- **Not audited.** This is a hackathon build. Don't use it with meaningful real assets.
- **Issuer controls.** xStocks issuers can pause transfers and move tokens from any account through a permanent delegate, including Stripr's vaults.
- **Dividend timing.** Yield goes to whoever holds locked YT when a multiplier update is synced, so someone can lock just before a known update.
- **Fixed-price offers, not an AMM.** Prices come from sellers' listings, so thin markets can have wide spreads. PT and YT don't expire yet; maturity-dated series and a PT/YT AMM are the next step.
- **Early mainnet liquidity.** The mainnet markets are live but thin; devnet carries the seeded history and order books.
- **Pyth coverage.** The underlying stock's price comes from Pyth only for the stocks the configured key is entitled to (TSLA and QQQ today). The others use Jupiter.

## License

[MIT](LICENSE). Copyright (c) 2026 NetLayer Labs.
