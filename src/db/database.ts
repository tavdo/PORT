import { createClient, type Client, type InArgs } from "@libsql/client";
import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { logger } from "../utils/logger";

let dbInstance: Client | null = null;

export function getDb(): Client {
  if (!dbInstance) {
    throw new Error("Database not initialized");
  }
  return dbInstance;
}

/** Schema statements, executed individually so libSQL can batch them. */
const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('captain', 'admin')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS port_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    imo TEXT NOT NULL,
    vessel_data TEXT NOT NULL,
    eta TEXT,
    cargo_notes TEXT,
    cargo_weight_tn REAL,
    hours REAL NOT NULL,
    usd_to_gel REAL NOT NULL,
    calc_params_json TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')),
    estimated_total_usd REAL NOT NULL,
    approved_total_usd REAL,
    charges_snapshot_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS pricing_config (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    details_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  "CREATE INDEX IF NOT EXISTS idx_port_requests_user ON port_requests(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_port_requests_status ON port_requests(status)",
];

export async function initDatabase(): Promise<void> {
  const url = env.databaseUrl;
  const authToken = env.databaseAuthToken;

  dbInstance = createClient(
    authToken ? { url, authToken } : { url },
  );

  for (const stmt of SCHEMA_STATEMENTS) {
    await dbInstance.execute(stmt);
  }

  await seedAdminIfNeeded();
  logger.info("Database ready", { url: redactUrl(url) });
}

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return url;
  }
}

async function seedAdminIfNeeded(): Promise<void> {
  if (!dbInstance) return;
  const rs = await dbInstance.execute(
    "SELECT COUNT(*) as c FROM users WHERE role = 'admin'",
  );
  const count = Number(rs.rows[0]?.c ?? 0);
  if (count > 0) return;

  const email = env.bootstrapAdminEmail;
  const password = env.bootstrapAdminPassword;
  if (!email || !password) {
    logger.warn(
      "No admin user and ADMIN_EMAIL/ADMIN_PASSWORD not set — create admin via /api/auth/register or env",
    );
    return;
  }
  const hash = bcrypt.hashSync(password, 10);
  await dbInstance.execute({
    sql: "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'admin')",
    args: [email, hash] as InArgs,
  });
  logger.info("Seeded admin user", { email });
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
