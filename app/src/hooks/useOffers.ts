"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/components/NetworkProvider";
import { fetchAllOffers, fetchOffers, type MarketView } from "@/lib/stripr";

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

/** Every market's open offers, keyed by market address, for the dashboard. */
export function useOffersByMarket() {
  const { connection } = useConnection();
  const { cluster } = useNetwork();
  return useQuery({
    queryKey: ["offers", cluster, "all"],
    queryFn: () => fetchAllOffers(connection, cluster),
    refetchInterval: 30_000,
  });
}
