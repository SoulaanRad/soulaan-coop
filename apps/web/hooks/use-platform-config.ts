import { api } from "@/lib/trpc/client";

export type CoinConfig = {
  symbol: string;
  name: string;
  description: string;
};

const DEFAULT_COIN: CoinConfig = {
  symbol: "SC",
  name: "Soulaan Coin",
  description: "",
};

/**
 * Returns coin config (symbol, name, description) from PlatformConfig table.
 * Falls back to SC / Soulaan Coin defaults if the query hasn't resolved yet.
 */
export function useCoin(): CoinConfig {
  const { data } = api.platformConfig.getConfig.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });
  return data?.coin ?? DEFAULT_COIN;
}

export function usePlatformConfig() {
  const { data } = api.platformConfig.getConfig.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  return {
    coin: data?.coin ?? DEFAULT_COIN,
    platformName: data?.platformName ?? "Cahootz",
  };
}
