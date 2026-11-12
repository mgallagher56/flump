import { ConsoleLogger, type LoggerService } from "@nestjs/common";

/** One JSON line per log entry in production or when LOG_FORMAT=json, Nest's default text otherwise. */
export function createAppLogger(env: Record<string, string | undefined>): LoggerService {
  const json = env.NODE_ENV === "production" || env.LOG_FORMAT === "json";
  return json ? new ConsoleLogger({ json: true, colors: false }) : new ConsoleLogger();
}
