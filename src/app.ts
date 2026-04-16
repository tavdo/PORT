import express from "express";
import cors from "cors";
import { apiRouter } from "./routes/apiRoutes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";

export function createApp(): express.Application {
  const app = express();

  try {
    app.use(cors());
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
