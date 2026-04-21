import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Locally we share a lockfile with the Express backend at ../, so we point
 * Next.js' workspace + tracing root there. On hosts that only see the client
 * folder (Netlify base="client", Vercel root=client, …) that parent is just
 * a checkout directory — in that case we keep the defaults so Next treats
 * the app as standalone.
 */
const monorepoRoot = path.join(__dirname, "..");
const isCiStandalone = Boolean(
  process.env.NETLIFY ||
    process.env.VERCEL ||
    process.env.CF_PAGES ||
    process.env.RAILWAY_ENVIRONMENT,
);
const isMonorepoContext =
  !isCiStandalone &&
  fs.existsSync(path.join(monorepoRoot, "package.json")) &&
  fs.existsSync(path.join(monorepoRoot, "src", "index.ts"));

/** @type {import('next').NextConfig} */
const nextConfig = isMonorepoContext
  ? {
      turbopack: { root: monorepoRoot },
      outputFileTracingRoot: monorepoRoot,
    }
  : {};

export default nextConfig;
