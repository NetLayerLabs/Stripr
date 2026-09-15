"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/components/NetworkProvider";
import { fetchMarkets } from "@/lib/stripr";

export function useMarkets() {
  const { connection } = useConnection();
  const { cluster } = useNetwork();
  return useQuery({
    queryKey: ["markets", cluster, connection.rpcEndpoint],
    queryFn: () => fetchMarkets(connection, cluster),
    refetchInterval: 20_000,
  });
}
