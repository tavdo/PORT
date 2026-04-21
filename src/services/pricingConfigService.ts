import { getDb } from "../db/database";
import { logger } from "../utils/logger";

/** Optional formula variables stored in DB (merged on top of batumi-tanker.json). */
export const PRICING_EXTRA_KEYS = [
  "cargoPerTnUsd",
  "lengthAdjustmentPerMUsd",
  "customFlatFeeUsd",
] as const;

/**
 * In-memory snapshot of pricing overrides.
 *
 * The disbursement engine reads this synchronously while computing tariffs;
 * we refresh it on startup and after each admin write so the hot-path never
 * blocks on a round-trip to Turso.
 */
let overridesCache: Record<string, number> = {};

export function getPricingOverrides(): Record<string, number> {
  return overridesCache;
}

export async function refreshPricingOverrides(): Promise<void> {
  try {
    const db = getDb();
    const rs = await db.execute("SELECT key, value_json FROM pricing_config");
    const next: Record<string, number> = {};
    for (const r of rs.rows as unknown as Array<{ key: string; value_json: string }>) {
      try {
        const parsed = JSON.parse(r.value_json) as unknown;
        if (typeof parsed === "number" && Number.isFinite(parsed)) {
          next[r.key] = parsed;
        }
      } catch {
        logger.warn("Invalid pricing_config row", { key: r.key });
      }
    }
    overridesCache = next;
  } catch (err) {
    logger.warn("refreshPricingOverrides failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function listPricingConfig(): Promise<
  Array<{ key: string; value: number; updatedAt: string }>
> {
  const db = getDb();
  const rs = await db.execute(
    "SELECT key, value_json, updated_at FROM pricing_config ORDER BY key",
  );
  const rows = rs.rows as unknown as Array<{
    key: string;
    value_json: string;
    updated_at: string;
  }>;
  return rows.map((r) => ({
    key: r.key,
    value: Number(JSON.parse(r.value_json)),
    updatedAt: r.updated_at,
  }));
}

export async function upsertPricingConfig(entries: Record<string, number>): Promise<void> {
  const db = getDb();
  const stmts: Array<{ sql: string; args: (string | number)[] }> = [];
  for (const [key, value] of Object.entries(entries)) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    stmts.push({
      sql: `INSERT INTO pricing_config (key, value_json, updated_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')`,
      args: [key, JSON.stringify(value)],
    });
  }
  if (stmts.length === 0) return;
  await db.batch(stmts, "write");
  await refreshPricingOverrides();
}

export async function deletePricingKey(key: string): Promise<boolean> {
  const db = getDb();
  const r = await db.execute({
    sql: "DELETE FROM pricing_config WHERE key = ?",
    args: [key],
  });
  await refreshPricingOverrides();
  return r.rowsAffected > 0;
}
