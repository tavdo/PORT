import type { ShipInfo } from '@/lib/api';

/** Normalize stored Vessel API / ShipData JSON for UI components expecting `ShipInfo`. */
export function toShipInfo(v: Record<string, unknown> | null | undefined): ShipInfo | null {
  if (!v || typeof v !== 'object') return null;
  if ('grt' in v && typeof (v as { grt?: unknown }).grt === 'number') {
    return v as unknown as ShipInfo;
  }
  const grt = Number((v as { grossTonnage?: unknown }).grossTonnage ?? 0);
  if (!Number.isFinite(grt) || grt <= 0) return null;
  const reducedGrt = Math.round(grt * 0.8);
  const draft = Number((v as { draft?: unknown }).draft) || 10;
  const length = Number((v as { length?: unknown }).length) || 0;
  const width = Number((v as { width?: unknown }).width) || 0;
  const depthM = draft;
  return {
    name: String((v as { name?: unknown }).name ?? ''),
    type: String((v as { vesselType?: unknown }).vesselType ?? ''),
    grt,
    reducedGrt,
    length,
    width,
    depthM,
    lbd: Math.round(length * width * depthM * 100) / 100,
  };
}
