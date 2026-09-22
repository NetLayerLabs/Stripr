import { CircleCheck, CircleDashed, CircleDot } from "lucide-react";
import { cn } from "@/lib/cn";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

type Status = "done" | "active" | "planned";

const PHASES: Array<{ phase: string; title: string; items: Array<{ status: Status; text: string }> }> = [
  {
    phase: "Now",
    title: "Hackathon build",
    items: [
      { status: "done", text: "Anchor program: strip, redeem, lock, unlock, distribute, claim" },
      { status: "done", text: "O(1) pro-rata dividend index with unit-tested solvency" },
      { status: "done", text: "Web app with wallet connect, live positions and admin payouts" },
      { status: "done", text: "YT earns reinvested dividends from the xStocks Scaled UI Amount multiplier" },
      { status: "done", text: "On-chain offer book to sell future dividends (YT) or principal (PT) for USDC" },
      { status: "done", text: "End-to-end tests with a real AAPLx market and an xStock-like Token-2022 mint" },
      { status: "done", text: "Devnet markets with on-chain analytics and a test-token faucet" },
      { status: "done", text: "Network switch between Devnet and Mainnet in the app" },
      { status: "done", text: "Deployed on Solana mainnet with the real AAPLx xStocks market" },
    ],
  },
  {
    phase: "Next",
    title: "More markets",
    items: [
      { status: "active", text: "More mainnet markets (SPYx, NVDAx, TSLAx, MSFTx)" },
      { status: "planned", text: "Permissionless keeper that syncs multipliers when issuers update them" },
    ],
  },
  {
    phase: "Later",
    title: "Yield markets",
    items: [
      { status: "planned", text: "Maturity-dated PT and YT series" },
      { status: "planned", text: "PT/YT AMM with an implied dividend yield" },
      { status: "planned", text: "Independent security audit" },
    ],
  },
];

const STATUS_ICON = {
  done: { icon: CircleCheck, className: "text-emerald-400", label: "Done" },
  active: { icon: CircleDot, className: "text-amber-300", label: "In progress" },
  planned: { icon: CircleDashed, className: "text-zinc-600", label: "Planned" },
};

export function Roadmap() {
  return (
    <Section
      id="roadmap"
      eyebrow="Roadmap"
      title="From hackathon primitive to a market for stock yield."
      description="What ships today, and what it takes to bring Stripr to real tokenized stocks on mainnet."
    >
      <ol className="grid gap-4 lg:grid-cols-3">
        {PHASES.map((phase, index) => (
          <Reveal
            as="li"
            key={phase.phase}
            delay={index * 0.1}
            className={cn("card card-interactive p-6", index === 0 && "border-emerald-400/20")}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  index === 0 ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.06] text-zinc-400"
                )}
              >
                {index === 0 ? (
                  <span aria-hidden className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emerald-400 align-middle" />
                ) : null}
                {phase.phase}
              </span>
              <span className="font-mono text-xs text-zinc-600">0{index + 1}</span>
            </div>
            <h3 className="mt-4 font-display text-lg text-white">{phase.title}</h3>
            <ul className="mt-4 space-y-3">
              {phase.items.map((item) => {
                const { icon: Icon, className, label } = STATUS_ICON[item.status];
                return (
                  <li key={item.text} className="flex gap-3 text-sm leading-relaxed text-zinc-300">
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", className)} aria-label={label} />
                    {item.text}
                  </li>
                );
              })}
            </ul>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
