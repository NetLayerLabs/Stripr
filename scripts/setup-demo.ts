/**
 * Opens a demo Stripr market backed by mock stock and USDC mints.
 *
 *   RECIPIENTS=<wallet>,<wallet> SYMBOL=AAPL NAME="Apple Inc." anchor run setup-demo
 *
 * The provider wallet becomes the market admin and the mint authority of both
 * mocks, so it can distribute dividends and back the app's devnet faucet.
 * Set USDC_MINT to reuse an existing dividend mint for additional markets.
 */
import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import type { Stripr } from "../target/types/stripr";

const { PublicKey } = anchor.web3;

const DECIMALS = 6;
const STOCK_PER_RECIPIENT = 1_000n * 10n ** BigInt(DECIMALS);
const ADMIN_USDC = 1_000_000n * 10n ** BigInt(DECIMALS);
const DEPLOYMENT_FILE = path.join(__dirname, "../app/src/config/deployment.json");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.stripr as Program<Stripr>;
  const { connection } = provider;
  const admin = (provider.wallet as anchor.Wallet).payer;

  const symbol = process.env.SYMBOL ?? "AAPL";
  const name = process.env.NAME ?? "Apple Inc.";
  const recipients = (process.env.RECIPIENTS ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean)
    .map((address) => new PublicKey(address));

  const stockMint = await createMint(connection, admin, admin.publicKey, null, DECIMALS);
  let usdcMint: anchor.web3.PublicKey;
  if (process.env.USDC_MINT) {
    usdcMint = new PublicKey(process.env.USDC_MINT);
  } else {
    usdcMint = await createMint(connection, admin, admin.publicKey, null, DECIMALS);
    const adminUsdc = await getOrCreateAssociatedTokenAccount(connection, admin, usdcMint, admin.publicKey);
    await mintTo(connection, admin, usdcMint, adminUsdc.address, admin, ADMIN_USDC);
  }

  const signature = await program.methods
    .initializeMarket()
    .accountsPartial({
      admin: admin.publicKey,
      underlyingMint: stockMint,
      dividendMint: usdcMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      dividendTokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  for (const recipient of recipients) {
    const account = await getOrCreateAssociatedTokenAccount(connection, admin, stockMint, recipient, true);
    await mintTo(connection, admin, stockMint, account.address, admin, STOCK_PER_RECIPIENT);
  }

  const endpoint = connection.rpcEndpoint;
  const cluster = endpoint.includes("devnet") ? "devnet" : endpoint.includes("mainnet") ? "mainnet-beta" : "localnet";
  const deployment = JSON.parse(readFileSync(DEPLOYMENT_FILE, "utf8"));
  const tokens = (deployment[cluster] ??= { tokens: {} }).tokens;
  tokens[stockMint.toBase58()] = { symbol, name };
  tokens[usdcMint.toBase58()] ??= { symbol: "USDC", name: "USD Coin (demo)" };
  writeFileSync(DEPLOYMENT_FILE, `${JSON.stringify(deployment, null, 2)}\n`);

  console.log(`Opened the ${symbol} market (${signature})`);
  console.log(`  stock mint: ${stockMint.toBase58()}`);
  console.log(`  USDC mint:  ${usdcMint.toBase58()}`);
  console.log(`  admin:      ${admin.publicKey.toBase58()}`);
  console.log(`Funded ${recipients.length} wallet(s) with 1,000 ${symbol}. Token names saved to app/src/config/deployment.json.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
