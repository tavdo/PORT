import type { Request, Response, NextFunction } from "express";
import {
  createPortRequest,
  listRequestsForUser,
  assertRequestAccess,
  type CreatePortRequestInput,
} from "../services/portRequestService";
import type { ShipData } from "../types";

function parseVessel(json: string): ShipData {
  return JSON.parse(json) as ShipData;
}

export async function postCreateRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as CreatePortRequestInput;
    const { id, payload, status } = await createPortRequest(req.userId!, body);
    res.status(201).json({
      id,
      status,
      ship: payload.ship,
      charges: payload.charges,
      totalUSD: payload.totalUSD,
      totalGEL: payload.totalGEL,
      meta: payload.meta,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await listRequestsForUser(req.userId!);
    const out = rows.map((r) => ({
      id: r.id,
      imo: r.imo,
      vesselData: typeof r.vessel_data === "string" ? parseVessel(r.vessel_data) : null,
      eta: r.eta,
      cargoNotes: r.cargo_notes,
      cargoWeightTn: r.cargo_weight_tn,
      hours: r.hours,
      usdToGel: r.usd_to_gel,
      status: r.status,
      estimatedTotalUsd: r.estimated_total_usd,
      approvedTotalUsd: r.approved_total_usd,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json(out);
  } catch (err) {
    next(err);
  }
}

export async function getOneRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const row = await assertRequestAccess(id, req.userId!, req.userRole!);
    const vesselData =
      typeof row.vessel_data === "string" ? parseVessel(row.vessel_data) : null;
    let charges: unknown = null;
    if (typeof row.chargesSnapshotJson === "string") {
      charges = JSON.parse(row.chargesSnapshotJson);
    }
    res.json({
      id: row.id,
      userId: row.userId,
      userEmail: row.userEmail,
      imo: row.imo,
      vesselData,
      eta: row.eta,
      cargoNotes: row.cargo_notes,
      cargoWeightTn: row.cargoWeightTn,
      hours: row.hours,
      usdToGel: row.usdToGel,
      calcParams: typeof row.calcParamsJson === "string" ? JSON.parse(row.calcParamsJson) : null,
      status: row.status,
      estimatedTotalUsd: row.estimatedTotalUsd,
      approvedTotalUsd: row.approvedTotalUsd,
      charges,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  } catch (err) {
    next(err);
  }
}
