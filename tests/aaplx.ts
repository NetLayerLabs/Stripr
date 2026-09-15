import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getExtensionTypes,
  getMint,
} from "@solana/spl-token";
import { expect } from "chai";
import { Stripr } from "../target/types/stripr";

const { PublicKey } = anchor.web3;

// The real Apple xStock mint, copied from mainnet into tests/fixtures and
// loaded by the local validator (see [[test.validator.account]] in Anchor.toml).
// Only the issuer can mint it, so this covers market setup, not strip/redeem.
const AAPLX = new PublicKey("XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp");

describe("stripr with the real AAPLx mint", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.stripr as Program<Stripr>;
  const admin = (provider.wallet as anchor.Wallet).payer;
  const pda = (...seeds: Buffer[]) => PublicKey.findProgramAddressSync(seeds, program.programId)[0];

  it("opens a market with Token-2022 vaults sized for the mint's extensions", async () => {
    const usdc = await createMint(provider.connection, admin, admin.publicKey, null, 6);

    await program.methods
      .initializeMarket()
      .accountsPartial({
        admin: admin.publicKey,
        underlyingMint: AAPLX,
        dividendMint: usdc,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        dividendTokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    // Read back at the connection's commitment, the same level `.rpc()` confirmed at.
    const market = pda(Buffer.from("market"), AAPLX.toBuffer());
    const vault = await getAccount(
      provider.connection,
      pda(Buffer.from("underlying_vault"), market.toBuffer()),
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    expect(vault.mint.toBase58()).to.equal(AAPLX.toBase58());
    expect(vault.owner.toBase58()).to.equal(market.toBase58());
    const extensions = getExtensionTypes(vault.tlvData).map((type) => ExtensionType[type]);
    expect(extensions).to.include("PausableAccount");

    const ptMint = await getMint(
      provider.connection,
      pda(Buffer.from("pt_mint"), market.toBuffer()),
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    expect(ptMint.decimals).to.equal(8);
    expect(ptMint.mintAuthority?.toBase58()).to.equal(market.toBase58());
  });
});
