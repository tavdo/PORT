import "dotenv/config";
import path from "path";
import fs from "fs";
import { logger } from "../utils/logger";
import type { PricingConfig } from "../types";

function num(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  if (Number.isNaN(n)) {
    logger.warn(`Invalid number for ${key}, using fallback`, { key, fallback });
    return fallback;
  }
  return n;
}

function str(key: string, fallback: string): string {
  const v = process.env[key];
  return v !== undefined && v !== "" ? v : fallback;
}

function resolveDatabaseUrl(): string {
  const explicit =
    process.env.DATABASE_URL?.trim() || process.env.TURSO_DATABASE_URL?.trim();
  if (explicit) return explicit;

  const legacyPath = process.env.DATABASE_PATH?.trim();
  if (legacyPath) {
    const abs = path.isAbsolute(legacyPath) ? legacyPath : path.resolve(legacyPath);
    return `file:${abs.replace(/\\/g, "/")}`;
  }

  const defaultDir = path.join(process.cwd(), "data");
  try {
    fs.mkdirSync(defaultDir, { recursive: true });
  } catch {
    /* ignore */
  }
  const defaultFile = path.join(defaultDir, "port.db");
  return `file:${defaultFile.replace(/\\/g, "/")}`;
}

export const env = {
  port: num("PORT", 3000),
  nodeEnv: str("NODE_ENV", "development"),
  defaultUsdToGel: num("DEFAULT_USD_TO_GEL", 2.7),
  /** Default port stay (hours) when captain sends only IMO */
  defaultPortStayHours: num("DEFAULT_PORT_STAY_HOURS", 120),
  /** When set, defaults to VesselAPI IMO static lookup if SHIP_API_URL is omitted */
  shipApiUrl:
    process.env.SHIP_API_URL?.trim() ||
    (process.env.SHIP_API_KEY?.trim() ? "https://api.vesselapi.com/v1/vessel/{imo}?filter.idType=imo" : ""),
  shipApiKey: process.env.SHIP_API_KEY?.trim() || "",
  shipApiTimeoutMs: num("SHIP_API_TIMEOUT_MS", 8000),
  shipCacheTtlSeconds: num("SHIP_CACHE_TTL_SECONDS", 3600),
  /**
   * libSQL connection URL. Supports:
   *   - libsql://your-db.turso.io           (remote Turso, requires DATABASE_AUTH_TOKEN)
   *   - file:/absolute/path/to/port.db       (local file; used as a dev/default fallback)
   */
  databaseUrl: resolveDatabaseUrl(),
  databaseAuthToken: process.env.DATABASE_AUTH_TOKEN?.trim() || process.env.TURSO_AUTH_TOKEN?.trim() || "",
  jwtSecret: process.env.JWT_SECRET?.trim() || "dev-only-change-me-in-production",
  jwtExpiresIn: str("JWT_EXPIRES_IN", "7d"),
  /** First-run admin seed (only when no admin exists) */
  bootstrapAdminEmail: process.env.ADMIN_EMAIL?.trim() || "",
  bootstrapAdminPassword: process.env.ADMIN_PASSWORD?.trim() || "",
};

export function loadPricingConfig(): PricingConfig {
  return {
    tonnagePerGrtUsd: num("PRICING_TONNAGE_PER_GRT", 1),
    berth: num("PRICING_BERTH", 4500),
    towageIn: num("PRICING_TOWAGE_IN", 9600),
    towageOut: num("PRICING_TOWAGE_OUT", 9600),
    mooringIn: num("PRICING_MOORING_IN", 480),
    mooringOut: num("PRICING_MOORING_OUT", 480),
    sanitary: num("PRICING_SANITARY", 300),
    watchman: num("PRICING_WATCHMAN", 2100),
    positionInternet: num("PRICING_POSITION_INTERNET", 2400),
    monitoring: num("PRICING_MONITORING", 1500),
    lightDues: num("PRICING_LIGHT_DUES", 2700),
    pilotageIn: num("PRICING_PILOTAGE_IN", 300),
    pilotageOut: num("PRICING_PILOTAGE_OUT", 300),
    agencyFee: num("PRICING_AGENCY_FEE", 196.3),
    clearance: num("PRICING_CLEARANCE", 550),
    pollutionRatePerGrt: num("PRICING_POLLUTION_RATE_PER_GRT", 0.02),
  };
}
