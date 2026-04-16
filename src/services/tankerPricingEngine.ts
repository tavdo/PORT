import { readDataJson } from "./tariffLoader";
import { logger } from "../utils/logger";
import type { ShipData } from "../types";
import { getPricingOverrides } from "./pricingConfigService";

export interface BatumiTankerTariff {
  tonnagePerGrtBelow10000: number;
  tonnagePerGrtAbove10000: number;
  berthPerGrtUsd: number;
  towagePerGrtUsd: number;
  mooringFixedUsd: number;
  mooringHolidayPct: number;
  sanitaryPerGrtUsd: number;
  watchmanPerGrtUsd: number;
  firePreventionPerHourUsd: number;
  launchBoatUsd: number;
  positionPerGrtBelow10000: number;
  positionPerGrtAbove10000: number;
  pilotPerLbdUsd: number;
  pilotNightSurchargePct: number;
  lightDuesPerGrossTonnageUsd: number;
  monitoringGelPerReducedGrt: number;
  agencyLumpsumUsd: number;
  freshWaterPerTnUsd: number;
  freshWaterBargeUsd: number;
  certificateOfOriginUsd: number;
  georepGel: number;
}

interface EnvironmentFile {
  currency: string;
  bands: Array<{ from: number; to: number; fee: number }>;
}

interface GelSchedulesFile {
  harbourClearance: Array<{ fromGt: number; toGt: number; gel: number }>;
  anchorageDaily: Array<{ fromGt: number; toGt: number; gel: number }>;
  georep: { gel: number };
  reinspection: { gel: number };
}

export interface TankerLine {
  key: string;
  label: string;
  amountUSD: number;
  calculationMethod?: string;
  group: "A" | "B" | "C" | "D" | "E" | "X";
  gelAmount?: number;
}

export interface TankerCalcInput {
  usdToGel: number;
  hoursPortStay: number;
  reducedGrt?: number;
  depthM?: number;
  /** Optional cargo weight for DB-configured per-ton fees */
  cargoWeightTn?: number;
  /** Night surcharge on pilot in (22:00–06:30 style) */
  nightPilotIn: boolean;
  nightPilotOut: boolean;
  holidayTowageOut: boolean;
  holidayMooringIn: boolean;
  holidayMooringOut: boolean;
  freshWaterTn?: number;
  anchorageDays?: number;
  includeCertificates?: boolean;
}

/** File tariff merged with `pricing_config` rows (same keys as JSON + optional extras). */
export type EffectiveTariff = BatumiTankerTariff & {
  cargoPerTnUsd?: number;
  lengthAdjustmentPerMUsd?: number;
  customFlatFeeUsd?: number;
};

export function loadBatumiTariff(): BatumiTankerTariff {
  return readDataJson<BatumiTankerTariff>("batumi-tanker.json");
}

export function loadMergedBatumiTariff(): EffectiveTariff {
  const base = loadBatumiTariff() as EffectiveTariff;
  const ov = getPricingOverrides();
  const merged: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(ov)) {
    merged[k] = v;
  }
  return merged as unknown as EffectiveTariff;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function gelToUsd(gel: number, usdToGel: number): number {
  if (usdToGel <= 0) return 0;
  return round2(gel / usdToGel);
}

function lookupEnvironmentFeeGel(reducedGrt: number): number {
  const data = readDataJson<EnvironmentFile>("environment-fees.json");
  for (const b of data.bands) {
    if (reducedGrt >= b.from && reducedGrt <= b.to) return b.fee;
  }
  const last = data.bands[data.bands.length - 1];
  return last?.fee ?? 0;
}

function lookupHarbourGel(grt: number): number {
  const g = readDataJson<GelSchedulesFile>("gel-schedules.json");
  for (const b of g.harbourClearance) {
    if (grt >= b.fromGt && grt <= b.toGt) return b.gel;
  }
  return g.harbourClearance[g.harbourClearance.length - 1]?.gel ?? 0;
}

function lookupAnchorageGel(grt: number): number {
  const g = readDataJson<GelSchedulesFile>("gel-schedules.json");
  for (const b of g.anchorageDaily) {
    if (grt >= b.fromGt && grt <= b.toGt) return b.gel;
  }
  return g.anchorageDaily[g.anchorageDaily.length - 1]?.gel ?? 0;
}

function tonnageRate(grt: number, t: BatumiTankerTariff): number {
  return grt < 10000 ? t.tonnagePerGrtBelow10000 : t.tonnagePerGrtAbove10000;
}

function positionRate(grt: number, t: BatumiTankerTariff): number {
  return grt < 10000 ? t.positionPerGrtBelow10000 : t.positionPerGrtAbove10000;
}

function applyHoliday(base: number, apply: boolean, pct: number): number {
  if (!apply) return base;
  return round2(base * (1 + pct / 100));
}

export function calculateTankerLines(
  ship: ShipData,
  input: TankerCalcInput,
  tariff: BatumiTankerTariff | EffectiveTariff,
  overrides?: Record<string, number>,
): { lines: TankerLine[]; subtotalUSD: number } {
  const grt = ship.grossTonnage;
  const reduced = input.reducedGrt ?? Math.round(grt * 0.8);
  const depth = input.depthM ?? (ship.draft || 10);
  const lbd = ship.length * ship.width * depth;
  const { usdToGel } = input;
  const t = tariff;

  const lines: TankerLine[] = [];

  const push = (
    group: TankerLine["group"],
    key: string,
    label: string,
    amountUSD: number,
    method?: string,
    gelAmount?: number,
  ) => {
    const amt = overrides?.[key] !== undefined ? round2(overrides[key]!) : round2(amountUSD);
    lines.push({ group, key, label, amountUSD: amt, calculationMethod: method, gelAmount });
  };

  try {
    // A: Port
    const tr = tonnageRate(reduced, t);
    push(
      "A",
      "tonnage",
      "Tonnage dues",
      reduced * tr,
      `${tr}$ × reduced GRT (${reduced})`,
    );
    push("A", "berth", "Berth dues", reduced * t.berthPerGrtUsd, `${t.berthPerGrtUsd}$ × reduced GRT`);
    push("A", "towage_in", "Towage — Inwards", reduced * t.towagePerGrtUsd, `${t.towagePerGrtUsd}$ × reduced GRT`);
    push(
      "A",
      "towage_out",
      "Towage — Outwards",
      applyHoliday(reduced * t.towagePerGrtUsd, input.holidayTowageOut, t.mooringHolidayPct),
      input.holidayTowageOut ? `+${t.mooringHolidayPct}% holiday` : `${t.towagePerGrtUsd}$ × reduced GRT`,
    );
    push(
      "A",
      "mooring_in",
      "Mooring — Mooring",
      applyHoliday(t.mooringFixedUsd, input.holidayMooringIn, t.mooringHolidayPct),
      "Fixed fee",
    );
    push(
      "A",
      "mooring_out",
      "Mooring — Unmooring",
      applyHoliday(t.mooringFixedUsd, input.holidayMooringOut, t.mooringHolidayPct),
      "Fixed fee",
    );
    push("A", "sanitary", "Sanitary dues", reduced * t.sanitaryPerGrtUsd, `${t.sanitaryPerGrtUsd}$ × reduced GRT`);
    push("A", "watchman", "Watchman service dues", reduced * t.watchmanPerGrtUsd, `${t.watchmanPerGrtUsd}$ × reduced GRT`);
    push(
      "A",
      "fire",
      "Fire prevention dues",
      input.hoursPortStay * t.firePreventionPerHourUsd,
      `${t.firePreventionPerHourUsd}$ × port hours (${input.hoursPortStay})`,
    );
    push("A", "launch", "Launch boat", t.launchBoatUsd, "Per tariff");
    const pr = positionRate(reduced, t);
    push(
      "A",
      "position",
      "Daily ship positions",
      reduced * pr,
      `${pr}$ × reduced GRT (${reduced < 10000 ? "<" : "≥"} 10000 GRT band)`,
    );

    // B: Pilot
    const pilotBaseIn = lbd * t.pilotPerLbdUsd;
    const pilotBaseOut = lbd * t.pilotPerLbdUsd;
    const nightPct = t.pilotNightSurchargePct / 100;
    const pilotIn = input.nightPilotIn ? pilotBaseIn * (1 + nightPct) : pilotBaseIn;
    const pilotOut = input.nightPilotOut ? pilotBaseOut * (1 + nightPct) : pilotBaseOut;
    push(
      "B",
      "pilot_in",
      "Pilotage — Inwards",
      pilotIn,
      `${t.pilotPerLbdUsd}$ × L×B×D${input.nightPilotIn ? ` +${t.pilotNightSurchargePct}% night` : ""}`,
    );
    push(
      "B",
      "pilot_out",
      "Pilotage — Outwards",
      pilotOut,
      `${t.pilotPerLbdUsd}$ × L×B×D${input.nightPilotOut ? ` +${t.pilotNightSurchargePct}% night` : ""}`,
    );

    // C: MTA / agency-related state fees
    const envGel = lookupEnvironmentFeeGel(reduced);
    const envUsd = gelToUsd(envGel, usdToGel);
    push("C", "pollution", "Environment pollution dues", envUsd, `MTA bracket table (${envGel} GEL)`, envGel);

    const harbourGel = lookupHarbourGel(grt);
    const harbourUsd = gelToUsd(harbourGel, usdToGel);
    push("C", "harbour", "Harbour dues", harbourUsd, `Harbour clearance (${harbourGel} GEL)`, harbourGel);

    const georepGel = t.georepGel ?? readDataJson<GelSchedulesFile>("gel-schedules.json").georep.gel;
    const georepUsd = gelToUsd(georepGel, usdToGel);
    push("C", "georep", "Georep dues", georepUsd, `${georepGel} GEL`, georepGel);

    const monGel = t.monitoringGelPerReducedGrt * reduced;
    const monUsd = gelToUsd(monGel, usdToGel);
    push("C", "monitoring", "Monitoring service (VTS)", monUsd, `${t.monitoringGelPerReducedGrt} GEL × reduced GRT (${reduced})`, monGel);

    // D: Hydrography
    push(
      "D",
      "light_dues",
      "Light dues (lighthouse / SBT)",
      grt * t.lightDuesPerGrossTonnageUsd,
      `${t.lightDuesPerGrossTonnageUsd}$ × gross tonnage`,
    );

    // E: Agency
    push("E", "agency", "Agency fee", t.agencyLumpsumUsd, "Lumpsum all inclusive");

    // Optional extras (FDA-style)
    if (input.freshWaterTn && input.freshWaterTn > 0) {
      push(
        "X",
        "fresh_water",
        "Fresh water supply",
        input.freshWaterTn * t.freshWaterPerTnUsd + t.freshWaterBargeUsd,
        `${t.freshWaterPerTnUsd}$/tn + barge`,
      );
    }
    if (input.includeCertificates) {
      push("X", "certificates", "Certificates of Origin", t.certificateOfOriginUsd, "Fixed");
    }
    if (input.anchorageDays && input.anchorageDays > 0) {
      const agGel = lookupAnchorageGel(grt) * input.anchorageDays;
      push(
        "X",
        "anchorage",
        `Anchorage (${input.anchorageDays} day(s))`,
        gelToUsd(agGel, usdToGel),
        `Daily rate × days (${agGel} GEL total)`,
        agGel,
      );
    }

    const ex = t as EffectiveTariff;
    if (ex.cargoPerTnUsd && ex.cargoPerTnUsd > 0 && input.cargoWeightTn && input.cargoWeightTn > 0) {
      push(
        "X",
        "cargo_handling",
        "Cargo handling (tariff)",
        input.cargoWeightTn * ex.cargoPerTnUsd,
        `${ex.cargoPerTnUsd}$ × cargo weight (${input.cargoWeightTn} tn)`,
      );
    }
    if (ex.lengthAdjustmentPerMUsd && ex.lengthAdjustmentPerMUsd !== 0) {
      push(
        "X",
        "length_adjustment",
        "Length-based adjustment",
        ship.length * ex.lengthAdjustmentPerMUsd,
        `${ex.lengthAdjustmentPerMUsd}$ × LOA (${ship.length} m)`,
      );
    }
    if (ex.customFlatFeeUsd && ex.customFlatFeeUsd !== 0) {
      push("X", "custom_flat", "Custom port fee", ex.customFlatFeeUsd, "Configured flat fee");
    }

    const subtotalUSD = round2(lines.reduce((s, l) => s + l.amountUSD, 0));

    logger.debug("Tanker lines computed", { imo: ship.imo, lines: lines.length, subtotalUSD });

    return { lines, subtotalUSD };
  } catch (err) {
    logger.error("calculateTankerLines failed", { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
