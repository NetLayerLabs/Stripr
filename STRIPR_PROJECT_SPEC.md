# 🏆 STRIPR - Pendle for Tokenized Stocks (Yield Stripping Protocol)

> **Stocklana Hackathon Submission ($100,000 Prize Pool)**  
> **Host:** Solana Foundation & Colosseum (`hackathons.solana.com/hackathons/stocklana`)  
> **Target:** 🥇 1st Place  
> **Deadline:** September 18, 2026  
> **Category:** Credit and Yield  
> **Core Tech Stack:** Solana, Anchor (Rust), SPL Token, Next.js 14, Tailwind CSS  
> **License:** Apache 2.0 Open Source  
> **Author:** mrnetwork (NetLayer Labs)  

---

## 📌 Executive Summary

**Stripr** is a decentralized yield-stripping protocol for tokenized dividend-paying stocks on Solana. 

Taking inspiration from Pendle Finance, Stripr allows users to deposit tokenized stocks (e.g., AAPL) and splits them into two separate SPL tokens:
1. **Principal Token (PT-AAPL):** Represents the underlying stock asset.
2. **Yield Token (YT-AAPL):** Represents the right to claim all future USDC dividend distributions from the underlying stock.

By separating principal from yield, Stripr introduces a massive new DeFi primitive for Real World Assets (RWAs). Users can speculate on dividend yields without price exposure, or buy discounted principal stocks. 

---

## 🏗️ Solana Architecture (Anchor)

### The Vaults (PDAs)
- **Asset Vault:** Holds the underlying tokenized stock (SPL AAPL).
- **Dividend Vault:** Holds the USDC dividend payouts.

### Core Instructions
1. `strip_stock(amount)`: User deposits AAPL into the Asset Vault. Protocol mints 1 `PT-AAPL` and 1 `YT-AAPL` to the user.
2. `distribute_dividend(amount)`: An admin/oracle deposits USDC into the Dividend Vault when a corporate action (dividend) occurs.
3. `claim_yield()`: Users holding `YT-AAPL` can burn/lock their tokens to claim their pro-rata share of the USDC dividend pool.

---

## 🚀 Frontend Dashboard (Next.js)

A mobile-first, highly polished consumer Web3 application.
- **Theme:** Obsidian & Emerald (Glassmorphism, institutional grade).
- **Actions:** 
  - Connect Solana Wallet (Wallet Adapter).
  - Deposit SPL stocks and view PT/YT balances.
  - Track USDC dividend accrual and execute claims.

---

## 📄 Hackathon Submission Requirements
- Real user & problem identified (Capital efficiency & yield trading).
- Working end-to-end demo (Next.js app + Solana Localnet/Devnet).
- Reason it belongs on Solana: High-frequency corporate actions and micro-dividend distributions require sub-cent fees.
