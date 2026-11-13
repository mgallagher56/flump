import type { Server } from "node:http";
import type { Express } from "express";

export const DEFAULT_PORT = 3000;

/** PORT unset or empty gives 3000. An explicit value must be an integer from 1 to 65535. */
export function resolvePort(raw: string | undefined): number {
  if (raw === undefined || raw === "") return DEFAULT_PORT;
  const port = /^\d{1,5}$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT "${raw}": expected an integer from 1 to 65535.`);
  }
  return port;
}

interface ListenOptions {
  port: number;
  host?: string;
  exit?: (code: number) => void;
  log?: (message: string) => void;
  logError?: (message: string) => void;
}

/**
 * Starts listening. Express 5 hands bind failures (EADDRINUSE, a bad HOST) to the listen callback
 * instead of throwing, so a naive callback would print "listening" and the process would idle or
 * exit 0, and Railway's ON_FAILURE restart would never trigger. Any bind or server error logs and
 * exits 1.
 */
export function listen(
  app: Express,
  { port, host, exit = process.exit, log = console.log, logError = console.error }: ListenOptions,
): Server {
  let failed = false;
  const fail = (error: Error) => {
    if (failed) return;
    failed = true;
    logError(`[web] cannot listen on ${host ?? "0.0.0.0"}:${port}: ${error.message}`);
    exit(1);
  };
  const onListen = (error?: Error) => {
    if (error) return fail(error);
    log(`[web] http://localhost:${port}${host ? ` (host ${host})` : ""}`);
  };
  const server = host ? app.listen(port, host, onListen) : app.listen(port, onListen);
  server.on("error", fail);
  return server;
}
