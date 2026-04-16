import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { getShipByImo } from "../services/shipService";
import { runTankerDisbursement } from "../services/pricingService";
import { buildDisbursementPdfBuffer } from "../services/pdfService";
import { buildDisbursementXlsxBuffer } from "../services/excelExportService";
import { logger } from "../utils/logger";
import type { CalculateRequestBody, CalculateResponse, FdaRequestBody } from "../types";

type PdfPostBody = Partial<CalculateRequestBody> & { kind?: "pda" | "fda"; advanceReceivedUsd?: number };
import type { TankerCalcInput } from "../services/tankerPricingEngine";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function resolveHours(body: Partial<CalculateRequestBody>): number {
  const raw = body.hours as unknown;
  if (raw === undefined || raw === null || raw === "") return env.defaultPortStayHours;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return env.defaultPortStayHours;
  return n;
}

function resolveUsdToGel(body: Partial<CalculateRequestBody>): number {
  const raw = body.usdToGel as unknown;
  if (raw === undefined || raw === null || raw === "") return env.defaultUsdToGel;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return env.defaultUsdToGel;
  return n;
}

function toTankerInput(body: Partial<CalculateRequestBody>, hours: number, usdToGel: number): TankerCalcInput {
  return {
    usdToGel,
    hoursPortStay: hours,
    reducedGrt: body.reducedGrt !== undefined && body.reducedGrt !== null ? Number(body.reducedGrt) : undefined,
    depthM: body.depthM !== undefined && body.depthM !== null ? Number(body.depthM) : undefined,
    cargoWeightTn: body.cargoWeightTn !== undefined ? Number(body.cargoWeightTn) : undefined,
    nightPilotIn: Boolean(body.nightPilotIn),
    nightPilotOut: Boolean(body.nightPilotOut),
    holidayTowageOut: Boolean(body.holidayTowageOut),
    holidayMooringIn: Boolean(body.holidayMooringIn),
    holidayMooringOut: Boolean(body.holidayMooringOut),
    freshWaterTn: body.freshWaterTn !== undefined ? Number(body.freshWaterTn) : undefined,
    anchorageDays: body.anchorageDays !== undefined ? Number(body.anchorageDays) : undefined,
    includeCertificates: Boolean(body.includeCertificates),
  };
}

function buildShipBlock(
  ship: Awaited<ReturnType<typeof getShipByImo>>,
  input: TankerCalcInput,
): CalculateResponse["ship"] {
  const grt = ship.grossTonnage;
  const reduced = input.reducedGrt ?? Math.round(grt * 0.8);
  const depthM = input.depthM ?? (ship.draft || 10);
  const lbd = ship.length * ship.width * depthM;
  return {
    name: ship.name,
    type: ship.vesselType,
    grt,
    reducedGrt: reduced,
    length: ship.length,
    width: ship.width,
    depthM,
    lbd: round2(lbd),
  };
}

export async function postCalculate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Partial<CalculateRequestBody>;
    const imo = typeof body.imo === "string" ? body.imo.trim() : "";
    const hours = resolveHours(body);
    const usdToGel = resolveUsdToGel(body);

    if (!imo) {
      res.status(400).json({ error: "imo is required" });
      return;
    }

    const ship = await getShipByImo(imo);
    const tankerInput = toTankerInput(body, hours, usdToGel);
    const { sections, port, nonPort, subtotalUSD } = runTankerDisbursement(ship, tankerInput);

    const payload: CalculateResponse = {
      kind: "pda",
      ship: buildShipBlock(ship, tankerInput),
      voyage: body.voyage,
      charges: { sections, port, nonPort },
      totalUSD: round2(subtotalUSD),
      totalGEL: round2(subtotalUSD * usdToGel),
      meta: { model: "tanker-batumi", tariffFile: "batumi-tanker.json" },
    };

    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function postFda(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Partial<FdaRequestBody>;
    const imo = typeof body.imo === "string" ? body.imo.trim() : "";
    const hours = resolveHours(body);
    const usdToGel = resolveUsdToGel(body);

    if (!imo) {
      res.status(400).json({ error: "imo is required" });
      return;
    }

    const ship = await getShipByImo(imo);
    const tankerInput = toTankerInput(body, hours, usdToGel);
    const overrides = body.lineOverrides && typeof body.lineOverrides === "object" ? body.lineOverrides : undefined;
    const { sections, port, nonPort, subtotalUSD } = runTankerDisbursement(ship, tankerInput, overrides);

    const advance = Number(body.advanceReceivedUsd);
    const advanceReceivedUsd = Number.isFinite(advance) && advance >= 0 ? advance : 0;
    const balanceUsd = round2(subtotalUSD - advanceReceivedUsd);

    const voyage = {
      ...body.voyage,
      arrival: body.arrival,
      departure: body.departure,
      documentDate: body.fdaDate,
      fdaNumber: body.fdaNumber,
      activityRef: body.fdaNumber ?? body.voyage?.activityRef,
    };

    const payload: CalculateResponse = {
      kind: "fda",
      ship: buildShipBlock(ship, tankerInput),
      voyage,
      charges: { sections, port, nonPort },
      totalUSD: round2(subtotalUSD),
      totalGEL: round2(subtotalUSD * usdToGel),
      fda: { advanceReceivedUsd, balanceUsd },
      meta: { model: "tanker-batumi", tariffFile: "batumi-tanker.json" },
    };

    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function getPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const imo = typeof req.params.imo === "string" ? req.params.imo.trim() : "";
    const hoursRaw = req.query.hours;
    const fxRaw = req.query.usdToGel;

    const hours =
      hoursRaw === undefined
        ? env.defaultPortStayHours
        : Number(Array.isArray(hoursRaw) ? hoursRaw[0] : hoursRaw);
    const usdToGel =
      fxRaw === undefined
        ? env.defaultUsdToGel
        : Number(Array.isArray(fxRaw) ? fxRaw[0] : fxRaw);

    if (!imo) {
      res.status(400).json({ error: "imo is required" });
      return;
    }
    if (!Number.isFinite(hours) || hours < 0) {
      res.status(400).json({ error: "hours query must be a non-negative number" });
      return;
    }
    if (!Number.isFinite(usdToGel) || usdToGel <= 0) {
      res.status(400).json({ error: "usdToGel query must be a positive number" });
      return;
    }

    const ship = await getShipByImo(imo);
    const tankerInput: TankerCalcInput = {
      usdToGel,
      hoursPortStay: hours,
      nightPilotIn: false,
      nightPilotOut: false,
      holidayTowageOut: false,
      holidayMooringIn: false,
      holidayMooringOut: false,
    };
    const { sections, port, nonPort, subtotalUSD } = runTankerDisbursement(ship, tankerInput);

    const payload: CalculateResponse = {
      kind: "pda",
      ship: buildShipBlock(ship, tankerInput),
      charges: { sections, port, nonPort },
      totalUSD: round2(subtotalUSD),
      totalGEL: round2(subtotalUSD * usdToGel),
      meta: { model: "tanker-batumi", tariffFile: "batumi-tanker.json" },
    };

    const pdf = await buildDisbursementPdfBuffer(payload, {
      imo: ship.imo,
      hours,
      draft: ship.draft,
    });
    const safeName = imo.replace(/\D/g, "") || "vessel";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="PDA-${safeName}.pdf"`);
    res.send(pdf);
    logger.info("PDF served", { imo, bytes: pdf.length });
  } catch (err) {
    next(err);
  }
}

export async function postPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as PdfPostBody;
    const imo = typeof body.imo === "string" ? body.imo.trim() : "";
    const hours = resolveHours(body);
    const usdToGel = resolveUsdToGel(body);

    if (!imo) {
      res.status(400).json({ error: "imo is required" });
      return;
    }

    const ship = await getShipByImo(imo);
    const tankerInput = toTankerInput(body, hours, usdToGel);
    const kind = body.kind === "fda" ? "fda" : "pda";
    const overrides =
      kind === "fda" && body.lineOverrides && typeof body.lineOverrides === "object"
        ? (body.lineOverrides as Record<string, number>)
        : undefined;

    const { sections, port, nonPort, subtotalUSD } = runTankerDisbursement(ship, tankerInput, overrides);

    const advance =
      kind === "fda" && body.advanceReceivedUsd !== undefined
        ? Number(body.advanceReceivedUsd)
        : 0;
    const advanceReceivedUsd = Number.isFinite(advance) && advance >= 0 ? advance : 0;
    const balanceUsd = round2(subtotalUSD - advanceReceivedUsd);

    const payload: CalculateResponse = {
      kind,
      ship: buildShipBlock(ship, tankerInput),
      voyage: body.voyage,
      charges: { sections, port, nonPort },
      totalUSD: round2(subtotalUSD),
      totalGEL: round2(subtotalUSD * usdToGel),
      fda:
        kind === "fda"
          ? { advanceReceivedUsd, balanceUsd }
          : undefined,
      meta: { model: "tanker-batumi", tariffFile: "batumi-tanker.json" },
    };

    const pdf = await buildDisbursementPdfBuffer(payload, {
      imo: ship.imo,
      hours,
      draft: ship.draft,
    });
    const safeName = imo.replace(/\D/g, "") || "vessel";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${kind.toUpperCase()}-${safeName}.pdf"`,
    );
    res.send(pdf);
    logger.info("PDF (POST) served", { imo, kind });
  } catch (err) {
    next(err);
  }
}

export async function getExportXlsx(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const imo = typeof req.params.imo === "string" ? req.params.imo.trim() : "";
    const hoursRaw = req.query.hours;
    const fxRaw = req.query.usdToGel;
    const kind = req.query.kind === "fda" ? "fda" : "pda";

    const hours =
      hoursRaw === undefined
        ? env.defaultPortStayHours
        : Number(Array.isArray(hoursRaw) ? hoursRaw[0] : hoursRaw);
    const usdToGel =
      fxRaw === undefined
        ? env.defaultUsdToGel
        : Number(Array.isArray(fxRaw) ? fxRaw[0] : fxRaw);

    if (!imo) {
      res.status(400).json({ error: "imo is required" });
      return;
    }
    if (!Number.isFinite(hours) || hours < 0 || !Number.isFinite(usdToGel) || usdToGel <= 0) {
      res.status(400).json({ error: "invalid hours or usdToGel" });
      return;
    }

    const ship = await getShipByImo(imo);
    const tankerInput: TankerCalcInput = {
      usdToGel,
      hoursPortStay: hours,
      nightPilotIn: false,
      nightPilotOut: false,
      holidayTowageOut: false,
      holidayMooringIn: false,
      holidayMooringOut: false,
    };
    const { sections, port, nonPort, subtotalUSD } = runTankerDisbursement(ship, tankerInput);

    const payload: CalculateResponse = {
      kind,
      ship: buildShipBlock(ship, tankerInput),
      charges: { sections, port, nonPort },
      totalUSD: round2(subtotalUSD),
      totalGEL: round2(subtotalUSD * usdToGel),
      meta: { model: "tanker-batumi", tariffFile: "batumi-tanker.json" },
    };

    const buf = buildDisbursementXlsxBuffer(payload, imo);
    const safeName = imo.replace(/\D/g, "") || "vessel";
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${kind.toUpperCase()}-${safeName}.xlsx"`);
    res.send(buf);
  } catch (err) {
    next(err);
  }
}
