/**
 * Reinvests a dividend into a demo stock by raising its scaled UI multiplier, the
 * way xStocks pass dividends on, then syncs the Stripr market so locked YT earns it.
 * The provider wallet must be the mint's scaled UI authority (the seeding admin).
 *
 *   SYMBOL=AAPL RATE=0.005 anchor run reinvest-dividend --provider.cluster devnet
 */
import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { TOKEN_2022_PROGRAM_ID, getMint, getScaledUiAmountConfig, updateMultiplier } from "@solana/spl-token";
import { readFileSync } from "fs";
import path from "path";
import type { Stripr } from "../target/types/stripr";

const { PublicKey } = anchor.web3;
const DEPLOYMENT_FILE = path.join(__dirname, "../app/src/config/deployment.json");

type Deployment = Record<string, { tokens: Record<string, { symbol: string; name: string }> }>;

const clusterOf = (endpoint: string) =>
  endpoint.includes("devnet") ? "devnet" : endpoint.includes("mainnet") ? "mainnet-beta" : "localnet";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.stripr as Program<Stripr>;
  const { connection } = provider;
  const admin = (provider.wallet as anchor.Wallet).payer;

  const symbol = process.env.SYMBOL ?? "AAPL";
  const rate = Number(process.env.RATE ?? 0.005);
  if (!(rate > 0 && rate < 1)) throw new Error("RATE must be between 0 and 1, e.g. 0.005 for 0.5%.");

  const cluster = clusterOf(connection.rpcEndpoint);
  const tokens = (JSON.parse(readFileSync(DEPLOYMENT_FILE, "utf8")) as Deployment)[cluster]?.tokens ?? {};
  const candidates = Object.entries(tokens).filter(([, meta]) => meta.symbol === symbol);

  for (const [mintAddress] of candidates) {
    const stockMint = new PublicKey(mintAddress);
    const market = PublicKey.findProgramAddressSync([Buffer.from("market"), stockMint.toBuffer()], program.programId)[0];
    const info = await connection.getAccountInfo(stockMint);
    if (!info?.owner.equals(TOKEN_2022_PROGRAM_ID)) continue;
    const before = await program.account.market.fetchNullable(market).catch(() => null);
    if (!before) continue;

    const config = getScaledUiAmountConfig(await getMint(connection, stockMint, "confirmed", TOKEN_2022_PROGRAM_ID));
    if (!config) throw new Error(`${symbol} has no scaled UI multiplier to raise.`);
    const now = BigInt(Math.floor(Date.now() / 1000));
    const current = now >= config.newMultiplierEffectiveTimestamp ? config.newMultiplier : config.multiplier;
    const next = current * (1 + rate);

    await updateMultiplier(connection, admin, stockMint, admin, next, now - 30n, [], undefined, TOKEN_2022_PROGRAM_ID);
    const signature = await program.methods.syncMultiplier().accountsPartial({ market, underlyingMint: stockMint }).rpc();
    const after = await program.account.market.fetch(market);

    const freed =
      BigInt(after.totalStockYield.toString()) +
      BigInt(after.pendingStockYield.toString()) -
      BigInt(before.totalStockYield.toString()) -
      BigInt(before.pendingStockYield.toString());
    console.log(`${symbol} multiplier ${current.toFixed(6)} → ${next.toFixed(6)} (sync ${signature})`);
    console.log(`Freed ${freed} raw units of ${symbol} for locked YT holders to claim.`);
    return;
  }
  throw new Error(`No ${symbol} market on a scaled UI stock found for ${cluster}. Run seed-markets first.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
