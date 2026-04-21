import { getDb } from "../db/database";
import { logger } from "../utils/logger";

/**
 * Fire-and-forget: caller does not await. Failures are swallowed to avoid
 * cascading errors from an audit write.
 */
export function logAudit(
  actorUserId: number | null,
  action: string,
  entityType: string,
  entityId: number | null,
  details: Record<string, unknown> | null,
): void {
  void (async () => {
    try {
      const db = getDb();
      await db.execute({
        sql: `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, details_json)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          actorUserId,
          action,
          entityType,
          entityId,
          details ? JSON.stringify(details) : null,
        ],
      });
    } catch (err) {
      logger.warn("audit write failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();
}

export interface AuditEntry {
  id: number;
  actorUserId: number | null;
  action: string;
  entityType: string;
  entityId: number | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export async function listRecentAudit(limit = 100): Promise<AuditEntry[]> {
  const db = getDb();
  const rs = await db.execute({
    sql: `SELECT id, actor_user_id as actorUserId, action, entity_type as entityType,
                 entity_id as entityId, details_json as detailsJson, created_at as createdAt
          FROM audit_log ORDER BY id DESC LIMIT ?`,
    args: [limit],
  });
  const rows = rs.rows as unknown as Array<{
    id: number;
    actorUserId: number | null;
    action: string;
    entityType: string;
    entityId: number | null;
    detailsJson: string | null;
    createdAt: string;
  }>;
  return rows.map((r) => ({
    id: Number(r.id),
    actorUserId: r.actorUserId != null ? Number(r.actorUserId) : null,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId != null ? Number(r.entityId) : null,
    details: r.detailsJson ? (JSON.parse(r.detailsJson) as Record<string, unknown>) : null,
    createdAt: r.createdAt,
  }));
}
