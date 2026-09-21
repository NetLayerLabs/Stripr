"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/components/NetworkProvider";
import { fetchAllOffers, fetchOffers, type MarketView } from "@/lib/stripr";

export function useOffers(market: MarketView | undefined) {
  const { connection } = useConnection();
  const { cluster } = useNetwork();
  return useQuery({
    queryKey: ["offers", cluster, connection.rpcEndpoint, market?.address.toBase58()],
    queryFn: () => fetchOffers(connection, market!),
    enabled: Boolean(market),
    refetchInterval: 15_000,
  });
}

/** Every market's open offers, keyed by market address. Reuses the markets the caller already loaded. */
export function useOffersByMarket(markets: MarketView[] | undefined) {
  const { connection } = useConnection();
  const { cluster } = useNetwork();
  return useQuery({
    queryKey: ["offers", cluster, connection.rpcEndpoint, "all"],
    queryFn: () => fetchAllOffers(connection, markets!),
    enabled: Boolean(markets?.length),
    refetchInterval: 30_000,
  });
}
