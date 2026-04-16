import "express";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userRole?: "captain" | "admin";
      userEmail?: string;
    }
  }
}

export {};
