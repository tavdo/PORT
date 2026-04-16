import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../db/database";
import { env } from "../config/env";
import { AppError } from "../utils/errors";

export type UserRole = "captain" | "admin";

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
}

export function registerUser(email: string, password: string, role: UserRole = "captain"): AuthUser {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password || password.length < 8) {
    throw new AppError("Valid email and password (min 8 chars) required", 400);
  }
  const db = getDb();
  if (role === "admin") {
    const admins = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as { c: number };
    if (admins.c > 0) {
      throw new AppError("Admin registration is disabled", 403);
    }
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    const r = db.prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)").run(normalized, hash, role);
    return { id: Number(r.lastInsertRowid), email: normalized, role };
  } catch {
    throw new AppError("Email already registered", 409);
  }
}

export function loginUser(email: string, password: string): { user: AuthUser; token: string } {
  const normalized = email.trim().toLowerCase();
  const db = getDb();
  const row = db
    .prepare("SELECT id, email, password_hash, role FROM users WHERE email = ?")
    .get(normalized) as { id: number; email: string; password_hash: string; role: UserRole } | undefined;
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    throw new AppError("Invalid email or password", 401);
  }
  const user: AuthUser = { id: row.id, email: row.email, role: row.role };
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn } as jwt.SignOptions,
  );
  return { user, token };
}

export function verifyToken(token: string): AuthUser {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload & {
      sub: number | string;
      email: string;
      role: UserRole;
    };
    const id = typeof payload.sub === "number" ? payload.sub : Number(payload.sub);
    if (!Number.isFinite(id)) throw new Error("bad sub");
    return { id, email: payload.email, role: payload.role };
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }
}

export function getUserById(id: number): AuthUser | null {
  const db = getDb();
  const row = db.prepare("SELECT id, email, role FROM users WHERE id = ?").get(id) as AuthUser | undefined;
  return row ?? null;
}
