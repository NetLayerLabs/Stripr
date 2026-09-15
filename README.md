# Stripr

**Yield stripping for tokenized stocks on Solana.** Stripr splits a tokenized share into two tokens:

- **PT (Principal Token):** the claim on the share itself.
- **YT (Yield Token):** the right to the share's dividends.

Holders can keep, sell or hedge each part separately, and a PT + YT pair always redeems for the original stock.

Built by NetLayer Labs for the [Stocklana Hackathon](https://hackathons.solana.com/hackathons/stocklana) (Credit & Yield track).

## Why it matters

Stocks are coming on-chain as SPL tokens (for example xStocks), but a share's income still can't be separated from its principal. Stripr gives dividends their own token, much as Pendle does for DeFi yield. An income investor can buy only the dividends, and a long-term holder can sell future dividends today.

## How it works

1. **Strip.** Deposit a stock into the market vault and receive equal amounts of PT and YT.
2. **Lock YT.** Only locked YT earns. The app can lock it in the same transaction as the strip.
3. **Earn from two sources:**
   - **Reinvested dividends.** xStocks pay dividends by raising the token's Token-2022 *Scaled UI Amount* multiplier, so the vault needs fewer raw tokens to back the same shares. Stripr releases that surplus to locked YT, paid in the stock itself.
   - **Cash dividends.** A market admin can deposit a cash payout (e.g. USDC), which is split pro-rata across locked YT.
4. **Claim** earned stock and cash at any time, including after unlocking.
5. **Redeem** equal PT + YT for the stock at the current multiplier.

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

The demo stocks are Token-2022 mints with the Scaled UI Amount extension, seeded with several dividend rounds so the charts have real on-chain history. The app's faucet sends test stock and devnet SOL.

## Program

A single Anchor program (`programs/stripr`) with nine instructions:

| Instruction | Who | What it does |
|---|---|---|
| `initialize_market` | Admin | Creates the stock vault, PT/YT mints and dividend vault for a stock |
| `strip` | Anyone | Deposits stock, mints equal PT and YT in share units |
| `redeem` | Anyone | Burns equal PT and YT, returns the stock |
| `lock_yt` / `unlock_yt` | YT holder | Starts or stops earning, settling yield first |
| `distribute_dividend` | Admin | Deposits a cash dividend for locked YT |
| `claim_yield` | YT holder | Pays unclaimed cash dividends |
| `sync_multiplier` | Anyone | Releases reinvested dividends after the stock's multiplier rises |
| `claim_stock_yield` | YT holder | Pays unclaimed reinvested stock |

Works with classic SPL tokens and Token-2022 mints, including the extensions xStocks use: ScaledUiAmount, Pausable, PermanentDelegate and TransferHook.

## App

A Next.js 14 app (`app/`):

- **Landing page:** explains the protocol, with a dividend calculator and a live mainnet AAPLx snapshot.
- **Markets dashboard:** KPIs and a sortable table.
- **Market pages:**
  - Strip, redeem and earn forms.
  - Your position.
  - Analytics rebuilt from on-chain events: supply, reinvested and cash dividends, and recent activity.
- **Transaction modal:** every action walks through each step and ends with an explorer link.
- **Network switch:** toggles Devnet and Mainnet. A server-side RPC proxy is used because public mainnet RPC blocks browser requests.

## Repository layout

```
programs/stripr/   Anchor program (state, instructions, multiplier sync, unit tests)
tests/             End-to-end tests (classic mints, real AAPLx fixture, xStock-like Token-2022 mint)
scripts/           Devnet demo setup, market seeding and a live reinvested-dividend trigger
app/               Next.js frontend and API routes (market history, RPC proxy, faucet)
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
npm run test:program       # 11 end-to-end tests on a local validator
cargo test -p stripr       # accounting unit tests
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
SYMBOL=AAPL RATE=0.005 npm run reinvest:devnet         # pay a reinvested dividend live
```

## Known limitations

- **Not audited.** This is a hackathon build. Don't use it with meaningful real assets.
- **Issuer controls.** xStocks issuers can pause transfers and move tokens from any account through a permanent delegate, including Stripr's vaults.
- **Dividend timing.** Yield goes to whoever holds locked YT when a multiplier update is synced, so someone can lock just before a known update.
- **No maturities or AMM yet.** PT and YT don't expire, and there's no PT/YT market for pricing yield. Both are on the roadmap.
