import PDFDocument from "pdfkit";
import type { CalculateResponse } from "../types";
import { logger } from "../utils/logger";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface PdfExtras {
  imo: string;
  hours: number;
  draft: number;
}

export function buildDisbursementPdfBuffer(
  payload: CalculateResponse,
  extras: PdfExtras,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (c: Buffer) => {
        chunks.push(c);
      });
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on("error", (err: Error) => {
        reject(err);
      });

      const left = 50;
      const amountX = 420;

      const title =
        payload.kind === "fda" ? "Final Disbursement Account (FDA)" : "Proforma Disbursement Account (PDA)";
      doc.fontSize(18).text(title, { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#444").text(`Generated: ${new Date().toISOString()}`, {
        align: "center",
      });
      doc.fillColor("#000");
      doc.moveDown(1.5);

      doc.fontSize(12).text("Vessel particulars", { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(10);
      doc.text(`Name: ${payload.ship.name}`);
      doc.text(`IMO: ${extras.imo}`);
      doc.text(`Type: ${payload.ship.type}`);
      doc.text(`GRT / Reduced GRT: ${payload.ship.grt} / ${payload.ship.reducedGrt}`);
      doc.text(`Loa × Beam × Depth: ${payload.ship.length} × ${payload.ship.width} × ${payload.ship.depthM} m`);
      doc.text(`L × B × D (product): ${round2(payload.ship.lbd)}`);
      doc.text(`Port stay (hours): ${extras.hours}`);
      if (payload.voyage?.addressTo) doc.text(`Addressed to: ${payload.voyage.addressTo}`);
      if (payload.voyage?.cargoDescription) doc.text(`Cargo: ${payload.voyage.cargoDescription}`);
      if (payload.voyage?.activityRef) doc.text(`Activity: ${payload.voyage.activityRef}`);
      doc.moveDown(1);

      function line(label: string, usd: number): void {
        const y = doc.y;
        doc.text(label, left, y, { width: 340 });
        doc.text(`$ ${round2(usd).toFixed(2)}`, amountX, y, { width: 100, align: "right" });
        doc.moveDown(0.35);
      }

      for (const sec of payload.charges.sections) {
        doc.fontSize(11).text(sec.title, { underline: true });
        doc.moveDown(0.35);
        doc.fontSize(9);
        for (const item of sec.items) {
          const lbl =
            item.calculationMethod && item.calculationMethod.length < 90
              ? `${item.label} (${item.calculationMethod})`
              : item.label;
          line(lbl, item.amountUSD);
        }
        doc.moveDown(0.4);
      }

      doc.fontSize(11);
      doc.text(`Total (USD): $ ${round2(payload.totalUSD).toFixed(2)}`, left);
      doc.text(`Total (GEL): ₾ ${round2(payload.totalGEL).toFixed(2)}`, left);
      if (payload.fda) {
        doc.moveDown(0.5);
        doc.text(`Advance received (USD): $ ${round2(payload.fda.advanceReceivedUsd).toFixed(2)}`, left);
        doc.text(`Balance (USD): $ ${round2(payload.fda.balanceUsd).toFixed(2)}`, left);
      }
      doc.moveDown(1);
      doc.fontSize(8).fillColor("#666").text(
        "Indicative figures from configured tariffs and imported MTA/GEL tables. Subject to final port / agency confirmation.",
        left,
        doc.y,
        { width: 500 },
      );

      doc.end();
    } catch (err) {
      logger.error("PDF build failed", { error: err instanceof Error ? err.message : String(err) });
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
