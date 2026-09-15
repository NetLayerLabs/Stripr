import { ArrowDownToLine, Coins, HandCoins, Lock } from "lucide-react";
import { DividendCalculator } from "./DividendCalculator";
import { Section } from "./Section";

const STEPS = [
  {
    icon: ArrowDownToLine,
    instruction: "strip",
    title: "Strip the stock",
    body: "Deposit AAPL. The program holds it in a vault it controls and mints equal amounts of PT-AAPL and YT-AAPL to your wallet.",
  },
  {
    icon: Lock,
    instruction: "lock_yt",
    title: "Lock YT to earn",
    body: "Move YT into escrow to start earning. The app bundles strip and lock into a single transaction, and you can unlock any time.",
  },
  {
    icon: Coins,
    instruction: "distribute_dividend",
    title: "A dividend lands",
    body: "When the company pays out, the market admin deposits the USDC. Every locked YT is credited instantly, in one transaction, however many holders there are.",
  },
  {
    icon: HandCoins,
    instruction: "claim_yield · redeem",
    title: "Claim or redeem",
    body: "Claim your USDC whenever you like. Return equal PT and YT to withdraw the stock; dividends you earned stay claimable.",
  },
];

export function HowItWorks() {
  return (
    <Section
      id="how"
      eyebrow="How it works"
      title="One stock in. Two tokens out. Dividends on autopilot."
      description="Every step is a single Solana transaction, and every PT and YT is backed 1:1 by the stock held in the vault."
      tinted
    >
      <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, instruction, title, body }, index) => (
          <li key={title} className="card flex flex-col p-6">
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06]">
                <Icon className="h-5 w-5 text-emerald-300" />
              </div>
              <span className="font-mono text-xs text-zinc-600">0{index + 1}</span>
            </div>
            <h3 className="mt-5 font-semibold text-white">{title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">{body}</p>
            <code className="mt-5 self-start rounded-md border border-white/[0.07] bg-ink-950/70 px-2 py-1 font-mono text-[11px] text-zinc-400">
              {instruction}
            </code>
          </li>
        ))}
      </ol>
      <DividendCalculator />
    </Section>
  );
}
