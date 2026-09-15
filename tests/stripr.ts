import * as anchor from "@anchor-lang/core";
import { BN, Program } from "@anchor-lang/core";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  mintTo,
} from "@solana/spl-token";
import { expect } from "chai";
import { Stripr } from "../target/types/stripr";

const { Keypair, LAMPORTS_PER_SOL, PublicKey } = anchor.web3;
type Keypair = anchor.web3.Keypair;
type PublicKey = anchor.web3.PublicKey;

const DECIMALS = 6;
const units = (n: number) => n * 10 ** DECIMALS;

describe("stripr", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.stripr as Program<Stripr>;
  const connection = provider.connection;
  const admin = (provider.wallet as anchor.Wallet).payer;
  const alice = Keypair.generate();
  const bob = Keypair.generate();

  const pda = (...seeds: Buffer[]) =>
    PublicKey.findProgramAddressSync(seeds, program.programId)[0];
  const ata = (mint: PublicKey, owner: PublicKey) =>
    getAssociatedTokenAddressSync(mint, owner);
  const balance = async (address: PublicKey) =>
    Number((await getAccount(connection, address)).amount);

  let stockMint: PublicKey;
  let usdcMint: PublicKey;
  let market: PublicKey;
  let ptMint: PublicKey;
  let ytMint: PublicKey;

  const strip = (user: Keypair, amount: number) =>
    program.methods
      .strip(new BN(amount))
      .accountsPartial({
        user: user.publicKey,
        market,
        underlyingMint: stockMint,
        ptMint,
        ytMint,
        userUnderlying: ata(stockMint, user.publicKey),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

  const lockYt = (user: Keypair, amount: number) =>
    program.methods
      .lockYt(new BN(amount))
      .accountsPartial({
        user: user.publicKey,
        market,
        ytMint,
        userYt: ata(ytMint, user.publicKey),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

  const distribute = (signer: Keypair, amount: number) =>
    program.methods
      .distributeDividend(new BN(amount))
      .accountsPartial({
        admin: signer.publicKey,
        market,
        dividendMint: usdcMint,
        adminDividend: ata(usdcMint, signer.publicKey),
        dividendTokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([signer])
      .rpc();

  const claim = (user: Keypair) =>
    program.methods
      .claimYield()
      .accountsPartial({
        user: user.publicKey,
        market,
        dividendMint: usdcMint,
        dividendTokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

  const expectError = async (promise: Promise<unknown>, code: string) => {
    try {
      await promise;
    } catch (err) {
      expect(String(err)).to.include(code);
      return;
    }
    expect.fail(`expected ${code}`);
  };

  before(async () => {
    for (const user of [alice, bob]) {
      const signature = await connection.requestAirdrop(
        user.publicKey,
        10 * LAMPORTS_PER_SOL
      );
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature, ...latest });
    }

    stockMint = await createMint(connection, admin, admin.publicKey, null, DECIMALS);
    usdcMint = await createMint(connection, admin, admin.publicKey, null, DECIMALS);

    for (const user of [alice, bob]) {
      const stock = await createAssociatedTokenAccount(
        connection,
        admin,
        stockMint,
        user.publicKey
      );
      await mintTo(connection, admin, stockMint, stock, admin, units(100));
    }
    await createAssociatedTokenAccount(connection, admin, usdcMint, bob.publicKey);
    const adminUsdc = await createAssociatedTokenAccount(
      connection,
      admin,
      usdcMint,
      admin.publicKey
    );
    await mintTo(connection, admin, usdcMint, adminUsdc, admin, units(1_000));

    market = pda(Buffer.from("market"), stockMint.toBuffer());
    ptMint = pda(Buffer.from("pt_mint"), market.toBuffer());
    ytMint = pda(Buffer.from("yt_mint"), market.toBuffer());
  });

  it("initializes a market", async () => {
    await program.methods
      .initializeMarket()
      .accountsPartial({
        admin: admin.publicKey,
        underlyingMint: stockMint,
        dividendMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        dividendTokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const state = await program.account.market.fetch(market);
    expect(state.admin.toBase58()).to.equal(admin.publicKey.toBase58());
    expect(state.ptMint.toBase58()).to.equal(ptMint.toBase58());
    expect(state.ytMint.toBase58()).to.equal(ytMint.toBase58());
  });

  it("strips stock into PT and YT 1:1", async () => {
    await strip(alice, units(10));
    await strip(bob, units(30));

    expect(await balance(ata(ptMint, alice.publicKey))).to.equal(units(10));
    expect(await balance(ata(ytMint, alice.publicKey))).to.equal(units(10));
    expect(await balance(ata(stockMint, alice.publicKey))).to.equal(units(90));
    expect(await balance(pda(Buffer.from("underlying_vault"), market.toBuffer()))).to.equal(
      units(40)
    );
  });

  it("rejects dividends from anyone but the admin", async () => {
    await expectError(distribute(bob, units(1)), "Unauthorized");
  });

  it("splits dividends pro-rata across locked YT", async () => {
    await lockYt(alice, units(10));
    await lockYt(bob, units(30));
    await distribute(admin, units(20));

    // Alice leaves before the second dividend, so it all goes to Bob.
    await program.methods
      .unlockYt(new BN(units(10)))
      .accountsPartial({
        user: alice.publicKey,
        market,
        ytMint,
        userYt: ata(ytMint, alice.publicKey),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([alice])
      .rpc();
    await distribute(admin, units(30));

    await claim(alice);
    await claim(bob);
    expect(await balance(ata(usdcMint, alice.publicKey))).to.equal(units(5));
    expect(await balance(ata(usdcMint, bob.publicKey))).to.equal(units(45));
    expect(await balance(pda(Buffer.from("dividend_vault"), market.toBuffer()))).to.equal(0);

    await expectError(claim(alice), "NothingToClaim");
  });

  it("redeems PT + YT back into the stock", async () => {
    await program.methods
      .redeem(new BN(units(10)))
      .accountsPartial({
        user: alice.publicKey,
        market,
        underlyingMint: stockMint,
        ptMint,
        ytMint,
        userUnderlying: ata(stockMint, alice.publicKey),
        userPt: ata(ptMint, alice.publicKey),
        userYt: ata(ytMint, alice.publicKey),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([alice])
      .rpc();

    expect(await balance(ata(stockMint, alice.publicKey))).to.equal(units(100));
    expect(await balance(ata(ptMint, alice.publicKey))).to.equal(0);
    const state = await program.account.market.fetch(market);
    expect(state.totalStripped.toNumber()).to.equal(units(30));
  });
});
