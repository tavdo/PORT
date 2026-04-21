import type { Request, Response, NextFunction } from "express";
import { listRecentAudit } from "../services/auditService";

export async function getAdminAudit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
    const rows = await listRecentAudit(limit);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}
