import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { initDatabase } from "./db/database";
import { refreshPricingOverrides } from "./services/pricingConfigService";

async function main(): Promise<void> {
  await initDatabase();
  await refreshPricingOverrides();
  const app = createApp();
  const host = process.env.HOST?.trim() || "0.0.0.0";
  app.listen(env.port, host, () => {
    logger.info("Port Disbursement API listening", {
      host,
      port: env.port,
      env: env.nodeEnv,
    });
  });
}

main().catch((err) => {
  logger.error("Server bootstrap failed", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
