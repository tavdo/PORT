import { getDb } from "../db/database";

export function logAudit(
  actorUserId: number | null,
  action: string,
  entityType: string,
  entityId: number | null,
  details: Record<string, unknown> | null,
): void {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, details_json)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(actorUserId, action, entityType, entityId, details ? JSON.stringify(details) : null);
  } catch {
    /* avoid throwing from audit */
  }
}

export function listRecentAudit(limit = 100): Array<{
  id: number;
  actorUserId: number | null;
  action: string;
  entityType: string;
  entityId: number | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, actor_user_id as actorUserId, action, entity_type as entityType, entity_id as entityId,
              details_json as detailsJson, created_at as createdAt
       FROM audit_log ORDER BY id DESC LIMIT ?`,
    )
    .all(limit) as Array<{
    id: number;
    actorUserId: number | null;
    action: string;
    entityType: string;
    entityId: number | null;
    detailsJson: string | null;
    createdAt: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    actorUserId: r.actorUserId,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    details: r.detailsJson ? (JSON.parse(r.detailsJson) as Record<string, unknown>) : null,
    createdAt: r.createdAt,
  }));
}
