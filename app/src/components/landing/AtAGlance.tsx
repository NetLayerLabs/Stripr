const ITEMS = [
  {
    label: "Problem",
    body: "Tokenized stocks bundle price and income into one token. On-chain investors can’t hold, move or value a stock’s dividends on their own.",
  },
  {
    label: "Solution",
    body: "Strip each share into a Principal Token and a Yield Token, backed 1:1 by stock in a program-owned vault. Locked YT earns every dividend pro-rata.",
  },
  {
    label: "How it’s built",
    body: "One Anchor 1.2 program with 7 instructions, PDA-owned vaults and O(1) dividend accounting, plus a Next.js app with Solana wallet support.",
  },
  {
    label: "Status",
    body: "6 end-to-end tests passing on a local validator, including market setup on the real AAPLx mint, plus a complete web app. Not yet audited.",
  },
];

export function AtAGlance() {
  return (
    <section aria-labelledby="at-a-glance" className="mx-auto max-w-page px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] bg-ink-900/80 px-6 py-4">
          <h2 id="at-a-glance" className="text-sm font-semibold text-white">
            Stripr at a glance
          </h2>
          <span className="text-xs text-zinc-500">Stocklana Hackathon · Credit &amp; Yield track</span>
        </div>
        <dl className="grid gap-px bg-white/[0.07] md:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <div key={item.label} className="bg-ink-900 p-6">
              <dt className="label text-emerald-300/90">{item.label}</dt>
              <dd className="mt-3 text-sm leading-relaxed text-zinc-300">{item.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
