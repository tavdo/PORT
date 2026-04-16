import { env } from "../config/env";
import { logger } from "../utils/logger";
import type { ShipData } from "../types";

interface CacheEntry {
  data: ShipData;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export const shipCache = {
  get(imo: string): ShipData | null {
    try {
      const key = imo.trim();
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        logger.debug("Ship cache expired", { imo: key });
        return null;
      }
      logger.debug("Ship cache hit", { imo: key });
      return entry.data;
    } catch (err) {
      logger.warn("Ship cache get failed", {
        imo,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  },

  set(imo: string, data: ShipData): void {
    try {
      const key = imo.trim();
      const ttlMs = Math.max(0, env.shipCacheTtlSeconds) * 1000;
      const expiresAt = Date.now() + ttlMs;
      store.set(key, { data, expiresAt });
      logger.debug("Ship cache set", { imo: key, ttlSeconds: env.shipCacheTtlSeconds });
    } catch (err) {
      logger.warn("Ship cache set failed", {
        imo,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  clear(): void {
    store.clear();
  },
};
