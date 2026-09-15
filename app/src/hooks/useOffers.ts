"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/components/NetworkProvider";
import { fetchOffers, type MarketView } from "@/lib/stripr";

export function useOffers(market: MarketView | undefined) {
  const { connection } = useConnection();
  const { cluster } = useNetwork();
  return useQuery({
    queryKey: ["offers", cluster, market?.address.toBase58()],
    queryFn: () => fetchOffers(connection, market!),
    enabled: Boolean(market),
    refetchInterval: 15_000,
  });
}
