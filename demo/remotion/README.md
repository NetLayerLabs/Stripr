# Stripr demo video

A 2m41s demo, rendered with [Remotion](https://remotion.dev) from real recordings of the
app. Nothing in the footage is a mockup: the wallet actions are signed and land on devnet,
and the mainnet screens read the chain.

## How it fits together

| Stage | Command | What it does |
|---|---|---|
| Narration | `npm run vo` | Twelve lines to ElevenLabs, written to `public/vo/`. The key is read from an env file outside this repo, never committed. |
| Signer | `node scripts/signer.mjs` | Holds the devnet keypair in node and signs and submits what the page asks for. |
| Capture | `npm run capture` | Drives the running app with Playwright, one beat at a time, into `public/clips/`. |
| Manifest | `npm run clips` | Measures every clip and voice file into `src/media.json`, so the edit re-times itself. |
| Render | `npm run render` | 1920x1080 H.264 to `out/stripr-demo.mp4`. |

## The wallet

The app finds wallets through the Wallet Standard, so the capture registers one of its own
(`scripts/wallet-inject.mjs`) and routes every signature to `scripts/signer.mjs`. The key
stays in node and never enters the browser. Nothing in the app is stubbed: the strip beat
claims the faucet and sends a real devnet transaction.

## Running it

```bash
npm install
npm run vo                                  # once, or after editing narration
node scripts/signer.mjs &                   # port 8975
cd ../../app && npm run dev -- -p 4317 &    # the app under test
npm run capture                             # all beats, or BEAT=strip npm run capture
npm run clips && npm run render
```

Capture needs the dev server on `http://localhost:4317` and a devnet wallet with SOL; the
faucet in the app tops up the stock and demo USDC.

## Editing

`SECTIONS` in `src/Stripr.tsx` maps each narration file to the recording it describes,
with `from` to skip a clip's preamble and a caption. Durations come from `src/media.json`,
so re-recording a line or a beat re-times the video without touching the edit.
