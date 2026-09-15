/**
 * Seeds a cluster with demo stock markets and real on-chain activity for the
 * app's analytics views.
 *
 *   ROUNDS=3 ROUND_DELAY_SECONDS=45 anchor run seed-markets --provider.cluster devnet
 *
 * Demo stocks are Token-2022 mints with the Scaled UI Amount extension, like
 * xStocks, so the admin can reinvest a dividend by raising the multiplier. Each
 * round the admin reinvests and/or pays USDC dividends while demo wallets strip,
 * lock and claim. Reuses the cluster's demo USDC from app/src/config/deployment.json
 * (or USDC_MINT). Demo wallet keys live in scripts/.demo-wallets.json (gitignored).
 */
import * as anchor from "@anchor-lang/core";
import { BN, Program } from "@anchor-lang/core";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeScaledUiAmountConfigInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  getMintLen,
  getOrCreateAssociatedTokenAccount,
  getScaledUiAmountConfig,
  mintTo,
  updateMultiplier,
} from "@solana/spl-token";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { Stripr } from "../target/types/stripr";

const { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } =
  anchor.web3;
type Keypair = anchor.web3.Keypair;
type PublicKey = anchor.web3.PublicKey;

const STOCK_DECIMALS = 8;
const STOCK_UNIT = 10n ** BigInt(STOCK_DECIMALS);
const MULTIPLIER_ONE = 10n ** 12n;
const DEPLOYMENT_FILE = path.join(__dirname, "../app/src/config/deployment.json");
const WALLETS_FILE = path.join(__dirname, ".demo-wallets.json");
const WALLET_COUNT = 4;
const WALLET_SOL = 0.05;

// Illustrative per-round dividends for mock stocks. `reinvest` raises the scaled UI
// multiplier by that fraction (how xStocks pass dividends on); `cash` is USDC per share.
const MARKETS = [
  { symbol: "AAPL", name: "Apple Inc.", reinvest: 0.0026, cash: 0 },
  { symbol: "MSFT", name: "Microsoft Corp.", reinvest: 0.0021, cash: 0 },
  { symbol: "JNJ", name: "Johnson & Johnson", reinvest: 0.0078, cash: 0 },
  { symbol: "KO", name: "Coca-Cola Co.", reinvest: 0, cash: 0.51 },
  { symbol: "PG", name: "Procter & Gamble Co.", reinvest: 0.0045, cash: 0.25 },
];

type Deployment = Record<string, { tokens: Record<string, { symbol: string; name: string }> }>;
type SeededMarket = (typeof MARKETS)[number] & { stockMint: PublicKey; market: PublicKey };

const clusterOf = (endpoint: string) =>
  endpoint.includes("devnet") ? "devnet" : endpoint.includes("mainnet") ? "mainnet-beta" : "localnet";
const stock = (count: number) => (BigInt(Math.round(count * 1_000)) * STOCK_UNIT) / 1_000n;
const toBN = (value: bigint) => new BN(value.toString());
const sleep = (seconds: number) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

/** Retries transient RPC failures (rate limits, expired blockhashes) with backoff. */
async function withRetry<T>(label: string, run: () => Promise<T>, attempts = 4): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= attempts) throw error;
      console.warn(`  retrying ${label} (${attempt}/${attempts - 1}): ${(error as Error).message.split("\n")[0]}`);
      await sleep(2 * attempt);
    }
  }
}

function loadWallets(): Keypair[] {
  if (existsSync(WALLETS_FILE)) {
    const secrets = JSON.parse(readFileSync(WALLETS_FILE, "utf8")) as number[][];
    return secrets.map((secret) => Keypair.fromSecretKey(Uint8Array.from(secret)));
  }
  const wallets = Array.from({ length: WALLET_COUNT }, () => Keypair.generate());
  writeFileSync(WALLETS_FILE, JSON.stringify(wallets.map((wallet) => Array.from(wallet.secretKey))), { mode: 0o600 });
  return wallets;
}

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.stripr as Program<Stripr>;
  const { connection } = provider;
  const admin = (provider.wallet as anchor.Wallet).payer;
  const cluster = clusterOf(connection.rpcEndpoint);
  const rounds = Number(process.env.ROUNDS ?? 3);
  const roundDelay = Number(process.env.ROUND_DELAY_SECONDS ?? 45);

  const pda = (...seeds: Buffer[]) => PublicKey.findProgramAddressSync(seeds, program.programId)[0];
  const ata2022 = (mint: PublicKey, owner: PublicKey) =>
    getAssociatedTokenAddressSync(mint, owner, true, TOKEN_2022_PROGRAM_ID);

  const deployment = JSON.parse(readFileSync(DEPLOYMENT_FILE, "utf8")) as Deployment;
  const tokens = (deployment[cluster] ??= { tokens: {} }).tokens;
  const save = () => writeFileSync(DEPLOYMENT_FILE, `${JSON.stringify(deployment, null, 2)}\n`);
  const usdcEntry = Object.entries(tokens).find(([, meta]) => meta.symbol === "USDC");
  const usdcMint = process.env.USDC_MINT
    ? new PublicKey(process.env.USDC_MINT)
    : usdcEntry
      ? new PublicKey(usdcEntry[0])
      : undefined;
  if (!usdcMint) throw new Error(`No demo USDC mint for ${cluster}. Set USDC_MINT or run setup-demo first.`);

  const wallets = loadWallets();
  for (const wallet of wallets) {
    if ((await connection.getBalance(wallet.publicKey)) < (WALLET_SOL / 2) * LAMPORTS_PER_SOL) {
      await withRetry("fund wallet", () =>
        sendAndConfirmTransaction(
          connection,
          new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: admin.publicKey,
              toPubkey: wallet.publicKey,
              lamports: WALLET_SOL * LAMPORTS_PER_SOL,
            })
          ),
          [admin]
        )
      );
    }
  }
  console.log(`Demo wallets ready on ${cluster}: ${wallets.map((w) => w.publicKey.toBase58().slice(0, 6)).join(", ")}`);

  /** A market for `symbol` on a Token-2022 stock mint with the current program layout, if one exists. */
  async function existingMarket(symbol: string) {
    for (const [mint, meta] of Object.entries(tokens)) {
      if (meta.symbol !== symbol) continue;
      const stockMint = new PublicKey(mint);
      const info = await connection.getAccountInfo(stockMint);
      if (!info?.owner.equals(TOKEN_2022_PROGRAM_ID)) continue;
      const market = pda(Buffer.from("market"), stockMint.toBuffer());
      try {
        if (await program.account.market.fetchNullable(market)) return { stockMint, market };
      } catch {
        // Market from an older program layout; open a fresh one.
      }
    }
    return undefined;
  }

  async function createStockMint() {
    const mint = Keypair.generate();
    const space = getMintLen([ExtensionType.ScaledUiAmountConfig]);
    const lamports = await connection.getMinimumBalanceForRentExemption(space);
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: admin.publicKey,
          newAccountPubkey: mint.publicKey,
          space,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeScaledUiAmountConfigInstruction(mint.publicKey, admin.publicKey, 1, TOKEN_2022_PROGRAM_ID),
        createInitializeMintInstruction(mint.publicKey, STOCK_DECIMALS, admin.publicKey, null, TOKEN_2022_PROGRAM_ID)
      ),
      [admin, mint]
    );
    return mint.publicKey;
  }

  const markets: SeededMarket[] = [];
  for (const spec of MARKETS) {
    let found = await existingMarket(spec.symbol);
    if (!found) {
      const stockMint = await withRetry(`create ${spec.symbol} mint`, createStockMint);
      await withRetry(`open ${spec.symbol} market`, () =>
        program.methods
          .initializeMarket()
          .accountsPartial({
            admin: admin.publicKey,
            underlyingMint: stockMint,
            dividendMint: usdcMint,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            dividendTokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc()
      );
      tokens[stockMint.toBase58()] = { symbol: spec.symbol, name: spec.name };
      save();
      found = { stockMint, market: pda(Buffer.from("market"), stockMint.toBuffer()) };
      console.log(`Opened ${spec.symbol} market`);
    }
    markets.push({ ...spec, ...found });
  }

  const give = (wallet: Keypair, market: SeededMarket, raw: bigint) =>
    withRetry(`mint ${market.symbol}`, async () => {
      const account = await getOrCreateAssociatedTokenAccount(
        connection,
        admin,
        market.stockMint,
        wallet.publicKey,
        false,
        "confirmed",
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      await mintTo(connection, admin, market.stockMint, account.address, admin, raw, [], undefined, TOKEN_2022_PROGRAM_ID);
    });

  /** Strips `raw` stock and returns the shares minted (mirrors the program's rounding). */
  const strip = async (wallet: Keypair, market: SeededMarket, raw: bigint) => {
    await withRetry(`strip ${market.symbol}`, () =>
      program.methods
        .strip(toBN(raw))
        .accountsPartial({
          user: wallet.publicKey,
          market: market.market,
          underlyingMint: market.stockMint,
          ptMint: pda(Buffer.from("pt_mint"), market.market.toBuffer()),
          ytMint: pda(Buffer.from("yt_mint"), market.market.toBuffer()),
          userUnderlying: ata2022(market.stockMint, wallet.publicKey),
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([wallet])
        .rpc()
    );
    const { multiplier } = await program.account.market.fetch(market.market);
    return (raw * BigInt(multiplier.toString())) / MULTIPLIER_ONE;
  };

  const lock = (wallet: Keypair, market: SeededMarket, shares: bigint) => {
    const ytMint = pda(Buffer.from("yt_mint"), market.market.toBuffer());
    return withRetry(`lock ${market.symbol}`, () =>
      program.methods
        .lockYt(toBN(shares))
        .accountsPartial({
          user: wallet.publicKey,
          market: market.market,
          underlyingMint: market.stockMint,
          ytMint,
          userYt: ata2022(ytMint, wallet.publicKey),
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([wallet])
        .rpc()
    );
  };

  /** Raises the stock's multiplier by `rate` (a reinvested dividend) and syncs the market. */
  const reinvest = async (market: SeededMarket) => {
    const mint = await getMint(connection, market.stockMint, "confirmed", TOKEN_2022_PROGRAM_ID);
    const config = getScaledUiAmountConfig(mint);
    const now = BigInt(Math.floor(Date.now() / 1000));
    const current = config && now >= config.newMultiplierEffectiveTimestamp ? config.newMultiplier : config?.multiplier ?? 1;
    await withRetry(`reinvest ${market.symbol}`, () =>
      updateMultiplier(
        connection,
        admin,
        market.stockMint,
        admin,
        current * (1 + market.reinvest),
        now - 30n,
        [],
        undefined,
        TOKEN_2022_PROGRAM_ID
      )
    );
    await withRetry(`sync ${market.symbol}`, () =>
      program.methods.syncMultiplier().accountsPartial({ market: market.market, underlyingMint: market.stockMint }).rpc()
    );
  };

  const payCash = async (market: SeededMarket) => {
    const { totalYtLocked } = await program.account.market.fetch(market.market);
    const locked = BigInt(totalYtLocked.toString());
    if (locked === 0n) return;
    const amount = (locked * BigInt(Math.round(market.cash * 1_000_000))) / STOCK_UNIT;
    await withRetry(`distribute ${market.symbol}`, () =>
      program.methods
        .distributeDividend(toBN(amount))
        .accountsPartial({
          admin: admin.publicKey,
          market: market.market,
          dividendMint: usdcMint,
          adminDividend: getAssociatedTokenAddressSync(usdcMint, admin.publicKey),
          dividendTokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc()
    );
  };

  /** Claims whatever the wallet has earned; nothing to claim is not an error here. */
  const claim = async (wallet: Keypair, market: SeededMarket) => {
    const attempts = [
      market.reinvest > 0 &&
        (() =>
          program.methods
            .claimStockYield()
            .accountsPartial({
              user: wallet.publicKey,
              market: market.market,
              underlyingMint: market.stockMint,
              userUnderlying: ata2022(market.stockMint, wallet.publicKey),
              tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
            .signers([wallet])
            .rpc()),
      market.cash > 0 &&
        (() =>
          program.methods
            .claimYield()
            .accountsPartial({
              user: wallet.publicKey,
              market: market.market,
              dividendMint: usdcMint,
              dividendTokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([wallet])
            .rpc()),
    ];
    for (const run of attempts) {
      if (!run) continue;
      try {
        await run();
      } catch (error) {
        if (!String(error).includes("NothingToClaim")) throw error;
      }
    }
  };

  // Every wallet takes a different-sized position in every market. The last
  // wallet never locks, so each market shows a realistic share of idle YT.
  for (const market of markets) {
    for (const [index, wallet] of wallets.entries()) {
      const holding = stock(250 + 175 * index + 40 * market.symbol.length);
      await give(wallet, market, holding);
      const minted = await strip(wallet, market, (holding * 3n) / 4n);
      if (index < WALLET_COUNT - 1) await lock(wallet, market, (minted * BigInt(2 + index)) / 5n);
    }
    console.log(`Seeded positions in ${market.symbol}`);
  }

  for (let round = 1; round <= rounds; round++) {
    for (const market of markets) {
      if (market.reinvest > 0) await reinvest(market);
      if (market.cash > 0) await payCash(market);
    }
    console.log(`Round ${round}/${rounds}: dividends reinvested and paid`);
    if (round === rounds) break;

    // Between rounds one locked holder claims and grows their position, so the
    // supply and dividend charts move over time.
    const wallet = wallets[(round - 1) % (WALLET_COUNT - 1)];
    for (const market of markets) {
      await claim(wallet, market);
      const extra = stock(60 * round);
      await give(wallet, market, extra);
      const minted = await strip(wallet, market, extra);
      await lock(wallet, market, minted);
    }
    console.log(`Round ${round}/${rounds}: positions updated, waiting ${roundDelay}s`);
    await sleep(roundDelay);
  }

  const remaining = await connection.getBalance(admin.publicKey);
  console.log(`Done. Admin balance: ${(remaining / LAMPORTS_PER_SOL).toFixed(3)} SOL`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
