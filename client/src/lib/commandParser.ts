import type { CalculationParams } from './api';
import { CAPTAIN_DEFAULT_HOURS, CAPTAIN_DEFAULT_USD_TO_GEL } from './api';

/** IMO check digit (IMO Resolution A.1117) */
export function isValidImoChecksum(imo7: string): boolean {
  if (!/^\d{7}$/.test(imo7)) return false;
  const d = imo7.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 6; i++) sum += d[i] * (7 - i);
  const c = sum % 10;
  return d[6] === c;
}

/** Pull a 7-digit IMO from free text (paste from email, manifest, etc.) */
export function extractImoFromText(text: string): string | null {
  const s = text.trim();
  if (!s) return null;
  const candidates = s.match(/\b\d{7}\b/g);
  if (candidates) {
    for (const c of candidates) {
      if (isValidImoChecksum(c)) return c;
    }
    return candidates[0];
  }
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 7) {
    const slice = digits.slice(0, 7);
    if (isValidImoChecksum(slice)) return slice;
    return slice;
  }
  return null;
}

export function parseCaptainCommand(text: string): Partial<CalculationParams> {
  const params: Partial<CalculationParams> = {};
  const imo = extractImoFromText(text);
  if (imo) params.imo = imo;

  const hoursMatch =
    text.match(/\b(\d+)\s*(h|hrs|hours|hr)\b/i) || text.match(/\bhours?\s*[:\s]+(\d+)\b/i);
  if (hoursMatch) {
    const val = Number(hoursMatch[1]);
    if (Number.isFinite(val) && val >= 0 && val <= 10000) params.hours = val;
  }

  const rateMatch = text.match(/\b(\d+\.\d{1,4})\b/) || text.match(/\brate\s*[:\s]+(\d+(?:\.\d+)?)\b/i);
  if (rateMatch) {
    const r = Number(rateMatch[1]);
    if (Number.isFinite(r) && r > 0 && r < 100) params.usdToGel = r;
  }

  return params;
}

export function mergeCaptainParams(p: Partial<CalculationParams>): CalculationParams | null {
  const imo = p.imo ? extractImoFromText(p.imo) || (/^\d{7}$/.test(p.imo.trim()) ? p.imo.trim() : null) : null;
  if (!imo) return null;
  return {
    imo,
    hours: p.hours ?? CAPTAIN_DEFAULT_HOURS,
    usdToGel: p.usdToGel ?? CAPTAIN_DEFAULT_USD_TO_GEL,
    reducedGrt: p.reducedGrt,
    depthM: p.depthM,
    nightPilotIn: p.nightPilotIn ?? false,
    nightPilotOut: p.nightPilotOut ?? false,
    holidayTowageOut: p.holidayTowageOut ?? false,
    holidayMooringIn: p.holidayMooringIn ?? false,
    holidayMooringOut: p.holidayMooringOut ?? false,
    freshWaterTn: p.freshWaterTn,
    anchorageDays: p.anchorageDays,
    includeCertificates: p.includeCertificates ?? false,
  };
}
