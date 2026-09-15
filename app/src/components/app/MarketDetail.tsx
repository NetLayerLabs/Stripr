"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useMarkets } from "@/hooks/useMarkets";
import { usePosition } from "@/hooks/usePosition";
import { useStriprActions } from "@/hooks/useStriprActions";
import { ActionPanel } from "./ActionPanel";
import { AdminCard } from "./AdminCard";
import { MarketAnalytics } from "./MarketAnalytics";
import { MarketHeader, MarketStats } from "./MarketOverview";
import { PositionCard } from "./PositionCard";
import { DashboardSkeleton, ErrorState } from "./States";

export function MarketDetail({ address }: { address: string }) {
  const markets = useMarkets();
  const { publicKey } = useWallet();
  const market = markets.data?.find((candidate) => candidate.address.toBase58() === address);
  const position = usePosition(market);
  const actions = useStriprActions(market);
  const isAdmin = Boolean(publicKey && market?.account.admin.equals(publicKey));

  if (markets.isPending) return <DashboardSkeleton />;
  if (markets.isError) return <ErrorState onRetry={() => void markets.refetch()} />;
  if (!market) {
    return (
      <div className="card mx-auto max-w-lg px-6 py-12 text-center">
        <h1 className="text-lg font-semibold text-white">Market not found</h1>
        <p className="mt-2 text-sm text-zinc-500">There is no Stripr market at this address on this cluster.</p>
        <Link href="/app" className="btn-secondary mt-6 h-10 px-5">
          Back to markets
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300">
        <ArrowLeft className="h-4 w-4" />
        All markets
      </Link>
      <MarketHeader markets={[market]} market={market} onSelect={() => {}} />
      <MarketStats market={market} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <ActionPanel key={address} market={market} position={position.data} actions={actions} />
        <div className="space-y-6">
          <PositionCard market={market} position={position.data} actions={actions} />
          {isAdmin ? <AdminCard market={market} position={position.data} actions={actions} /> : null}
        </div>
      </div>
      <MarketAnalytics market={market} />
    </div>
  );
}
