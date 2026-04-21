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

export async function registerUser(
  email: string,
  password: string,
  role: UserRole = "captain",
): Promise<AuthUser> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password || password.length < 8) {
    throw new AppError("Valid email and password (min 8 chars) required", 400);
  }
  const db = getDb();
  if (role === "admin") {
    const admins = await db.execute(
      "SELECT COUNT(*) as c FROM users WHERE role = 'admin'",
    );
    if (Number(admins.rows[0]?.c ?? 0) > 0) {
      throw new AppError("Admin registration is disabled", 403);
    }
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    const r = await db.execute({
      sql: "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
      args: [normalized, hash, role],
    });
    const insertedId = r.lastInsertRowid;
    if (insertedId === undefined) {
      throw new AppError("Failed to create user", 500);
    }
    return { id: Number(insertedId), email: normalized, role };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Email already registered", 409);
  }
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ user: AuthUser; token: string }> {
  const normalized = email.trim().toLowerCase();
  const db = getDb();
  const rs = await db.execute({
    sql: "SELECT id, email, password_hash, role FROM users WHERE email = ?",
    args: [normalized],
  });
  const row = rs.rows[0] as unknown as
    | { id: number; email: string; password_hash: string; role: UserRole }
    | undefined;
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    throw new AppError("Invalid email or password", 401);
  }
  const user: AuthUser = { id: Number(row.id), email: row.email, role: row.role };
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

export async function getUserById(id: number): Promise<AuthUser | null> {
  const db = getDb();
  const rs = await db.execute({
    sql: "SELECT id, email, role FROM users WHERE id = ?",
    args: [id],
  });
  const row = rs.rows[0] as unknown as AuthUser | undefined;
  if (!row) return null;
  return { id: Number(row.id), email: row.email, role: row.role };
}
