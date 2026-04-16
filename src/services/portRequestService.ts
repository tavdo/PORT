import { getDb } from "../db/database";
import type { ShipData } from "../types";
import type { CalculateResponse } from "../types";
import { getShipByImo } from "./shipService";
import { runTankerDisbursement } from "./pricingService";
import type { TankerCalcInput } from "./tankerPricingEngine";
import { env } from "../config/env";
import { AppError } from "../utils/errors";

export type PortRequestStatus = "pending" | "approved" | "rejected";

export interface CreatePortRequestInput {
  imo: string;
  hours?: number;
  usdToGel?: number;
  eta?: string;
  cargoNotes?: string;
  cargoWeightTn?: number;
  reducedGrt?: number;
  depthM?: number;
  nightPilotIn?: boolean;
  nightPilotOut?: boolean;
  holidayTowageOut?: boolean;
  holidayMooringIn?: boolean;
  holidayMooringOut?: boolean;
  freshWaterTn?: number;
  anchorageDays?: number;
  includeCertificates?: boolean;
  lineOverrides?: Record<string, number>;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function resolveHours(raw: unknown): number {
  if (raw === undefined || raw === null || raw === "") return env.defaultPortStayHours;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return env.defaultPortStayHours;
  return n;
}

function resolveUsdToGel(raw: unknown): number {
  if (raw === undefined || raw === null || raw === "") return env.defaultUsdToGel;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return env.defaultUsdToGel;
  return n;
}

function toTankerInput(body: CreatePortRequestInput, hours: number, usdToGel: number): TankerCalcInput {
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

function buildShipBlock(ship: ShipData, input: TankerCalcInput): CalculateResponse["ship"] {
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

export async function createPortRequest(userId: number, input: CreatePortRequestInput): Promise<{
  id: number;
  payload: CalculateResponse;
  status: PortRequestStatus;
}> {
  const imo = input.imo?.trim() ?? "";
  if (!imo) throw new AppError("imo is required", 400);
  const hours = resolveHours(input.hours);
  const usdToGel = resolveUsdToGel(input.usdToGel);
  const ship = await getShipByImo(imo);
  const tankerInput = toTankerInput(input, hours, usdToGel);
  const { sections, port, nonPort, subtotalUSD } = runTankerDisbursement(ship, tankerInput, input.lineOverrides);

  const payload: CalculateResponse = {
    kind: "pda",
    ship: buildShipBlock(ship, tankerInput),
    charges: { sections, port, nonPort },
    totalUSD: round2(subtotalUSD),
    totalGEL: round2(subtotalUSD * usdToGel),
    meta: { model: "tanker-batumi", tariffFile: "batumi-tanker.json + pricing_config" },
  };

  const db = getDb();
  const calcParams = {
    hours,
    usdToGel,
    tanker: tankerInput,
    lineOverrides: input.lineOverrides,
  };
  const r = db
    .prepare(
      `INSERT INTO port_requests (
        user_id, imo, vessel_data, eta, cargo_notes, cargo_weight_tn,
        hours, usd_to_gel, calc_params_json, status, estimated_total_usd, charges_snapshot_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, datetime('now'))`,
    )
    .run(
      userId,
      imo,
      JSON.stringify(ship),
      input.eta?.trim() || null,
      input.cargoNotes?.trim() || null,
      input.cargoWeightTn != null ? Number(input.cargoWeightTn) : null,
      hours,
      usdToGel,
      JSON.stringify(calcParams),
      payload.totalUSD,
      JSON.stringify(payload.charges),
    );

  return {
    id: Number(r.lastInsertRowid),
    payload,
    status: "pending",
  };
}

export function listRequestsForUser(userId: number): unknown[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, imo, vessel_data, eta, cargo_notes, cargo_weight_tn, hours, usd_to_gel,
              status, estimated_total_usd, approved_total_usd, created_at, updated_at
       FROM port_requests WHERE user_id = ? ORDER BY id DESC`,
    )
    .all(userId);
}

export function listAllRequests(): unknown[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT r.id, r.user_id as userId, u.email as userEmail, r.imo, r.vessel_data, r.eta, r.cargo_notes,
              r.cargo_weight_tn as cargoWeightTn, r.hours, r.usd_to_gel as usdToGel,
              r.status, r.estimated_total_usd as estimatedTotalUsd, r.approved_total_usd as approvedTotalUsd,
              r.charges_snapshot_json as chargesSnapshotJson, r.created_at as createdAt, r.updated_at as updatedAt
       FROM port_requests r JOIN users u ON u.id = r.user_id ORDER BY r.id DESC`,
    )
    .all();
}

export function getRequestById(id: number): Record<string, unknown> | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT r.id, r.user_id as userId, u.email as userEmail, r.imo, r.vessel_data, r.eta, r.cargo_notes,
              r.cargo_weight_tn as cargoWeightTn, r.hours, r.usd_to_gel as usdToGel,
              r.calc_params_json as calcParamsJson, r.status, r.estimated_total_usd as estimatedTotalUsd,
              r.approved_total_usd as approvedTotalUsd, r.charges_snapshot_json as chargesSnapshotJson,
              r.created_at as createdAt, r.updated_at as updatedAt
       FROM port_requests r JOIN users u ON u.id = r.user_id WHERE r.id = ?`,
    )
    .get(id) as Record<string, unknown> | undefined;
  return row ?? null;
}

export function assertRequestAccess(requestId: number, userId: number, role: "captain" | "admin"): Record<string, unknown> {
  const row = getRequestById(requestId);
  if (!row) throw new AppError("Request not found", 404);
  if (role === "admin") return row;
  if (Number(row.userId) !== userId) throw new AppError("Forbidden", 403);
  return row;
}

export function setRequestStatus(
  requestId: number,
  action: "approve" | "reject",
  approvedTotalUsd: number | undefined,
  actorId: number,
): { estimatedTotalUsd: number; approvedTotalUsd: number | null } {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, status, estimated_total_usd FROM port_requests WHERE id = ?",
    )
    .get(requestId) as { id: number; status: PortRequestStatus; estimated_total_usd: number } | undefined;
  if (!row) throw new AppError("Request not found", 404);
  if (row.status !== "pending") throw new AppError("Request is no longer pending", 400);

  if (action === "reject") {
    db.prepare(
      `UPDATE port_requests SET status = 'rejected', updated_at = datetime('now') WHERE id = ?`,
    ).run(requestId);
    return { estimatedTotalUsd: row.estimated_total_usd, approvedTotalUsd: null };
  }

  const finalUsd =
    approvedTotalUsd !== undefined && Number.isFinite(approvedTotalUsd)
      ? round2(approvedTotalUsd)
      : round2(row.estimated_total_usd);

  db.prepare(
    `UPDATE port_requests SET status = 'approved', approved_total_usd = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(finalUsd, requestId);

  return { estimatedTotalUsd: row.estimated_total_usd, approvedTotalUsd: finalUsd };
}
