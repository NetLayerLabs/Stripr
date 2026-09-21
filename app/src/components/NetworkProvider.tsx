"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CLUSTER_LABELS,
  DEFAULT_CLUSTER,
  explorerAddressUrl,
  explorerTxUrl,
  parseCluster,
  type Cluster,
} from "@/lib/config";

type NetworkApi = {
  cluster: Cluster;
  label: string;
  setCluster: (cluster: Cluster) => void;
  txUrl: (signature: string) => string;
  addressUrl: (address: string) => string;
};

const NetworkContext = createContext<NetworkApi | null>(null);
const STORAGE_KEY = "stripr:network";

export function useNetwork() {
  const api = useContext(NetworkContext);
  if (!api) throw new Error("useNetwork must be used inside NetworkProvider");
  return api;
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [cluster, setClusterState] = useState<Cluster>(DEFAULT_CLUSTER);

  // A ?network= link wins over the visitor's last choice.
  useEffect(() => {
    const fromUrl = parseCluster(new URLSearchParams(window.location.search).get("network"));
    let stored: Cluster | null = null;
    try {
      stored = parseCluster(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      // Storage can be unavailable (private mode); fall back to the default.
    }
    const initial = fromUrl ?? stored;
    if (!initial) return;
    setClusterState(initial);
    // A shared ?network= link should still hold after a refresh.
    if (fromUrl) {
      try {
        window.localStorage.setItem(STORAGE_KEY, fromUrl);
      } catch {
        // Not persisted; the link still applies for this visit.
      }
    }
  }, []);

  const setCluster = useCallback((next: Cluster) => {
    setClusterState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not persisted; the choice still applies for this visit.
    }
    const url = new URL(window.location.href);
    if (url.searchParams.has("network")) {
      url.searchParams.set("network", next);
      window.history.replaceState(null, "", url);
    }
  }, []);

  const api = useMemo(
    () => ({
      cluster,
      label: CLUSTER_LABELS[cluster],
      setCluster,
      txUrl: (signature: string) => explorerTxUrl(signature, cluster),
      addressUrl: (address: string) => explorerAddressUrl(address, cluster),
    }),
    [cluster, setCluster]
  );

  return <NetworkContext.Provider value={api}>{children}</NetworkContext.Provider>;
}
