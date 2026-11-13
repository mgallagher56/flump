import type { Server } from "node:http";
import type { NextFunction, Request, Response } from "express";

export const FORCE_EXIT_MS = 14_000;

const state = { draining: false };

/** Once shutdown started, answers carry `Connection: close` so keep-alive sockets go idle. */
export function connectionCloseWhenDraining() {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (state.draining) res.setHeader("Connection", "close");
    next();
  };
}

interface ShutdownOptions {
  forceExitMs?: number;
  exit?: (code: number) => void;
  log?: (message: string) => void;
  /** Wire SIGTERM and SIGINT. Tests turn this off and call the returned handler. */
  listen?: boolean;
}

/**
 * Graceful shutdown for SIGTERM/SIGINT: stop accepting, let in-flight requests finish, exit 0 on a
 * clean drain, and force exit 1 after `forceExitMs` (Railway drains for 15s, apps/web/railway.json).
 */
export function installShutdown(
  server: Server,
  {
    forceExitMs = FORCE_EXIT_MS,
    exit = process.exit,
    log = console.log,
    listen = true,
  }: ShutdownOptions = {},
): (signal: string) => void {
  const handler = (signal: string): void => {
    if (state.draining) return;
    state.draining = true;
    log(`[web] ${signal} received, draining`);
    const timer = setTimeout(() => {
      log("[web] drain timed out, forcing exit");
      exit(1);
    }, forceExitMs);
    timer.unref();
    server.close((error) => {
      clearTimeout(timer);
      if (error) {
        log(`[web] close failed: ${error.message}`);
        exit(1);
        return;
      }
      exit(0);
    });
    // Idle keep-alive sockets (the platform proxy holds them) would otherwise stall close().
    server.closeIdleConnections?.();
  };
  if (listen) {
    process.once("SIGTERM", () => handler("SIGTERM"));
    process.once("SIGINT", () => handler("SIGINT"));
  }
  return handler;
}

/** Test helper: reset the module-level drain flag between cases. */
export function resetDrainStateForTests(): void {
  state.draining = false;
}
