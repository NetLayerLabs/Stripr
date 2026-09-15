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
const units = (n: number) => Math.round(n * 10 ** DECIMALS);

describe("offers: selling PT and YT", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.stripr as Program<Stripr>;
  const connection = provider.connection;
  const admin = (provider.wallet as anchor.Wallet).payer;
  // Alice strips her stock and sells future dividends; Bob is an income investor buying them.
  const alice = Keypair.generate();
  const bob = Keypair.generate();

  const pda = (...seeds: Buffer[]) => PublicKey.findProgramAddressSync(seeds, program.programId)[0];
  const ata = (mint: PublicKey, owner: PublicKey) => getAssociatedTokenAddressSync(mint, owner);
  const balance = async (address: PublicKey) => Number((await getAccount(connection, address)).amount);

  let stockMint: PublicKey;
  let usdcMint: PublicKey;
  let market: PublicKey;
  let ptMint: PublicKey;
  let ytMint: PublicKey;

  const offerAddress = (maker: PublicKey, id: number) =>
    pda(Buffer.from("offer"), market.toBuffer(), maker.toBuffer(), new BN(id).toArrayLike(Buffer, "le", 8));
  const escrowAddress = (offer: PublicKey) => pda(Buffer.from("offer_escrow"), offer.toBuffer());

  const createOffer = (maker: Keypair, id: number, tokenMint: PublicKey, amount: number, price: number) => {
    const offer = offerAddress(maker.publicKey, id);
    return program.methods
      .createOffer(new BN(id), new BN(amount), new BN(price))
      .accountsPartial({
        maker: maker.publicKey,
        market,
        tokenMint,
        offer,
        escrow: escrowAddress(offer),
        makerToken: ata(tokenMint, maker.publicKey),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();
  };

  const fillOffer = (taker: Keypair, maker: PublicKey, id: number, tokenMint: PublicKey, amount: number, price: number) => {
    const offer = offerAddress(maker, id);
    return program.methods
      .fillOffer(new BN(amount), new BN(price))
      .accountsPartial({
        taker: taker.publicKey,
        maker,
        market,
        offer,
        tokenMint,
        escrow: escrowAddress(offer),
        takerToken: ata(tokenMint, taker.publicKey),
        dividendMint: usdcMint,
        takerQuote: ata(usdcMint, taker.publicKey),
        makerQuote: ata(usdcMint, maker),
        tokenProgram: TOKEN_PROGRAM_ID,
        dividendTokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([taker])
      .rpc();
  };

  const cancelOffer = (signer: Keypair, maker: PublicKey, id: number, tokenMint: PublicKey) => {
    const offer = offerAddress(maker, id);
    return program.methods
      .cancelOffer()
      .accountsPartial({
        maker: signer.publicKey,
        market,
        offer,
        tokenMint,
        escrow: escrowAddress(offer),
        makerToken: ata(tokenMint, signer.publicKey),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([signer])
      .rpc();
  };

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
      const signature = await connection.requestAirdrop(user.publicKey, 10 * LAMPORTS_PER_SOL);
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature, ...latest });
    }

    stockMint = await createMint(connection, admin, admin.publicKey, null, DECIMALS);
    usdcMint = await createMint(connection, admin, admin.publicKey, null, DECIMALS);
    const aliceStock = await createAssociatedTokenAccount(connection, admin, stockMint, alice.publicKey);
    await mintTo(connection, admin, stockMint, aliceStock, admin, units(100));
    const bobUsdc = await createAssociatedTokenAccount(connection, admin, usdcMint, bob.publicKey);
    await mintTo(connection, admin, usdcMint, bobUsdc, admin, units(1_000));
    const adminUsdc = await createAssociatedTokenAccount(connection, admin, usdcMint, admin.publicKey);
    await mintTo(connection, admin, usdcMint, adminUsdc, admin, units(1_000));

    market = pda(Buffer.from("market"), stockMint.toBuffer());
    ptMint = pda(Buffer.from("pt_mint"), market.toBuffer());
    ytMint = pda(Buffer.from("yt_mint"), market.toBuffer());

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

    await program.methods
      .strip(new BN(units(100)))
      .accountsPartial({
        user: alice.publicKey,
        market,
        underlyingMint: stockMint,
        ptMint,
        ytMint,
        userUnderlying: aliceStock,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([alice])
      .rpc();
  });

  it("lists YT for sale with the tokens held in escrow", async () => {
    await createOffer(alice, 1, ytMint, units(40), units(2.5));

    const offer = await program.account.offer.fetch(offerAddress(alice.publicKey, 1));
    expect(offer.maker.toBase58()).to.equal(alice.publicKey.toBase58());
    expect(offer.tokenMint.toBase58()).to.equal(ytMint.toBase58());
    expect(offer.quoteMint.toBase58()).to.equal(usdcMint.toBase58());
    expect(offer.amount.toNumber()).to.equal(units(40));
    expect(offer.price.toNumber()).to.equal(units(2.5));
    expect(await balance(escrowAddress(offerAddress(alice.publicKey, 1)))).to.equal(units(40));
    expect(await balance(ata(ytMint, alice.publicKey))).to.equal(units(60));
  });

  it("only lists this market's PT or YT", async () => {
    const stockOffer = offerAddress(alice.publicKey, 99);
    await expectError(
      program.methods
        .createOffer(new BN(99), new BN(units(1)), new BN(units(1)))
        .accountsPartial({
          maker: alice.publicKey,
          market,
          tokenMint: stockMint,
          offer: stockOffer,
          escrow: escrowAddress(stockOffer),
          makerToken: ata(stockMint, alice.publicKey),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([alice])
        .rpc(),
      "InvalidOfferToken"
    );
  });

  it("fills part of an offer, paying the seller at the listed price", async () => {
    await fillOffer(bob, alice.publicKey, 1, ytMint, units(10), units(2.5));

    expect(await balance(ata(ytMint, bob.publicKey))).to.equal(units(10));
    expect(await balance(ata(usdcMint, bob.publicKey))).to.equal(units(975));
    expect(await balance(ata(usdcMint, alice.publicKey))).to.equal(units(25));
    const offer = await program.account.offer.fetch(offerAddress(alice.publicKey, 1));
    expect(offer.amount.toNumber()).to.equal(units(30));
  });

  it("rejects a fill at a price the buyer didn't expect", async () => {
    await expectError(fillOffer(bob, alice.publicKey, 1, ytMint, units(1), units(2)), "OfferPriceChanged");
  });

  it("rejects buying more than is left", async () => {
    await expectError(
      fillOffer(bob, alice.publicKey, 1, ytMint, units(31), units(2.5)),
      "InsufficientOfferAmount"
    );
  });

  it("closes a sold-out offer and refunds its rent to the seller", async () => {
    const offer = offerAddress(alice.publicKey, 1);
    const before = await connection.getBalance(alice.publicKey);
    await fillOffer(bob, alice.publicKey, 1, ytMint, units(30), units(2.5));

    expect(await balance(ata(ytMint, bob.publicKey))).to.equal(units(40));
    expect(await balance(ata(usdcMint, alice.publicKey))).to.equal(units(100));
    expect(await connection.getAccountInfo(offer)).to.equal(null);
    expect(await connection.getAccountInfo(escrowAddress(offer))).to.equal(null);
    expect(await connection.getBalance(alice.publicKey)).to.be.greaterThan(before);
  });

  it("lets the buyer lock bought YT and earn the next dividend", async () => {
    await program.methods
      .lockYt(new BN(units(40)))
      .accountsPartial({
        user: bob.publicKey,
        market,
        underlyingMint: stockMint,
        ytMint,
        userYt: ata(ytMint, bob.publicKey),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([bob])
      .rpc();
    await program.methods
      .distributeDividend(new BN(units(8)))
      .accountsPartial({
        admin: admin.publicKey,
        market,
        dividendMint: usdcMint,
        adminDividend: ata(usdcMint, admin.publicKey),
        dividendTokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    await program.methods
      .claimYield()
      .accountsPartial({
        user: bob.publicKey,
        market,
        dividendMint: usdcMint,
        dividendTokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([bob])
      .rpc();

    // Bob paid 100 USDC for 40 YT and holds all locked YT, so he receives the
    // whole 8 USDC payout. Alice kept her PT.
    expect(await balance(ata(usdcMint, bob.publicKey))).to.equal(units(908));
    expect(await balance(ata(ptMint, alice.publicKey))).to.equal(units(100));
  });

  it("lets only the maker cancel, returning unsold tokens", async () => {
    await createOffer(alice, 2, ptMint, units(20), units(95));
    await expectError(cancelOffer(bob, alice.publicKey, 2, ptMint), "ConstraintHasOne");

    await cancelOffer(alice, alice.publicKey, 2, ptMint);
    const offer = offerAddress(alice.publicKey, 2);
    expect(await balance(ata(ptMint, alice.publicKey))).to.equal(units(100));
    expect(await connection.getAccountInfo(offer)).to.equal(null);
    expect(await connection.getAccountInfo(escrowAddress(offer))).to.equal(null);
  });
});
