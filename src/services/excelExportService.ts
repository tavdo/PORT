import XLSX from "xlsx";
import type { CalculateResponse } from "../types";
import { logger } from "../utils/logger";

export function buildDisbursementXlsxBuffer(payload: CalculateResponse, imo: string): Buffer {
  try {
    const wb = XLSX.utils.book_new();

    const header = [
      "Group",
      "Key",
      "Description",
      "Calculation",
      "Amount USD",
      "GEL component",
    ];
    const rows: (string | number | undefined)[][] = [header];
    for (const sec of payload.charges.sections) {
      for (const it of sec.items) {
        rows.push([
          sec.id,
          it.key,
          it.label,
          it.calculationMethod ?? "",
          it.amountUSD,
          it.gelAmount ?? "",
        ]);
      }
    }
    rows.push([]);
    rows.push(["", "", "TOTAL USD", "", payload.totalUSD, ""]);
    rows.push(["", "", "TOTAL GEL", "", payload.totalGEL, ""]);
    if (payload.fda) {
      rows.push(["", "", "Advance USD", "", payload.fda.advanceReceivedUsd, ""]);
      rows.push(["", "", "Balance USD", "", payload.fda.balanceUsd, ""]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, payload.kind === "fda" ? "FDA" : "PDA");

    const shipRows: (string | number)[][] = [
      ["Field", "Value"],
      ["IMO", imo],
      ["Name", payload.ship.name],
      ["GRT", payload.ship.grt],
      ["Reduced GRT", payload.ship.reducedGrt],
      ["L × B × D", payload.ship.lbd],
      ["Total USD", payload.totalUSD],
      ["Total GEL", payload.totalGEL],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(shipRows);
    XLSX.utils.book_append_sheet(wb, ws2, "Ship");

    const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    logger.info("XLSX built", { imo, bytes: out.length });
    return out;
  } catch (err) {
    logger.error("excelExportService failed", { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
