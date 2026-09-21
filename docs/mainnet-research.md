# Stripr mainnet launch research (Grok, 14 Sep 2026)

> **Update (19 Sep 2026):** the multiplier-index design (design A in §3) is implemented - `Market::sync_multiplier` in `programs/stripr/src/state.rs` pays reinvested dividends to locked YT - and the hackathon deadline moved to 25 Sep 2026. Cross-check notes below that predate this are historical.

Research produced by Grok from the Stripr project brief. It has not been independently verified; items marked **Unsure** need confirmation before relying on them. Cross-check notes from the Stripr build are at the end.

Stocklana mainnet launch brief for Stripr - a Pendle-style yield-strip for xStocks on Solana, due Friday 18 Sep 2026, 4:00pm ET.

Hackathon page: hackathons.solana.com/hackathons/stocklana - $100k pool, one judging question: *could this be a real app people will actually use?* Credit & Yield is an explicit wedge.

---

## 1. RPC and indexing

**Best fit for Stripr: Helius first, not Triton.** Stripr is not an HFT bot. It needs program logs / Anchor events for charts, an activity feed, and a faucet/admin panel that doesn't die on public RPC.

| Provider | Why | Rough monthly cost |
|---|---|---|
| **Helius (recommended)** | Webhooks + Enhanced Transactions + DAS + `transactionSubscribe`. Designed for dApps. LaserStream gRPC on Business+ | Free for hackathon week; $49/mo Developer for launch; $499/mo Business for mainnet gRPC |
| QuickNode | Fine multi-chain RPC; gRPC bundled on Scale/Business | $49–$499 |
| Triton One | Best raw latency / Yellowstone reference implementation. Overkill and sales-led | ~$125 min PAYG or $2.9k+ dedicated |

Helius published tiers: Free $0 / 1M credits / 10 rps; Developer $49 / 10M / 50 rps; Business $499 / 100M / 200 rps + mainnet LaserStream. Webhooks cost 1 credit per delivered event.

**Architecture recommendation (hackathon → mainnet)**

1. This week: Helius webhooks on the program ID + market PDAs. Persist events in Postgres. Rebuild charts from that, not `getSignaturesForAddress` + `getTransaction` (the cause of the ~40 tx/10s limit).
2. If webhooks miss events or live charts are needed: LaserStream / Yellowstone filtered to the program. Don't build a full Geyser indexer before Stocklana.
3. Keep a second RPC (QuickNode or public) only as a fallback for user transactions.

**Unsure:** exact credit burn for 5 markets + admin dividend transactions. $49 is almost certainly enough until there is real volume.

---

## 2. Price data

xStock-specific Pyth feeds exist. Synth's asset table lists on-chain Pyth products such as AAPLX/USD, NVDAX/USD, TSLAX/USD, SPYX/USD. Pyth also ships 24/7 equity indices (AAPL, NVDA, TSLA, MSFT, AMZN, META, etc.). Chainlink is used by Backed for some corporate-action / price plumbing in their own stack.

**How to fetch**

- Off-chain UI: Hermes HTTP/WS (hermes.pyth.network) - free, no on-chain cost.
- On-chain (if ever needed in-program): Pyth Solana price accounts / push feeds. Switchboard can wrap a Pyth task for a custom pull feed.

**How to value PT / YT (Pendle-style, adapted to Scaled UI)**

Let `M_t` = Scaled UI multiplier at time `t`, `P_eq_t` = oracle price of 1 economic share (AAPL or 1 AAPLx UI unit).

- 1 raw xStock is worth `M_t × P_eq_t`.
- After strip, 1 PT + 1 YT should equal 1 raw token.
- If YT owns future multiplier growth (dividends / splits reinvested):
  - `V_PT ≈ P_eq_t × M_strip` (claim on the current raw share, no future rebase)
  - `V_YT ≈ P_eq_t × (M_t − M_strip)` plus expected future `ΔM`
- Until a secondary market exists, the UI can show:
  - PT ≈ underlying spot × current `M` × (1 − implied yield)
  - YT = residual
- Don't treat raw token balances as "shares" in charts. Always multiply by the mint's ScaledUiAmount.

**Unsure:** whether Pyth's AAPLX/USD is the token (DEX) price or the equity price. For a vault product, prefer the equity/index feed and apply `M_t` yourself so a DEX dislocation doesn't misprice PT/YT.

---

## 3. Corporate actions + YT design

**How Backed updates `M`:** dividends are reinvested, not paid in USDC. On Solana the raw SPL balance never changes; the Token-2022 Scaled UI Amount multiplier is raised. Kraken's FAQ: the multiplier is updated ~8:00 PM EST the day before the ex-date. Net dividend after 30% US withholding, divided by the prior-day close. Splits use the same multiplier.

Official docs: docs.xstocks.fi/developers/multipliers

No public forward-calendar API found. Track:

- the mint account `ScaledUiAmountConfig` (on-chain, source of truth)
- Backed / xStocks docs + issuer notices
- traditional ex-date calendars as a hint, not a guarantee

**Cleanest on-chain design for YT to earn `ΔM` (Pendle SY exchange-rate analog)**

Store on the Market PDA:

- `m_index` - last observed multiplier (scaled, e.g. 1e12)
- `acc_m_per_yt` - cumulative `ΔM` per locked YT (same O(1) index already used for USDC)

On `lock_yt` / `unlock_yt` / `claim_yield` / `strip` / `redeem`:

1. Read the current mint multiplier.
2. `delta = m_now − m_index`
3. Accrue `delta` to locked YT via the index.
4. On claim, mint or transfer the economic increment.

Because the raw token amount in the vault is constant, YT can't be paid in extra raw AAPLx without breaking the 1:1 PT + YT redeem. Practical options:

| Design | What YT receives | Verdict |
|---|---|---|
| **A. Synthetic claim on `ΔM`** - YT redeems into extra economic exposure by burning YT against PT + vault accounting | Cleanest Pendle analog | **Recommended.** Redeem path: PT + YT returns raw tokens; unlocked YT can convert accrued `ΔM` into extra PT or a claim token |
| B. Admin still deposits USDC equal to the net dividend | Matches cash-yield UX | Fights the product. The issuer doesn't pay USDC |
| C. Rebase YT supply | Ugly with Token-2022 + AMMs | Avoid |

Implementation note: read the multiplier from the mint extension, not from the UI. The Token-2022 rehearsal suite is the right place to add a test that bumps `scaledUiAmount` and asserts YT accrual.

**Unsure:** the exact legal/tax characterization of "YT owns the reinvested dividend." Flag in the UI: economic exposure, not a cash dividend, not shareholder rights.

---

## 4. xStocks integration, terms, vault risk

**What is allowed**

- Tokens are permissionless SPL Token-2022 once in a wallet.
- Kraken explicitly says they can be used as Kamino collateral, Raydium/Orca LP, lending. Solana's own xStocks case study describes composability (lend, pool, collateral).
- Primary mint/redeem through Backed is KYC'd and geo-fenced. Secondary DeFi is a different surface.

**Geo / eligibility**

- Not for US persons. Also commonly excluded: UK, Canada, Australia; some CEX terms also exclude the EEA for their product. Backed's own dApp ToS: public to non-US visitors.
- The frontend should geo-gate / show a disclaimer. The program can't know citizenship.

**Partner program:** no public "xStocks DeFi partner kit" found. Practical path: ship a clean integration, then email Backed / xStocks + Solana Foundation RWA contacts after Stocklana. Kamino already lists AAPLx markets - existence proof that vaults are tolerated.

**Permanent delegate + pause - real vault risk**

xStocks mints include: permanentDelegate, pausableConfig, scaledUiAmountConfig, transferHook (none set), defaultAccountState, confidential transfer, metadata.

| Extension | Risk to the Stripr vault |
|---|---|
| Pause | Transfers in/out of the stock vault can halt. Users can't strip/redeem until unpaused. Solvency is fine if instant exit isn't assumed |
| Permanent delegate | The issuer can move tokens out of the PDA vault without Stripr's signature. **The existential risk.** A malicious or compelled delegate empties the vault; PT/YT become unbacked |
| Freeze / defaultAccountState | Can freeze the vault token account |
| Transfer hook | Currently unset; if set later, Stripr's CPIs may start failing |

**Mitigations to show judges**

- Document these as issuer risk (the same as holding xStocks in any wallet).
- Monitor mint extension accounts; pause markets if pause/delegate activity is detected.
- Cap TVL per market at first.
- Never assume the vault is "unruggable."

**Unsure:** whether Backed's permanent delegate is contractually limited. Read the base prospectus / Final Terms before putting real size in. The full prospectus text was not retrieved.

---

## 5. Security

**Firms that fit a ~7-instruction Anchor program**

Solana-native: OtterSec, Sec3, Neodyme, Zellic, Accretion. Halborn / Ackee for a second logo later.

**Cost / time (2026 ranges, not a quote)**

- Small focused Anchor program (Stripr's size): often $7k–$25k, 1–2 weeks of review once scheduled
- Standard small DeFi: $20k–$60k, 2–4 weeks
- Waitlists at OtterSec/Neodyme can be weeks

A full OtterSec report won't be ready before Friday. For Stocklana: publish test coverage, a threat model (delegate/pause), and "audit scheduled." That is honest; pretending otherwise will lose judges.

**Verifiable build**

1. `solana-verify build`
2. Deploy
3. Upload the verification PDA as upgrade authority
4. `solana-verify remote submit-job`
5. Docs: solana.com verified builds. If the authority is Squads, export the PDA transaction and execute it through the multisig.

**security.txt:** use `solana-security-txt` in the program. Keep the policy URL on a website so it can change without an upgrade.

**Squads:** create a 2-of-3 (or 2-of-2 + timelock) Squads v4 vault. Transfer the upgrade authority after the first mainnet deploy. Keep a hot key only for the hackathon deploy.

**Bug bounty:** Immunefi or a self-hosted policy linked from security.txt. For a pre-TVL hackathon, a $1k–$5k discretionary critical bounty is enough to look serious. Scale with TVL.

---

## 6. Liquidity and composability

**PT/YT trading - launch order.** PT and YT aren't memecoins. They should trade close to a no-arbitrage band around the stripped stock.

1. First pool: PT–xStock or PT–USDC on an Orca Whirlpool or Raydium CLMM, tight fee (1–5 bps), narrow range. Correlated pair → CLMM, not a bonding curve.
2. YT–USDC on Meteora DLMM if YT is thin and jumpy (dividend events). DLMM bins handle that better than a wide CLMM.
3. Skip Meteora Dynamic Bonding Curve / pump-style launches. Wrong product surface.

**Jupiter:** listing is permissionless once a supported DEX pool exists. Strict/verified mode needs real liquidity + metadata; no special form guarantees a banner. Jupiter already screens tokenized stocks.

**Kamino:** AAPLx markets already exist (DefiLlama shows an AAPLx Kamino market). PT as collateral is a later conversation with Kamino risk - not a Friday deliverable. Demo a pool + Jupiter route instead.

**Listing hygiene:** Metaplex/Token-2022 metadata on PT and YT (name "Stripr PT AAPLx", symbol "ptAAPLx"), unique logos, and a description saying they are claims, not the stock.

---

## 7. Mainnet SOL budget

The program is ~385 KB. Devnet rent ~1.96 SOL. Mainnet program-data rent is in the same ballpark (rent-exempt deposit ≈ size × current lamports per byte; SIMD-0437 reportedly cut that ~9% on 3 Sep 2026, with more cuts coming).

| Item | SOL (order of magnitude, not a quote) |
|---|---|
| Program deploy (385 KB, upgradeable) | ~2.0–2.3 |
| Deploy / write-buffer priority fees | 0.05–0.20 |
| IDL / program-metadata PDA | 0.02–0.10 |
| Verification PDA | ~0.01–0.03 |
| Per market: Market PDA + 3 vault accounts + PT mint + YT mint + metadata | ~0.03–0.08 each |
| 5 markets | ~0.15–0.40 |
| Squads vault creation | ~0.05 |
| Buffer / failed deploy retries | 0.20 |
| User-facing priority fee float | 0.10–0.30 |

**Recommended wallet: 4 SOL for a clean 5-market mainnet.** 3 SOL is tight but possible if the first deploy works. Keep another 1 SOL on a backup key.

Confirm live with:

```bash
solana rent 385000
solana program show 9wpHmYvuq7qrAuH4VV3LyC54d2VyTYFMfveMMph2nzZF --url devnet
```

**Unsure:** exact mainnet rent after SIMD-0437 step 1. Measure; don't trust the 1.96 SOL devnet number blindly.

---

## 8. Standing out + after Stocklana

**What wins Credit & Yield here.** Judges asked for a real app, not a whitepaper. Winning submissions will likely show:

1. A user who holds AAPLx and wants yield or discounted principal - stated in one sentence.
2. End-to-end on real xStock mints (even with tiny size), not only mocks.
3. YT actually capturing `ΔM`, not an admin USDC faucet pretending to be dividends. That is the differentiator vs "we wrapped a stock."
4. Why Solana: Token-2022 Scaled UI + cheap accounts + 24/7 stock trading that TradFi can't clear.
5. Honest risk copy (pause, permanent delegate, no audit yet).

**Ship Friday:** 1–2 live markets (AAPLx, SPYx), working strip/redeem/lock, multiplier-aware YT, a Helius-backed activity chart, explorer links, a geo disclaimer.

**After Stocklana**

| Path | Reality |
|---|---|
| Solana Foundation grants | Rolling form, public good + milestone budget. Review ~1 week, decision ~3 weeks. Apply with "open-source yield primitive for xStocks + corporate-action indexer." |
| Colosseum accelerator | $250k per accepted team, 8 weeks. Can't apply cold; must win a Colosseum hackathon or Eternal. Stocklana is Foundation-run, not Colosseum - don't assume a prize here feeds Cohort 6. |
| xStocks / Backed | No public grant page found. Warm intro via Foundation RWA + a Kamino-class integration. |
| STRIDE / SIRN | Foundation security program - relevant once there is TVL, not this week. |

---

## This-week priority order (Grok)

1. Change YT accounting to accrue Scaled UI `ΔM` (§3). Without this, mainnet is a demo of the wrong product.
2. Helius webhook indexer so the UI doesn't die (§1).
3. Deploy the same program ID to mainnet, 4 SOL in the deploy key, upgrade authority on a new key to move to Squads after the deadline.
4. One real AAPLx market with dust TVL + PT/YT metadata.
5. Disclaimer: non-US, not a securities offering, issuer pause/delegate risk, unaudited.
6. Pyth (or Hermes) price in the UI only - don't block the demo on an on-chain oracle CPI.

---

## Cross-check notes (from the Stripr build)

- **Colosseum eligibility (§8):** Solana Compass reported that all Stocklana submissions are eligible for prizes in Colosseum's Crypto World's Fair. That conflicts with the "don't assume a prize feeds Colosseum" note; confirm on the hackathon page.
- **Devnet deploy cost (§7):** measured, not estimated. The devnet program data account (385,192 bytes) holds 1.9577 SOL; the deploy took the deployer from 5.00 to 3.02 SOL including the IDL metadata account.
- **Issuer risk (§4):** confirmed on-chain. AAPLx, SPYx, TSLAx, NVDAx and MSFTx all carry permanentDelegate, pausableConfig, scaledUiAmountConfig and an unset transferHook, with the same mint authority `7pt9tkctJPK7PPNQJ77GKg8ZffSF6QxoMiCFYHxrtaCj` and freeze authority `JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs`.
- **Rehearsal (§3, §4):** Stripr's test suite already runs strip → lock → dividend → claim → redeem on an xStock-style Token-2022 mint and confirms strip is rejected while the mint is paused. It does not yet test multiplier growth, because the current YT model pays admin-deposited USDC.
- **Current YT model:** YT earns reinvested dividends from the stock's multiplier (design A in §3, implemented in `state.rs`) plus any cash dividend the market admin deposits (design B). Cash dividends exist for demos; real xStocks only reinvest.
- **Browser RPC:** the public mainnet RPC returns 403 to any browser origin (HTTP and websocket), so the mainnet app needs either a server-side RPC proxy or a provider key such as Helius.
