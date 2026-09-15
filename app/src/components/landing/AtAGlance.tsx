const ITEMS = [
  {
    label: "Problem",
    body: "Tokenized stocks bundle price and income into one token. On-chain investors can’t hold, move or value a stock’s dividends on their own.",
  },
  {
    label: "Solution",
    body: "Strip each share into a Principal Token and a Yield Token, backed by stock in a program-owned vault. Locked YT earns every dividend, and holders can sell future dividends for USDC on-chain.",
  },
  {
    label: "How it’s built",
    body: "One Anchor 1.2 program with 12 instructions: PDA-owned vaults, O(1) dividend accounting that reads the xStocks multiplier, and a PT/YT offer book, plus a Next.js app.",
  },
  {
    label: "Status",
    body: "Live on Devnet with five demo markets and order books. 19 end-to-end and 8 unit tests pass, including the real AAPLx mint. Not yet audited.",
  },
];

export function AtAGlance() {
  return (
    <section aria-labelledby="at-a-glance" className="mx-auto max-w-page px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
        <div className="border-b border-white/[0.07] bg-ink-900/80 px-6 py-4">
          <h2 id="at-a-glance" className="text-sm font-semibold text-white">
            Stripr at a glance
          </h2>
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
