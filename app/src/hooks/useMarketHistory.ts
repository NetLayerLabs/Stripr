"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/components/NetworkProvider";
import type { MarketEvent } from "@/lib/analytics";

export function useMarketHistory(address: string | undefined) {
  const { cluster } = useNetwork();
  return useQuery({
    queryKey: ["history", cluster, address],
    queryFn: async () => {
      const response = await fetch(`/api/markets/${address}/history?cluster=${cluster}`);
      if (!response.ok) throw new Error("Market history is unavailable.");
      return (await response.json()) as MarketEvent[];
    },
    enabled: Boolean(address),
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  });
}
