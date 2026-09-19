# Mainnet runbook

Verified 2026-09-19 against mainnet RPC quotes. Program id `9wpHmYvuq7qrAuH4VV3LyC54d2VyTYFMfveMMph2nzZF`, deployer `3EGKfA8W2ocah3Gusox5JRfoN5WVAgXw9hubgyBGXvSy` (`~/.config/solana/stripr-mainnet-deployer.json`).

## Cost (size-optimized build, 384,928 bytes)

| Item | SOL |
|---|---|
| Program data rent (refundable on `solana program close`) | 1.95631308 |
| Program account | 0.00083312 |
| Five markets (AAPLx, SPYx, TSLAx, NVDAx, MSFTx) at 0.00860552 each | 0.0430276 |
| Fees and buffer (~380 write transactions with a priority fee) | ~0.05 |
| **Fund the deployer with** | **≥ 2.1 SOL** (2.3 for headroom) |

Re-quote after any rebuild: `solana rent $(( $(stat -f %z target/deploy/stripr.so) + 45 )) -u mainnet-beta`.

## Before spending anything

1. `export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.avm/bin:$HOME/.cargo/bin:$PATH"`
2. `export MAINNET_RPC_URL="https://mainnet.helius-rpc.com/?api-key=<key>"` — a dedicated RPC; the public endpoint drops the deploy's write transactions.
3. `solana --version` must be 4.x (not 2.1.0); `anchor --version` 1.2.0.
4. Both keys are backed up in `~/.config/solana/backups/` (mode 600). Copy them somewhere offline too.
5. `solana address -k target/deploy/stripr-keypair.json` → `9wpHm…nzZF`; `solana balance 3EGKfA8W2ocah3Gusox5JRfoN5WVAgXw9hubgyBGXvSy -u "$MAINNET_RPC_URL"` ≥ 2.1.
6. `solana feature status B8JJXCy5amZyWG9r7EnUYLwzXSXTxG7GZ1qZ1qggo83g -u mainnet-beta` must be inactive (SBPF v2 still deployable); if active, build with `ANCHOR_BUILD_SBF_ARCH=v3`.

## Deploy

1. `npm run build:program && stat -f %z target/deploy/stripr.so && shasum -a 256 target/deploy/stripr.so` — record size and hash.
2. `npm run deploy:mainnet` — builds, then `anchor program deploy --no-idl --use-rpc` through `$MAINNET_RPC_URL` with a priority fee and 20 sign attempts. No IDL upload (the app bundles it; ~0.025 SOL to add later with `anchor idl init`).
3. `solana program show 9wpHmYvuq7qrAuH4VV3LyC54d2VyTYFMfveMMph2nzZF -u "$MAINNET_RPC_URL"` — Authority must be the deployer, Data Length must equal the recorded size.
4. `solana program dump 9wpHm…nzZF /tmp/mainnet.so -u "$MAINNET_RPC_URL"` and compare its hash with step 1.
5. `solana program show --buffers --buffer-authority 3EGKfA8W2ocah3Gusox5JRfoN5WVAgXw9hubgyBGXvSy -u "$MAINNET_RPC_URL"` must be empty. If a deploy died mid-way: resume with `--buffer <keypair>` or reclaim rent with `solana program close --buffers -k ~/.config/solana/stripr-mainnet-deployer.json -u "$MAINNET_RPC_URL"`.
6. **Immediately** open the real markets, before announcing the program (initialize_market is permissionless, so the addresses can be squatted): `DRY_RUN=1 npm run open:mainnet:markets` to review the plan, then `DRY_RUN=0 npm run open:mainnet:markets`.
7. `npm run idl:sync`, set `NEXT_PUBLIC_SOLANA_CLUSTER`/`MAINNET_RPC_URL` for the hosted app, and update the landing copy that says mainnet is planned (Faq, AtAGlance, Roadmap).
8. Before every app deploy: `npm run snapshot:devnet` (and a mainnet snapshot once markets have history) so the hosted charts paint from the committed snapshot instead of crawling the RPC.

## After the hackathon

`solana program close 9wpHmYvuq7qrAuH4VV3LyC54d2VyTYFMfveMMph2nzZF -k ~/.config/solana/stripr-mainnet-deployer.json --recipient <wallet> -u "$MAINNET_RPC_URL"` returns the program deposit. Redeem every position first: closing makes vault contents unreachable, and the program id cannot be redeployed.

## Optional hardening

- Move upgrade authority off the hot key: `solana program set-upgrade-authority 9wpHm…nzZF -k ~/.config/solana/stripr-mainnet-deployer.json --new-upgrade-authority <multisig or Ledger> --skip-new-upgrade-authority-signer-check -u "$MAINNET_RPC_URL"`.
- Never set `FAUCET_SECRET_KEY` on a mainnet deployment; the route refuses when `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta`.
