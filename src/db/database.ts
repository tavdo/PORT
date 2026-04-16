import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { logger } from "../utils/logger";

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    throw new Error("Database not initialized");
  }
  return dbInstance;
}

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('captain', 'admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS port_requests (
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
);

CREATE TABLE IF NOT EXISTS pricing_config (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  details_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_port_requests_user ON port_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_port_requests_status ON port_requests(status);
`;

export function initDatabase(): void {
  const dbPath = env.databasePath;
  ensureDir(dbPath);
  dbInstance = new Database(dbPath);
  dbInstance.pragma("journal_mode = WAL");
  dbInstance.exec(SCHEMA);
  seedAdminIfNeeded();
  logger.info("Database ready", { path: dbPath });
}

function seedAdminIfNeeded(): void {
  if (!dbInstance) return;
  const row = dbInstance.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as { c: number };
  if (row.c > 0) return;
  const email = env.bootstrapAdminEmail;
  const password = env.bootstrapAdminPassword;
  if (!email || !password) {
    logger.warn("No admin user and ADMIN_EMAIL/ADMIN_PASSWORD not set — create admin via /api/auth/register or env");
    return;
  }
  const hash = bcrypt.hashSync(password, 10);
  dbInstance.prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'admin')").run(email, hash);
  logger.info("Seeded admin user", { email });
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
