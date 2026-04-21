import express from "express";
import cors from "cors";
import { apiRouter } from "./routes/apiRoutes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";

/**
 * Resolve allowed CORS origins from CORS_ORIGINS (comma-separated).
 * Empty / unset = allow all (useful locally and for first-deploy smoke tests).
 */
function resolveCorsOptions(): cors.CorsOptions {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) return { origin: true, credentials: true };

  const allowList = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowList.includes(origin)) return cb(null, true);
      if (allowList.some((pattern) => pattern.startsWith("*.") && origin.endsWith(pattern.slice(1)))) {
        return cb(null, true);
      }
      logger.warn("CORS blocked origin", { origin });
      cb(null, false);
    },
    credentials: true,
  };
}

export function createApp(): express.Application {
  const app = express();

  try {
    app.set("trust proxy", 1);
    app.use(cors(resolveCorsOptions()));
    app.use(express.json({ limit: "64kb" }));

    app.get("/health", (_req, res) => {
      res.json({ status: "ok" });
    });

    app.use("/api", apiRouter);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
  } catch (err) {
    logger.error("createApp failed", { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
