import axios, { AxiosError } from "axios";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { shipCache } from "./cacheService";
import { AppError } from "../utils/errors";
import type { ShipData } from "../types";

const VESSEL_TYPES = [
  "Bulk Carrier",
  "Container Ship",
  "General Cargo",
  "Tanker",
  "Ro-Ro",
  "Passenger",
] as const;

function isValidImo(imo: string): boolean {
  return /^\d{7}$/.test(imo.trim());
}

function hashImo(imo: string): number {
  const s = imo.trim();
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function buildMockShipData(imo: string): ShipData {
  const key = imo.trim();
  const h = hashImo(key);
  const grt = 8000 + (h % 12000);
  const length = 120 + (h % 80);
  const width = 18 + (h % 12);
  const draft = 7 + (h % 10) * 0.5;
  const typeIdx = h % VESSEL_TYPES.length;
  return {
    imo: key,
    name: `MV Mock Vessel ${key.slice(-4)}`,
    vesselType: VESSEL_TYPES[typeIdx],
    grossTonnage: grt,
    length: Math.round(length * 10) / 10,
    width: Math.round(width * 10) / 10,
    draft: Math.round(draft * 10) / 10,
  };
}

/** Normalize common third-party vessel JSON shapes */
function normalizeRemotePayload(raw: unknown, imo: string): ShipData | null {
  try {
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    const data =
      o.data && typeof o.data === "object"
        ? (o.data as Record<string, unknown>)
        : o.vessel && typeof o.vessel === "object"
          ? (o.vessel as Record<string, unknown>)
          : o;

    const name = String(data.name ?? data.shipname ?? data.vessel_name ?? "Unknown");
    const vesselType = String(
      data.vesselType ??
        data.vessel_type ??
        data.type_name ??
        data.ship_type ??
        data.type ??
        "General Cargo",
    );
    const grossTonnage = Number(data.grossTonnage ?? data.grt ?? data.gt ?? data.gross_tonnage ?? 0);
    const length = Number(data.length ?? data.loa ?? data.length_overall ?? 0);
    const width = Number(data.width ?? data.beam ?? data.breadth ?? 0);
    const draft = Number(data.draft ?? data.draught ?? data.max_draught ?? 0);

    if (!Number.isFinite(grossTonnage) || grossTonnage <= 0) return null;

    return {
      imo: imo.trim(),
      name,
      vesselType,
      grossTonnage,
      length: Number.isFinite(length) && length > 0 ? length : 100,
      width: Number.isFinite(width) && width > 0 ? width : 20,
      draft: Number.isFinite(draft) && draft > 0 ? draft : 8,
    };
  } catch {
    return null;
  }
}

async function fetchFromRemoteApi(imo: string): Promise<ShipData | null> {
  const base = env.shipApiUrl;
  if (!base) return null;

  const url = base.includes("{imo}") ? base.replace(/\{imo\}/g, encodeURIComponent(imo)) : `${base.replace(/\/$/, "")}/${encodeURIComponent(imo)}`;

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (env.shipApiKey) {
      headers.Authorization = `Bearer ${env.shipApiKey}`;
    }

    const res = await axios.get<unknown>(url, {
      headers,
      timeout: env.shipApiTimeoutMs,
      validateStatus: (s) => s >= 200 && s < 300,
    });

    const normalized = normalizeRemotePayload(res.data, imo);
    if (normalized) {
      logger.info("Ship data fetched from remote API", { imo, name: normalized.name });
      return normalized;
    }
    logger.warn("Remote API returned unparseable payload", { imo });
    return null;
  } catch (err) {
    const ax = err as AxiosError;
    logger.warn("Remote ship API request failed", {
      imo,
      message: ax.message,
      status: ax.response?.status,
    });
    return null;
  }
}

/**
 * Resolves vessel data: cache → remote (if configured) → deterministic mock.
 */
export async function getShipByImo(imo: string): Promise<ShipData> {
  const trimmed = imo.trim();
  if (!isValidImo(trimmed)) {
    throw new AppError("IMO must be exactly 7 digits", 400);
  }

  try {
    const cached = shipCache.get(trimmed);
    if (cached) return cached;

    const remote = await fetchFromRemoteApi(trimmed);
    if (remote) {
      shipCache.set(trimmed, remote);
      return remote;
    }

    const mock = buildMockShipData(trimmed);
    logger.info("Using mock ship data (API unavailable or not configured)", { imo: trimmed });
    shipCache.set(trimmed, mock);
    return mock;
  } catch (err) {
    logger.error("getShipByImo unexpected error", {
      imo: trimmed,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export { isValidImo };
