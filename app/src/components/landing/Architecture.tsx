import { Gauge, Layers, Scale, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { Section } from "./Section";

const INSTRUCTIONS = [
  { name: "initialize_market", signer: "Admin", body: "Creates the market, PT and YT mints, and all three vaults." },
  { name: "strip", signer: "User", body: "Deposits stock and mints equal PT + YT in share units." },
  { name: "redeem", signer: "User", body: "Burns equal PT + YT and releases the stock." },
  { name: "lock_yt", signer: "User", body: "Moves YT into escrow and starts earning." },
  { name: "unlock_yt", signer: "User", body: "Returns YT; earned dividends stay claimable." },
  { name: "sync_multiplier", signer: "Anyone", body: "Pays reinvested dividends to locked YT when the stock’s multiplier rises." },
  { name: "distribute_dividend", signer: "Admin", body: "Deposits a cash dividend and advances the dividend index." },
  { name: "claim_stock_yield", signer: "User", body: "Pays out reinvested dividends in the stock." },
  { name: "claim_yield", signer: "User", body: "Pays out cash dividends." },
  { name: "create_offer", signer: "Seller", body: "Escrows PT or YT for sale at a fixed USDC price." },
  { name: "fill_offer", signer: "Buyer", body: "Buys all or part of an offer at the price the buyer saw." },
  { name: "cancel_offer", signer: "Seller", body: "Returns unsold tokens and closes the offer." },
];

const GUARANTEES = [
  {
    icon: Gauge,
    title: "O(1) distribution",
    body: "A dividend updates one cumulative index. There is no loop over holders, so cost stays flat as the holder base grows.",
  },
  {
    icon: Scale,
    title: "Solvent by construction",
    body: "Accrual rounds down and debt rounds up, so total claims can never exceed deposits. Unit-tested across 200 rounds of uneven locks and payouts.",
  },
  {
    icon: Layers,
    title: "Always fully backed",
    body: "PT and YT are only minted against stock in the vault, in share units at the stock’s multiplier, and must be burned together to release it.",
  },
  {
    icon: ShieldCheck,
    title: "Tight access control",
    body: "Vaults, mints and offer escrows belong to program PDAs. Only the admin can pay cash dividends, only the seller can cancel an offer, and all arithmetic is checked.",
  },
];

const CODE = `// distribute_dividend: one index update, whatever the holder count
let delta = amount * ACC_PRECISION / total_yt_locked;
acc_dividend_per_yt += delta;

// settle: what a position earned since its last update
let accrued = yt_locked * acc_dividend_per_yt / ACC_PRECISION;
if accrued > dividend_debt {
    unclaimed += accrued - dividend_debt;
    dividend_debt = accrued;
}`;

function AccountBox({ name, seeds, detail, accent }: { name: string; seeds?: string; detail: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        accent ? "border-emerald-400/25 bg-emerald-400/[0.05]" : "border-white/[0.07] bg-ink-950/60"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-medium text-white">{name}</span>
        {seeds ? <span className="font-mono text-[11px] text-zinc-500">{seeds}</span> : null}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">{detail}</p>
    </div>
  );
}

function Connector({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2 pl-6">
      <span className="h-6 w-px bg-gradient-to-b from-emerald-400/50 to-white/10" />
      <span className="label">{label}</span>
    </div>
  );
}

export function Architecture() {
  return (
    <Section
      id="technology"
      eyebrow="Under the hood"
      title="A single Anchor program, designed to be boring in the best way."
      description="Every account is a PDA, every vault is program-owned, and every payout costs the same no matter how many people hold YT."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6 sm:p-8">
          <p className="label">Accounts</p>
          <div className="mt-4">
            <AccountBox
              accent
              name="Market"
              seeds={'["market", stock_mint]'}
              detail="One per stock. Stores the admin, the mints, the stock’s multiplier and both dividend indexes, and signs for every vault."
            />
            <Connector label="owns" />
            <div className="grid gap-2 sm:grid-cols-3">
              <AccountBox name="Stock vault" detail="Deposited shares" />
              <AccountBox name="YT escrow" detail="Locked YT" />
              <AccountBox name="Dividend vault" detail="USDC payouts" />
            </div>
            <Connector label="mint authority" />
            <div className="grid gap-2 sm:grid-cols-2">
              <AccountBox name="PT mint" detail="Principal tokens" />
              <AccountBox name="YT mint" detail="Yield tokens" />
            </div>
            <div className="my-5 border-t border-dashed border-white/10" />
            <AccountBox
              name="YieldPosition"
              seeds={'["position", market, user]'}
              detail="One per user and market: locked YT, plus earned and claimed cash and stock dividends."
            />
            <div className="mt-2">
              <AccountBox
                name="Offer"
                seeds={'["offer", market, seller, id]'}
                detail="One per listing: PT or YT for sale, its price and what’s left. Its own escrow holds the tokens."
              />
            </div>
          </div>
        </div>

        <div className="card p-6 sm:p-8">
          <p className="label">Instructions</p>
          <ul className="mt-4 divide-y divide-white/[0.05]">
            {INSTRUCTIONS.map((instruction) => (
              <li key={instruction.name} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <code className="font-mono text-sm text-white">{instruction.name}</code>
                  <p className="mt-0.5 text-xs text-zinc-400">{instruction.body}</p>
                </div>
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    instruction.signer === "Admin"
                      ? "border-amber-300/20 bg-amber-300/10 text-amber-200"
                      : "border-white/10 bg-white/[0.04] text-zinc-400"
                  )}
                >
                  {instruction.signer}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-3">
            <span className="text-sm font-medium text-white">Dividend accounting</span>
            <span className="font-mono text-[11px] text-zinc-500">state.rs</span>
          </div>
          <pre className="flex-1 overflow-x-auto p-6 font-mono text-[13px] leading-6">
            <code>
              {CODE.split("\n").map((line, index) => (
                <span
                  key={index}
                  className={cn("block", line.trim().startsWith("//") ? "text-zinc-500" : "text-zinc-200")}
                >
                  {line || " "}
                </span>
              ))}
            </code>
          </pre>
          <p className="border-t border-white/[0.06] px-6 py-3 text-xs text-zinc-500">
            Simplified from <code className="font-mono">programs/stripr/src/state.rs</code>, which uses checked u128
            math.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {GUARANTEES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card flex gap-4 p-5">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              <div>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
