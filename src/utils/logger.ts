type Level = "info" | "warn" | "error" | "debug";

function format(level: Level, message: string, meta?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    try {
      return `${base} ${JSON.stringify(meta)}`;
    } catch {
      return `${base} [meta_unserializable]`;
    }
  }
  return base;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(format("info", message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(format("warn", message, meta));
  },
  error(message: string, meta?: Record<string, unknown>): void {
    console.error(format("error", message, meta));
  },
  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(format("debug", message, meta));
    }
  },
};
