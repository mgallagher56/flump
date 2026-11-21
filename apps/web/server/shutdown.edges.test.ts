// @vitest-environment node
import { createServer } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connectionCloseWhenDraining, installShutdown, resetDrainStateForTests } from "./shutdown";

const fakeRes = () => ({ setHeader: vi.fn() });

describe("connectionCloseWhenDraining", () => {
  beforeEach(() => resetDrainStateForTests());
  afterEach(() => vi.restoreAllMocks());

  it("leaves keep-alive alone until shutdown starts, then asks clients to close", () => {
    const middleware = connectionCloseWhenDraining();
    const next = vi.fn();

    const before = fakeRes();
    middleware({} as never, before as never, next);
    expect(before.setHeader).not.toHaveBeenCalled();

    const server = createServer();
    installShutdown(server, { listen: false, exit: () => {}, log: () => {} })("SIGTERM");

    const after = fakeRes();
    middleware({} as never, after as never, next);
    expect(after.setHeader).toHaveBeenCalledWith("Connection", "close");
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("starts out not draining when the module is first loaded", async () => {
    vi.resetModules();
    const fresh = await import("./shutdown");
    const res = fakeRes();
    fresh.connectionCloseWhenDraining()({} as never, res as never, () => {});
    expect(res.setHeader).not.toHaveBeenCalled();
  });
});

describe("installShutdown details", () => {
  beforeEach(() => resetDrainStateForTests());
  afterEach(() => vi.restoreAllMocks());

  it("exits 1 when the server cannot be closed", async () => {
    // A server that never listened makes close() report ERR_SERVER_NOT_RUNNING.
    const server = createServer();
    const exit = vi.fn();
    installShutdown(server, { listen: false, exit, log: () => {} })("SIGTERM");
    await new Promise((r) => setTimeout(r, 20));
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("does not also force exit after a clean drain", async () => {
    const server = createServer();
    await new Promise<void>((r) => server.listen(0, r));
    const exit = vi.fn();
    installShutdown(server, { listen: false, exit, forceExitMs: 50, log: () => {} })("SIGTERM");
    await new Promise((r) => setTimeout(r, 150));
    expect(exit.mock.calls).toEqual([[0]]);
  });

  it("wires SIGTERM and SIGINT by default", () => {
    const listeners = new Map<string, () => void>();
    vi.spyOn(process, "on").mockImplementation(((event: string, fn: () => void) => {
      listeners.set(event, fn);
      return process;
    }) as typeof process.on);
    const server = createServer();
    const close = vi.spyOn(server, "close").mockImplementation(() => server);
    const log = vi.fn();
    installShutdown(server, { exit: () => {}, log });

    expect([...listeners.keys()].sort()).toEqual(["SIGINT", "SIGTERM"]);
    listeners.get("SIGINT")?.();
    expect(close).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toContain("SIGINT");

    resetDrainStateForTests();
    listeners.get("SIGTERM")?.();
    expect(close).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[1][0]).toContain("SIGTERM");
  });

  it("wires no signals when told not to", () => {
    const on = vi.spyOn(process, "on").mockImplementation((() => process) as typeof process.on);
    installShutdown(createServer(), { listen: false, exit: () => {}, log: () => {} });
    expect(on).not.toHaveBeenCalled();
  });
});
