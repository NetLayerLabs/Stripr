"use client";

import { TriangleAlert } from "lucide-react";
import { useNetwork } from "@/components/NetworkProvider";

export function MainnetNotice() {
  const { cluster } = useNetwork();
  if (cluster !== "mainnet-beta") return null;

  return (
    <div className="border-b border-amber-300/15 bg-amber-300/[0.06]">
      <p className="mx-auto flex max-w-page items-start gap-2.5 px-4 py-3 text-xs leading-relaxed text-amber-100/90 sm:px-6">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
        <span>
          You’re on Solana Mainnet with real assets. Stripr hasn’t been audited, and xStocks issuers can pause
          transfers or move tokens held in any account, including Stripr’s vaults. xStocks aren’t offered in some
          jurisdictions, including the US. Only use amounts you can afford to lose.
        </span>
      </p>
    </div>
  );
}
