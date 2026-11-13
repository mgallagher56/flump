import type { LoggerService } from "@nestjs/common";
import { ScrubbingConsoleLogger } from "./scrubbing-console-logger";

const norm = (v: string | undefined) => v?.trim().toLowerCase();

/**
 * Always a ScrubbingConsoleLogger, so every printed message, stack and object is redacted.
 * One JSON line per log entry in production or when LOG_FORMAT=json, Nest's default text otherwise.
 * Comparisons are trimmed and case-insensitive. LOG_FORMAT=text forces text output even in production;
 * any other LOG_FORMAT value falls back to the NODE_ENV rule.
 */
export function createAppLogger(env: Record<string, string | undefined>): LoggerService {
  const format = norm(env.LOG_FORMAT);
  const json = format === "json" || (format !== "text" && norm(env.NODE_ENV) === "production");
  return json
    ? new ScrubbingConsoleLogger({ json: true, colors: false })
    : new ScrubbingConsoleLogger();
}
