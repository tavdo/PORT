import type { Request, Response, NextFunction } from "express";
import { listAllRequests, setRequestStatus } from "../services/portRequestService";
import { logAudit } from "../services/auditService";
import type { ShipData } from "../types";

function parseVessel(json: string): ShipData {
  return JSON.parse(json) as ShipData;
}

export async function getAdminRequests(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await listAllRequests();
    const out = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userEmail: r.userEmail,
      imo: r.imo,
      vesselData: typeof r.vessel_data === "string" ? parseVessel(r.vessel_data) : null,
      eta: r.eta,
      cargoNotes: r.cargo_notes ?? r.cargoNotes,
      cargoWeightTn: r.cargoWeightTn,
      hours: r.hours,
      usdToGel: r.usdToGel,
      status: r.status,
      estimatedTotalUsd: r.estimatedTotalUsd,
      approvedTotalUsd: r.approvedTotalUsd,
      charges:
        typeof r.chargesSnapshotJson === "string" ? JSON.parse(r.chargesSnapshotJson) : null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
    res.json(out);
  } catch (err) {
    next(err);
  }
}

export async function patchAdminRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const action = req.body?.action as string | undefined;
    if (action !== "approve" && action !== "reject") {
      res.status(400).json({ error: "action must be approve or reject" });
      return;
    }
    const approvedRaw = req.body?.approvedTotalUsd;
    const approvedTotalUsd =
      approvedRaw === undefined || approvedRaw === null || approvedRaw === ""
        ? undefined
        : Number(approvedRaw);

    const result = await setRequestStatus(id, action, approvedTotalUsd, req.userId!);

    logAudit(req.userId!, action === "approve" ? "request_approved" : "request_rejected", "port_request", id, {
      estimatedTotalUsd: result.estimatedTotalUsd,
      approvedTotalUsd: result.approvedTotalUsd,
    });

    res.json({
      id,
      status: action === "approve" ? "approved" : "rejected",
      ...result,
    });
  } catch (err) {
    next(err);
  }
}
