import * as anchor from "@anchor-lang/core";
import { BN, Program } from "@anchor-lang/core";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createInitializeMintInstruction,
  createInitializePausableConfigInstruction,
  createInitializePermanentDelegateInstruction,
  createInitializeScaledUiAmountConfigInstruction,
  createInitializeTransferHookInstruction,
  createMint,
  createPauseInstruction,
  createResumeInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMintLen,
  mintTo,
  updateMultiplier,
} from "@solana/spl-token";
import { expect } from "chai";
import { Stripr } from "../target/types/stripr";

const { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } = anchor.web3;
type PublicKey = anchor.web3.PublicKey;

// A local mint configured like a real xStock: Token-2022 with a permanent
// delegate, a scaled UI amount multiplier, a pause switch and an unset transfer
// hook. It exercises the full flow, including reinvested-dividend yield, before
// any real asset touches the program.
const XSTOCK_EXTENSIONS = [
  ExtensionType.PermanentDelegate,
  ExtensionType.ScaledUiAmountConfig,
  ExtensionType.PausableConfig,
  ExtensionType.TransferHook,
];
const STOCK_DECIMALS = 8;
const USDC_DECIMALS = 6;
const MULTIPLIER_ONE = 10n ** 12n;
const ACC_PRECISION = 10n ** 12n;

const toBigInt = (value: { toString(): string }) => BigInt(value.toString());
const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b;

describe("stripr with an xStock-style Token-2022 mint", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.stripr as Program<Stripr>;
  const connection = provider.connection;
  const admin = (provider.wallet as anchor.Wallet).payer;
  const user = Keypair.generate();
  const stockMint = Keypair.generate();

  const shares = (count: number) => BigInt(count) * 10n ** BigInt(STOCK_DECIMALS);
  const usdc = (amount: number) => BigInt(amount) * 10n ** BigInt(USDC_DECIMALS);
  const bn = (value: bigint) => new BN(value.toString());
  const pda = (...seeds: Buffer[]) => PublicKey.findProgramAddressSync(seeds, program.programId)[0];
  const ata2022 = (mint: PublicKey, owner: PublicKey) =>
    getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID);
  const balance2022 = async (address: PublicKey) =>
    (await getAccount(connection, address, undefined, TOKEN_2022_PROGRAM_ID)).amount;

  const market = pda(Buffer.from("market"), stockMint.publicKey.toBuffer());
  const ptMint = pda(Buffer.from("pt_mint"), market.toBuffer());
  const ytMint = pda(Buffer.from("yt_mint"), market.toBuffer());
  const vault = pda(Buffer.from("underlying_vault"), market.toBuffer());
  const userStock = () => ata2022(stockMint.publicKey, user.publicKey);
  let usdcMint: PublicKey;
  let stripShares = 0n;
  let stockYieldClaimed = 0n;

  const strip = (amount: bigint) =>
    program.methods
      .strip(bn(amount))
      .accountsPartial({
        user: user.publicKey,
        market,
        underlyingMint: stockMint.publicKey,
        ptMint,
        ytMint,
        userUnderlying: userStock(),
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

  const ytAccounts = () => ({
    user: user.publicKey,
    market,
    underlyingMint: stockMint.publicKey,
    ytMint,
    userYt: ata2022(ytMint, user.publicKey),
    tokenProgram: TOKEN_2022_PROGRAM_ID,
  });

  before(async () => {
    const signature = await connection.requestAirdrop(user.publicKey, 5 * LAMPORTS_PER_SOL);
    const latest = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature, ...latest });

    const mintLen = getMintLen(XSTOCK_EXTENSIONS);
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: admin.publicKey,
          newAccountPubkey: stockMint.publicKey,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializePermanentDelegateInstruction(stockMint.publicKey, admin.publicKey, TOKEN_2022_PROGRAM_ID),
        createInitializeScaledUiAmountConfigInstruction(stockMint.publicKey, admin.publicKey, 1.0032, TOKEN_2022_PROGRAM_ID),
        createInitializePausableConfigInstruction(stockMint.publicKey, admin.publicKey, TOKEN_2022_PROGRAM_ID),
        // xStocks ship with the transfer hook extension present but no hook program set.
        createInitializeTransferHookInstruction(stockMint.publicKey, admin.publicKey, PublicKey.default, TOKEN_2022_PROGRAM_ID),
        createInitializeMintInstruction(stockMint.publicKey, STOCK_DECIMALS, admin.publicKey, admin.publicKey, TOKEN_2022_PROGRAM_ID)
      ),
      [admin, stockMint]
    );

    const account = await createAssociatedTokenAccount(
      connection,
      admin,
      stockMint.publicKey,
      user.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    await mintTo(connection, admin, stockMint.publicKey, account, admin, shares(100), [], undefined, TOKEN_2022_PROGRAM_ID);

    usdcMint = await createMint(connection, admin, admin.publicKey, null, USDC_DECIMALS);
    const adminUsdc = await createAssociatedTokenAccount(connection, admin, usdcMint, admin.publicKey);
    await mintTo(connection, admin, usdcMint, adminUsdc, admin, usdc(1_000));
  });

  it("opens a market and strips at the stock's current multiplier", async () => {
    await program.methods
      .initializeMarket()
      .accountsPartial({
        admin: admin.publicKey,
        underlyingMint: stockMint.publicKey,
        dividendMint: usdcMint,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        dividendTokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const multiplier = toBigInt((await program.account.market.fetch(market)).multiplier);
    expect(multiplier > MULTIPLIER_ONE).to.equal(true);

    await strip(shares(40));
    stripShares = (shares(40) * multiplier) / MULTIPLIER_ONE;

    expect(await balance2022(ata2022(ptMint, user.publicKey))).to.equal(stripShares);
    expect(await balance2022(ata2022(ytMint, user.publicKey))).to.equal(stripShares);
    expect(await balance2022(vault)).to.equal(shares(40));
    expect(await balance2022(userStock())).to.equal(shares(60));
    expect(toBigInt((await program.account.market.fetch(market)).totalStripped)).to.equal(stripShares);
  });

  it("pays a cash dividend to locked YT", async () => {
    await program.methods.lockYt(bn(stripShares)).accountsPartial(ytAccounts()).signers([user]).rpc();
    await program.methods
      .distributeDividend(bn(usdc(10)))
      .accountsPartial({
        admin: admin.publicKey,
        market,
        dividendMint: usdcMint,
        adminDividend: getAssociatedTokenAddressSync(usdcMint, admin.publicKey),
        dividendTokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    await program.methods
      .claimYield()
      .accountsPartial({
        user: user.publicKey,
        market,
        dividendMint: usdcMint,
        dividendTokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const claimed = (await getAccount(connection, getAssociatedTokenAddressSync(usdcMint, user.publicKey))).amount;
    expect(claimed <= usdc(10) && usdc(10) - claimed <= 1n).to.equal(true);
  });

  it("pays locked YT in the stock when the issuer raises the multiplier", async () => {
    const before = await program.account.market.fetch(market);
    const effectiveNow = BigInt(Math.floor(Date.now() / 1000) - 60);
    await updateMultiplier(
      connection,
      admin,
      stockMint.publicKey,
      admin,
      1.0064,
      effectiveNow,
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    const walletBefore = await balance2022(userStock());
    await program.methods
      .claimStockYield()
      .accountsPartial({
        user: user.publicKey,
        market,
        underlyingMint: stockMint.publicKey,
        userUnderlying: userStock(),
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([user])
      .rpc();
    const after = await program.account.market.fetch(market);

    const principal = toBigInt(before.totalStripped);
    const [oldMultiplier, newMultiplier] = [toBigInt(before.multiplier), toBigInt(after.multiplier)];
    expect(newMultiplier > oldMultiplier).to.equal(true);

    const freed = ceilDiv(principal * MULTIPLIER_ONE, oldMultiplier) - ceilDiv(principal * MULTIPLIER_ONE, newMultiplier);
    const locked = toBigInt(after.totalYtLocked);
    const expected = (locked * ((freed * ACC_PRECISION) / locked)) / ACC_PRECISION;

    stockYieldClaimed = (await balance2022(userStock())) - walletBefore;
    expect(expected > 0n).to.equal(true);
    expect(stockYieldClaimed).to.equal(expected);
    expect(toBigInt(after.totalStockYield)).to.equal(freed);
  });

  it("rejects stripping while the issuer has the stock paused", async () => {
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createPauseInstruction(stockMint.publicKey, admin.publicKey, [], TOKEN_2022_PROGRAM_ID)),
      [admin]
    );

    let rejected = false;
    try {
      await strip(shares(1));
    } catch {
      rejected = true;
    }
    expect(rejected).to.equal(true);

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createResumeInstruction(stockMint.publicKey, admin.publicKey, [], TOKEN_2022_PROGRAM_ID)),
      [admin]
    );
  });

  it("redeems the principal at the new multiplier without over-paying", async () => {
    await program.methods.unlockYt(bn(stripShares)).accountsPartial(ytAccounts()).signers([user]).rpc();

    const { multiplier } = await program.account.market.fetch(market);
    const walletBefore = await balance2022(userStock());
    await program.methods
      .redeem(bn(stripShares))
      .accountsPartial({
        user: user.publicKey,
        market,
        underlyingMint: stockMint.publicKey,
        ptMint,
        ytMint,
        userUnderlying: userStock(),
        userPt: ata2022(ptMint, user.publicKey),
        userYt: ata2022(ytMint, user.publicKey),
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const redeemed = (stripShares * MULTIPLIER_ONE) / toBigInt(multiplier);
    expect((await balance2022(userStock())) - walletBefore).to.equal(redeemed);
    // Everything the vault received either went back as principal or stock yield, apart from rounding dust.
    const vaultLeft = await balance2022(vault);
    expect(vaultLeft).to.equal(shares(40) - redeemed - stockYieldClaimed);
    expect(vaultLeft >= 0n && vaultLeft <= 2n).to.equal(true);
    expect(toBigInt((await program.account.market.fetch(market)).totalStripped)).to.equal(0n);
  });
});
