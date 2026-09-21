import { Blocks, Building2, Zap } from "lucide-react";
import { DividendLedger } from "./DividendLedger";
import { LiveXStock } from "./LiveXStock";
import { Section } from "./Section";

const REASONS = [
  {
    icon: Zap,
    title: "Payouts that scale with holders, not fees",
    body: "A dividend reaches every locked YT through one index update in one transaction. With sub-cent fees, even small, frequent payouts are worth distributing.",
  },
  {
    icon: Building2,
    title: "Tokenized stocks already live here",
    body: "Issuers like xStocks mint tokenized equities on Solana with Token-2022 extensions, so the assets Stripr is designed for are native to the chain.",
  },
  {
    icon: Blocks,
    title: "Composable by default",
    body: "Strip and lock settle atomically in a single transaction, and PT and YT are plain SPL tokens that wallets, DEXs and lending markets already understand.",
  },
];

export function WhySolana() {
  return (
    <Section
      id="solana"
      eyebrow="Why Solana"
      title="Corporate actions need a chain where every holder is cheap to reach."
      description="Dividends touch every holder of a stock. Solana makes that practical on-chain, and the tokenized stocks are already here."
      tinted
    >
      <div className="mb-6">
        <DividendLedger />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-4">
          {REASONS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card flex gap-5 p-6">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
                <Icon className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
              </div>
            </div>
          ))}
        </div>
        <LiveXStock />
      </div>
    </Section>
  );
}
