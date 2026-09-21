import Link from "next/link";
import { ProtocolStats } from "./ProtocolStats";
import { SplitDiagram } from "./SplitDiagram";

export function Hero() {
  return (
    <section className="relative isolate overflow-x-clip mx-auto grid max-w-page items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pb-24 lg:pt-24">
      <div>
        <p className="eyebrow animate-rise">Yield stripping for tokenized stocks</p>
        <h1 className="animate-rise mt-5 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
          Split a stock into its <span className="text-sky-300">principal</span> and its{" "}
          <span className="text-emerald-300">yield</span>.
        </h1>
        <p className="animate-rise mt-6 max-w-xl text-pretty text-lg leading-relaxed text-zinc-400" style={{ animationDelay: "0.12s" }}>
          xStocks pay dividends by raising a multiplier on the token. Stripr turns that into a yield you can own
          and trade: strip a stock into PT, the claim on the share, and YT, which captures every multiplier
          increase — read on-chain, no oracle, no admin.
        </p>
        <div className="animate-rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "0.2s" }}>
          <Link href="/app" className="btn-primary h-12 px-6 text-[15px]">
            Launch app
          </Link>
          <a href="#how" className="btn-secondary h-12 px-6 text-[15px]">
            See how it works
          </a>
        </div>
        <ProtocolStats />
      </div>
      <SplitDiagram />
    </section>
  );
}
