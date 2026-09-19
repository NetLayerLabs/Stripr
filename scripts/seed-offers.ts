/**
 * Lists demo PT and YT offers in every seeded market and fills one, so each
 * market's Trade section shows a live order book with a real sale.
 *
 *   anchor run seed-offers --provider.cluster devnet
 *
 * Run after seed-markets; it uses the same demo wallets (scripts/.demo-wallets.json).
 * Safe to re-run: wallets that already list a token in a market are skipped.
 * Prices are illustrative, set against a reference share price per mock stock.
 */
import * as anchor from "@anchor-lang/core";
import { BN, Program } from "@anchor-lang/core";
import {
  TOKEN_2022_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { existsSync, readFileSync } from "fs";
import path from "path";
import type { Stripr } from "../target/types/stripr";

const { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } =
  anchor.web3;
type Keypair = anchor.web3.Keypair;
type PublicKey = anchor.web3.PublicKey;

const DEPLOYMENT_FILE = path.join(__dirname, "../app/src/config/deployment.json");
const WALLETS_FILE = path.join(__dirname, ".demo-wallets.json");
const MIN_WALLET_SOL = 0.05;
const TOP_UP_SOL = 0.08;
const BUYER_USDC = 5_000;

// Static fallbacks only; listings are priced against the live stock price when Jupiter answers.
const REFERENCE_PRICES: Record<string, number> = { AAPL: 230, MSFT: 420, JNJ: 160, KO: 70, PG: 170 };
const PRICES_CONFIG = path.join(__dirname, "../app/src/config/pyth.json");

/** Live stock price from Jupiter for the symbol's xStock twin, falling back to the static reference. */
async function referencePrice(symbol: string): Promise<number | undefined> {
  try {
    const feeds = (JSON.parse(readFileSync(PRICES_CONFIG, "utf8")) as { feeds: Record<string, { xstock?: string }> }).feeds;
    const mint = feeds[symbol]?.xstock;
    if (mint) {
      const response = await fetch(`https://lite-api.jup.ag/price/v3?ids=${mint}`);
      if (response.ok) {
        const body = (await response.json()) as Record<string, { usdPrice?: number; stockData?: { price?: number } }>;
        const price = body[mint]?.stockData?.price ?? body[mint]?.usdPrice;
        if (price && price > 0) return price;
      }
    }
  } catch {
    // Fall through to the static reference.
  }
  return REFERENCE_PRICES[symbol];
}

// Wallet index, token, price as a share of the reference share price, whole tokens listed.
const LISTINGS: Array<{ wallet: number; asset: "pt" | "yt"; ofPrice: number; tokens: number }> = [
  { wallet: 0, asset: "yt", ofPrice: 0.06, tokens: 25 },
  { wallet: 1, asset: "yt", ofPrice: 0.065, tokens: 40 },
  { wallet: 3, asset: "yt", ofPrice: 0.08, tokens: 30 },
  { wallet: 3, asset: "pt", ofPrice: 0.935, tokens: 20 },
];
// An income investor buys part of the cheapest YT listing and locks it.
const BUYER = 2;
const BUY_TOKENS = 10;

const toBN = (value: bigint) => new BN(value.toString());
const sleep = (seconds: number) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));
const minBigInt = (a: bigint, b: bigint) => (a < b ? a : b);
const clusterOf = (endpoint: string) =>
  endpoint.includes("devnet") ? "devnet" : endpoint.includes("mainnet") ? "mainnet-beta" : "localnet";

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

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.stripr as Program<Stripr>;
  const { connection } = provider;
  const admin = (provider.wallet as anchor.Wallet).payer;
  const cluster = clusterOf(connection.rpcEndpoint);

  if (!existsSync(WALLETS_FILE)) throw new Error("No demo wallets found. Run seed-markets first.");
  const wallets = (JSON.parse(readFileSync(WALLETS_FILE, "utf8")) as number[][]).map((secret) =>
    Keypair.fromSecretKey(Uint8Array.from(secret))
  );
  const tokens = (
    JSON.parse(readFileSync(DEPLOYMENT_FILE, "utf8")) as Record<string, { tokens: Record<string, { symbol: string }> }>
  )[cluster]?.tokens ?? {};

  const pda = (...seeds: Buffer[]) => PublicKey.findProgramAddressSync(seeds, program.programId)[0];
  const ata = (mint: PublicKey, owner: PublicKey, tokenProgram: PublicKey) =>
    getAssociatedTokenAddressSync(mint, owner, true, tokenProgram);
  const balanceOf = async (address: PublicKey, tokenProgram: PublicKey) => {
    try {
      return (await getAccount(connection, address, "confirmed", tokenProgram)).amount;
    } catch {
      return 0n;
    }
  };

  for (const wallet of wallets) {
    if ((await connection.getBalance(wallet.publicKey)) < MIN_WALLET_SOL * LAMPORTS_PER_SOL) {
      await withRetry("top up wallet", () =>
        sendAndConfirmTransaction(
          connection,
          new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: admin.publicKey,
              toPubkey: wallet.publicKey,
              lamports: TOP_UP_SOL * LAMPORTS_PER_SOL,
            })
          ),
          [admin]
        )
      );
    }
  }

  // SYMBOLS=PG,MSFT limits the run to some markets.
  const only = process.env.SYMBOLS?.split(",").map((s) => s.trim()).filter(Boolean);
  const markets = await withRetry("list markets", () =>
    program.account.market.all([{ dataSize: program.account.market.size }])
  );
  for (const { publicKey: market, account } of markets) {
    const symbol = tokens[account.underlyingMint.toBase58()]?.symbol;
    if (only && (!symbol || !only.includes(symbol))) continue;
    const reference = symbol ? await referencePrice(symbol) : undefined;
    if (!symbol || !reference) continue;
    console.log(`${symbol}: pricing against ${reference.toFixed(2)} per share`);

    const mintInfo = await withRetry(`read ${symbol} mint`, () => connection.getAccountInfo(account.underlyingMint));
    if (!mintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)) continue;
    const tokenProgram = mintInfo.owner;
    const usdcProgram = (await withRetry("read USDC mint", () => connection.getAccountInfo(account.dividendMint)))!.owner;
    const existing = await withRetry(`list ${symbol} offers`, () =>
      program.account.offer.all([
        { dataSize: program.account.offer.size },
        { memcmp: { offset: 8 + 32, bytes: market.toBase58() } },
      ])
    );
    const STOCK_UNIT = 10n ** 8n;

    // REPRICE=1 cancels the demo wallets' listings first so they're re-listed at today's price.
    if (process.env.REPRICE === "1") {
      for (const { publicKey: offer, account: open } of existing) {
        const maker = wallets.find((wallet) => wallet.publicKey.equals(open.maker));
        if (!maker) continue;
        // A retry can follow a cancel that already landed, so treat a closed offer as done.
        await withRetry(`cancel ${symbol} listing`, async () => {
          if (!(await program.account.offer.fetchNullable(offer))) return;
          await program.methods
            .cancelOffer()
            .accountsPartial({
              maker: maker.publicKey,
              market,
              offer,
              tokenMint: open.tokenMint,
              escrow: pda(Buffer.from("offer_escrow"), offer.toBuffer()),
              makerToken: ata(open.tokenMint, maker.publicKey, tokenProgram),
              tokenProgram,
            })
            .signers([maker])
            .rpc();
        });
      }
      existing.length = 0;
    }

    for (const [index, listing] of LISTINGS.entries()) {
      const maker = wallets[listing.wallet];
      const tokenMint = listing.asset === "yt" ? account.ytMint : account.ptMint;
      if (existing.some(({ account: offer }) => offer.maker.equals(maker.publicKey) && offer.tokenMint.equals(tokenMint))) {
        continue;
      }
      const makerToken = ata(tokenMint, maker.publicKey, tokenProgram);
      const amount = minBigInt(BigInt(listing.tokens) * STOCK_UNIT, await balanceOf(makerToken, tokenProgram));
      if (amount === 0n) continue;

      const id = BigInt(Date.now()) + BigInt(index);
      const offer = pda(
        Buffer.from("offer"),
        market.toBuffer(),
        maker.publicKey.toBuffer(),
        new BN(id.toString()).toArrayLike(Buffer, "le", 8)
      );
      const price = BigInt(Math.round(reference * listing.ofPrice * 100)) * 10_000n; // whole cents, 6-decimal USDC
      await withRetry(`list ${listing.asset.toUpperCase()}-${symbol}`, () =>
        program.methods
          .createOffer(toBN(id), toBN(amount), toBN(price))
          .accountsPartial({
            maker: maker.publicKey,
            market,
            tokenMint,
            offer,
            escrow: pda(Buffer.from("offer_escrow"), offer.toBuffer()),
            makerToken,
            tokenProgram,
          })
          .signers([maker])
          .rpc()
      );
    }

    // The buyer takes part of the cheapest YT listing once, then locks it to earn.
    const buyer = wallets[BUYER];
    const offers = await withRetry(`list ${symbol} offers`, () =>
      program.account.offer.all([
        { dataSize: program.account.offer.size },
        { memcmp: { offset: 8 + 32, bytes: market.toBase58() } },
      ])
    );
    const alreadyBought = offers.some(({ account: offer }) => offer.amount.lt(offer.initialAmount));
    const cheapest = offers
      .filter(({ account: offer }) => offer.tokenMint.equals(account.ytMint) && !offer.maker.equals(buyer.publicKey))
      .sort((a, b) => a.account.price.cmp(b.account.price))[0];

    if (cheapest && !alreadyBought) {
      // A freshly created account can briefly read as missing on public RPC, so retry.
      const buyerUsdc = await withRetry("buyer USDC account", () =>
        getOrCreateAssociatedTokenAccount(
          connection,
          admin,
          account.dividendMint,
          buyer.publicKey,
          false,
          "confirmed",
          { commitment: "confirmed" },
          usdcProgram
        )
      );
      if (buyerUsdc.amount < BigInt(BUYER_USDC) * 1_000_000n) {
        await withRetry("fund buyer USDC", () =>
          mintTo(connection, admin, account.dividendMint, buyerUsdc.address, admin, BigInt(BUYER_USDC) * 1_000_000n, [], undefined, usdcProgram)
        );
      }

      const amount = minBigInt(BigInt(BUY_TOKENS) * STOCK_UNIT, BigInt(cheapest.account.amount.toString()));
      await withRetry(`buy YT-${symbol}`, () =>
        program.methods
          .fillOffer(toBN(amount), cheapest.account.price)
          .accountsPartial({
            taker: buyer.publicKey,
            maker: cheapest.account.maker,
            market,
            offer: cheapest.publicKey,
            tokenMint: account.ytMint,
            escrow: pda(Buffer.from("offer_escrow"), cheapest.publicKey.toBuffer()),
            takerToken: ata(account.ytMint, buyer.publicKey, tokenProgram),
            dividendMint: account.dividendMint,
            takerQuote: buyerUsdc.address,
            makerQuote: ata(account.dividendMint, cheapest.account.maker, usdcProgram),
            tokenProgram,
            dividendTokenProgram: usdcProgram,
          })
          .signers([buyer])
          .rpc()
      );
      await withRetry(`lock YT-${symbol}`, () =>
        program.methods
          .lockYt(toBN(amount))
          .accountsPartial({
            user: buyer.publicKey,
            market,
            underlyingMint: account.underlyingMint,
            ytMint: account.ytMint,
            userYt: ata(account.ytMint, buyer.publicKey, tokenProgram),
            tokenProgram,
          })
          .signers([buyer])
          .rpc()
      );
    }
    console.log(`Order book ready in ${symbol}`);
    await sleep(3); // stay under the public RPC's per-method rate limit
  }

  const remaining = await connection.getBalance(admin.publicKey);
  console.log(`Done. Admin balance: ${(remaining / LAMPORTS_PER_SOL).toFixed(3)} SOL`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
