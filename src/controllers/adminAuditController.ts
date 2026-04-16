import type { Request, Response, NextFunction } from "express";
import { listRecentAudit } from "../services/auditService";

export function getAdminAudit(req: Request, res: Response, next: NextFunction): void {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
    res.json(listRecentAudit(limit));
  } catch (err) {
    next(err);
  }
}
