import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  try {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    const status =
      err instanceof AppError
        ? err.statusCode
        : message === "Not Found"
          ? 404
          : 500;

    if (status >= 500) {
      logger.error("Request failed", {
        message,
        stack: err instanceof Error ? err.stack : undefined,
      });
    } else {
      logger.warn("Client error", { message });
    }

    res.status(status).json({
      error: message,
    });
  } catch (handlerErr) {
    logger.error("errorHandler failure", {
      error: handlerErr instanceof Error ? handlerErr.message : String(handlerErr),
    });
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  logger.warn("Route not found", { path: req.path, method: req.method });
  res.status(404).json({ error: "Not Found" });
}
