import { logger } from "../utils/logger";
import type { ChargeLineItem, ChargeSection } from "../types";
import {
  calculateTankerLines,
  loadMergedBatumiTariff,
  type TankerCalcInput,
  type TankerLine,
} from "./tankerPricingEngine";

function toChargeItem(l: TankerLine): ChargeLineItem {
  return {
    key: l.key,
    label: l.label,
    amountUSD: l.amountUSD,
    calculationMethod: l.calculationMethod,
    group: l.group,
    gelAmount: l.gelAmount,
  };
}

function buildSections(lines: TankerLine[]): ChargeSection[] {
  const titles: Record<string, string> = {
    A: "A: Port expenses",
    B: "B: Pilot expenses",
    C: "C: Maritime Transport Agency",
    D: "D: Hydrography",
    E: "E: Agency fees",
    X: "Additional / optional",
  };
  const order = ["A", "B", "C", "D", "E", "X"];
  const byGroup = new Map<string, TankerLine[]>();
  for (const l of lines) {
    const arr = byGroup.get(l.group) ?? [];
    arr.push(l);
    byGroup.set(l.group, arr);
  }
  const sections: ChargeSection[] = [];
  for (const id of order) {
    const arr = byGroup.get(id);
    if (!arr?.length) continue;
    sections.push({
      id,
      title: titles[id] ?? id,
      items: arr.map(toChargeItem),
    });
  }
  return sections;
}

export function runTankerDisbursement(
  ship: import("../types").ShipData,
  input: TankerCalcInput,
  overrides?: Record<string, number>,
): {
  lines: TankerLine[];
  sections: ChargeSection[];
  port: ChargeLineItem[];
  nonPort: ChargeLineItem[];
  subtotalUSD: number;
} {
  try {
    const tariff = loadMergedBatumiTariff();
    const { lines, subtotalUSD } = calculateTankerLines(ship, input, tariff, overrides);
    const sections = buildSections(lines);
    const all = lines.map(toChargeItem);
    const port = all.filter((c) => c.group === "A");
    const nonPort = all.filter((c) => c.group !== "A");
    logger.debug("runTankerDisbursement", { imo: ship.imo, subtotalUSD });
    return { lines, sections, port, nonPort, subtotalUSD };
  } catch (err) {
    logger.error("runTankerDisbursement failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
