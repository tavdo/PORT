import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/authService";
import type { UserRole } from "../services/authService";

function extractBearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim() || null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractBearer(req);
    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const user = verifyToken(token);
    req.userId = user.id;
    req.userRole = user.role;
    req.userEmail = user.email;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
