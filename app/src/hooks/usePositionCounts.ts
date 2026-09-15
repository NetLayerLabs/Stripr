"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { getProgram } from "@/lib/stripr";

/** Positions that are earning or still hold unclaimed dividends, per market. */
export function usePositionCounts() {
  const { connection } = useConnection();
  return useQuery({
    queryKey: ["position-counts", connection.rpcEndpoint],
    queryFn: async () => {
      const program = getProgram(connection);
      // Current-layout positions only; ones from older program versions are skipped.
      const positions = await program.account.yieldPosition.all([
        { dataSize: program.account.yieldPosition.size },
      ]);
      const counts = new Map<string, number>();
      const holders = new Set<string>();
      for (const { account } of positions) {
        if (account.ytLocked.isZero() && account.unclaimed.isZero() && account.unclaimedStock.isZero()) continue;
        const market = account.market.toBase58();
        counts.set(market, (counts.get(market) ?? 0) + 1);
        holders.add(account.owner.toBase58());
      }
      return { counts, holders: holders.size };
    },
    refetchInterval: 30_000,
  });
}
