import { getDb } from "../db/database";
import { logger } from "../utils/logger";

/** Optional formula variables stored in DB (merged on top of batumi-tanker.json). */
export const PRICING_EXTRA_KEYS = ["cargoPerTnUsd", "lengthAdjustmentPerMUsd", "customFlatFeeUsd"] as const;

export function getPricingOverrides(): Record<string, number> {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT key, value_json FROM pricing_config").all() as Array<{ key: string; value_json: string }>;
    const out: Record<string, number> = {};
    for (const r of rows) {
      try {
        const parsed = JSON.parse(r.value_json) as unknown;
        if (typeof parsed === "number" && Number.isFinite(parsed)) {
          out[r.key] = parsed;
        }
      } catch {
        logger.warn("Invalid pricing_config row", { key: r.key });
      }
    }
    return out;
  } catch (err) {
    logger.warn("getPricingOverrides failed", { error: err instanceof Error ? err.message : String(err) });
    return {};
  }
}

export function listPricingConfig(): Array<{ key: string; value: number; updatedAt: string }> {
  const db = getDb();
  const rows = db
    .prepare("SELECT key, value_json, updated_at FROM pricing_config ORDER BY key")
    .all() as Array<{ key: string; value_json: string; updated_at: string }>;
  return rows.map((r) => ({
    key: r.key,
    value: Number(JSON.parse(r.value_json)),
    updatedAt: r.updated_at,
  }));
}

export function upsertPricingConfig(entries: Record<string, number>): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO pricing_config (key, value_json, updated_at) VALUES (@key, @value_json, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')`,
  );
  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(entries)) {
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      stmt.run({ key, value_json: JSON.stringify(value) });
    }
  });
  tx();
}

export function deletePricingKey(key: string): boolean {
  const db = getDb();
  const r = db.prepare("DELETE FROM pricing_config WHERE key = ?").run(key);
  return r.changes > 0;
}
