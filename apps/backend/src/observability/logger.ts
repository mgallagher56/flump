import { ConsoleLogger, type LoggerService } from "@nestjs/common";

const norm = (v: string | undefined) => v?.trim().toLowerCase();

/**
 * One JSON line per log entry in production or when LOG_FORMAT=json, Nest's default text otherwise.
 * Comparisons are trimmed and case-insensitive. LOG_FORMAT=text forces text output even in production;
 * any other LOG_FORMAT value falls back to the NODE_ENV rule.
 */
export function createAppLogger(env: Record<string, string | undefined>): LoggerService {
  const format = norm(env.LOG_FORMAT);
  const json = format === "json" || (format !== "text" && norm(env.NODE_ENV) === "production");
  return json ? new ConsoleLogger({ json: true, colors: false }) : new ConsoleLogger();
}
