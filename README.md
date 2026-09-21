# Stripr

**Yield stripping for tokenized stocks on Solana.** xStocks pay dividends by raising a Token-2022 multiplier on the token; Stripr turns that into a yield you can own and trade. It splits a tokenized share into two tokens:

- **PT (Principal Token):** the claim on the share itself.
- **YT (Yield Token):** the right to the share's dividends.

Holders can keep, sell or hedge each part separately, and a PT + YT pair always redeems for the original stock. A built-in on-chain offer book lets anyone sell future dividends for USDC today, or buy them.

Built by NetLayer Labs for the [Stocklana Hackathon](https://hackathons.solana.com/hackathons/stocklana) (Credit & Yield track).

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
- **Reference prices:** each listing is shown as a percentage of the stock's live price, along with what PT and YT together cost against one share. Prices come from Jupiter's public price API for the matching xStock (no key needed), or from Pyth's equity feeds when `PYTH_API_KEY` has entitlement for them.
- **Transaction modal:** every action walks through each step and ends with an explorer link.
- **Network switch:** toggles Devnet and Mainnet. A server-side RPC proxy is used because public mainnet RPC blocks browser requests.

## Repository layout

```
programs/stripr/   Anchor program (state, instructions, multiplier sync, unit tests)
tests/             End-to-end tests (classic mints, real AAPLx fixture, xStock-like Token-2022 mint)
scripts/           Devnet demo setup, market seeding and a live reinvested-dividend trigger
app/               Next.js frontend and API routes (market history, RPC proxy, faucet, prices)
docs/              Mainnet xStocks research notes
```

## Getting started

### Prerequisites

- Rust 1.89+
- Solana / Agave CLI 3.1.10
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
