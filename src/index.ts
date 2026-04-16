import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { initDatabase } from "./db/database";

try {
  initDatabase();
  const app = createApp();
  app.listen(env.port, () => {
    logger.info("Port Disbursement API listening", { port: env.port, env: env.nodeEnv });
  });
} catch (err) {
  logger.error("Server bootstrap failed", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
}
