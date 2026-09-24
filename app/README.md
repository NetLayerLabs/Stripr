# Stripr app

The Next.js 14 frontend for [Stripr](../README.md), live at [stripr.xyz](https://stripr.xyz).

## Run it

```bash
npm install
cp .env.example .env.local
npm run dev                # http://localhost:3000
```

Every setting is documented in [`.env.example`](.env.example): the default network, RPC providers, the devnet faucet key and the optional Pyth key. Keys stay server-side; none of them is prefixed `NEXT_PUBLIC_`.

## Layout

```
src/app/                  Pages: landing, markets dashboard, market pages
src/app/api/prices        Pyth for the underlying stock, Jupiter for every xStock
src/app/api/dividends     Each xStock's latest dividend, read from its mint's multiplier
src/app/api/markets       Market history decoded from the program's own events
src/app/api/rpc           RPC proxy, so the provider key never reaches the browser
src/app/api/faucet        Devnet faucet: test stock, demo USDC and a little SOL
src/components/           UI, the transaction modal and the network provider
src/config/               Deployed tokens per network and the Pyth feed map
src/idl/                  The program's IDL and types (npm run idl:sync from the root)
```

## Checks

```bash
npx tsc --noEmit
npm run lint
npm run build
```
