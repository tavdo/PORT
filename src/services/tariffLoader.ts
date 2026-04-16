import fs from "fs";
import path from "path";
import { logger } from "../utils/logger";

function dataPath(filename: string): string {
  return path.join(process.cwd(), "data", filename);
}

function distRelativeData(filename: string): string {
  return path.join(__dirname, "..", "..", "data", filename);
}

export function readDataJson<T>(filename: string): T {
  const candidates = [dataPath(filename), distRelativeData(filename)];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf8");
        return JSON.parse(raw) as T;
      }
    } catch (err) {
      logger.warn("Failed reading data file", { p, err: err instanceof Error ? err.message : err });
    }
  }
  throw new Error(`Missing data file: ${filename}`);
}
