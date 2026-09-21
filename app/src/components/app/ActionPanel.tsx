"use client";

import { useState } from "react";
import { Segmented } from "@/components/ui";
import type { StriprActions } from "@/hooks/useStriprActions";
import type { MarketView, PositionView } from "@/lib/stripr";
import { EarnForm, RedeemForm, StripForm } from "./forms";

const TABS = [
  { value: "strip", label: "Strip" },
  { value: "redeem", label: "Redeem" },
  { value: "earn", label: "Earn" },
] as const;

type Tab = (typeof TABS)[number]["value"];

const COPY: Record<Tab, { title: string; description: string }> = {
  strip: {
    title: "Strip a stock",
    description: "Deposit the stock and receive equal amounts of PT and YT.",
  },
  redeem: {
    title: "Redeem the stock",
    description: "Return PT and YT together to withdraw the underlying.",
  },
  earn: {
    title: "Earn dividends",
    description: "Lock YT to collect every payout. Unlock whenever you like.",
  },
};

export function ActionPanel({
  market,
  position,
  actions,
}: {
  market: MarketView;
  position: PositionView | undefined;
  actions: StriprActions;
}) {
  const [tab, setTab] = useState<Tab>("strip");
  const props = { market, position, actions };

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg text-white">{COPY[tab].title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{COPY[tab].description}</p>
        </div>
        <Segmented options={TABS} value={tab} onChange={setTab} />
      </div>
      <div className="mt-6">
        {tab === "strip" ? <StripForm {...props} /> : null}
        {tab === "redeem" ? <RedeemForm {...props} /> : null}
        {tab === "earn" ? <EarnForm {...props} /> : null}
      </div>
    </section>
  );
}
