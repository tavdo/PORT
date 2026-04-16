import "dotenv/config";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import path from "path";

const dbPath = process.env.DATABASE_PATH?.trim() || path.join(process.cwd(), "data", "port.db");
const db = new Database(dbPath);
const row = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as { c: number };
if (row.c > 0) {
  console.log("Admin already exists — skipping seed.");
  process.exit(0);
}
const email = process.env.ADMIN_EMAIL?.trim() || "admin@port.test";
const password = process.env.ADMIN_PASSWORD?.trim() || "PortAdmin2026!";
const hash = bcrypt.hashSync(password, 10);
db.prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'admin')").run(email, hash);
console.log("Seeded admin:", email);
db.close();
