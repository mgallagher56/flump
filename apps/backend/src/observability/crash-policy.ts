import type { LoggerService } from "@nestjs/common";
import { closeReporter, reportException } from "./report";

/** How long a crash waits for Sentry to deliver before the process exits anyway. */
export const CRASH_FLUSH_TIMEOUT_MS = 2000;

export type CrashKind = "bootstrap" | "uncaughtException" | "unhandledRejection";

export interface CrashDeps {
  logger: Pick<LoggerService, "fatal" | "error">;
  report?: (error: unknown) => void;
  flush?: (timeoutMs: number) => Promise<void>;
  exit?: (code: number) => void;
}

let crashing = false;

/** Test seam: lets each test start from a process that has not crashed yet. */
export function resetCrashStateForTests(): void {
  crashing = false;
}

/**
 * The backend's one crash policy (L7), for a failed bootstrap, an uncaught exception and an
 * unhandled rejection alike: log once through the scrubbing logger (message and stack are
 * redacted by it; config errors carry variable names only), report to Sentry when it is on, flush
 * for at most CRASH_FLUSH_TIMEOUT_MS, then exit 1. A second crash while the first is flushing is
 * not logged again and does not delay the exit.
 */
export async function crash(kind: CrashKind, error: unknown, deps: CrashDeps): Promise<void> {
  const exit = deps.exit ?? ((code: number) => process.exit(code));
  if (crashing) return;
  crashing = true;
  try {
    const logger = deps.logger;
    const log = logger.fatal ?? logger.error;
    log.call(logger, error instanceof Error ? error : new Error(String(error)), `Crash(${kind})`);
  } catch {
    // Logging must not stop the exit.
  }
  try {
    (deps.report ?? reportException)(error);
    const flush = deps.flush ?? closeReporter;
    await Promise.race([
      flush(CRASH_FLUSH_TIMEOUT_MS),
      new Promise<void>((resolve) => setTimeout(resolve, CRASH_FLUSH_TIMEOUT_MS + 500).unref()),
    ]);
  } catch {
    // A failed flush must not stop the exit either.
  } finally {
    exit(1);
  }
}

/**
 * Routes process-level failures through `crash`. Sentry's own process integrations (when a DSN is
 * set) also capture and exit 1; Dedupe drops the second report, and whichever exit comes first
 * wins, so the outcome is the same with or without Sentry.
 */
export function installCrashHandlers(deps: CrashDeps, proc: NodeJS.Process = process): void {
  proc.on("uncaughtException", (error) => void crash("uncaughtException", error, deps));
  proc.on("unhandledRejection", (reason) => void crash("unhandledRejection", reason, deps));
}
