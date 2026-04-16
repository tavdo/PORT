import type { Request, Response, NextFunction } from "express";
import { registerUser, loginUser, getUserById } from "../services/authService";

export async function postRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const user = registerUser(email, password, "captain");
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    next(err);
  }
}

export async function postLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const { user, token } = loginUser(email, password);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
}

export function getMe(req: Request, res: Response): void {
  const u = getUserById(req.userId!);
  if (!u) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ id: u.id, email: u.email, role: u.role });
}
