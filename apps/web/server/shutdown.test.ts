// @vitest-environment node
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { installShutdown, resetDrainStateForTests } from "./shutdown";

describe("installShutdown", () => {
  beforeEach(() => resetDrainStateForTests());

  it("lets an in-flight request finish, then exits 0", async () => {
    const server = createServer((_req, res) => {
      setTimeout(() => res.end("done"), 300);
    });
    await new Promise<void>((r) => server.listen(0, r));
    const { port } = server.address() as AddressInfo;
    const exited = new Promise<number>((resolve) => {
      const handler = installShutdown(server, { listen: false, exit: resolve, log: () => {} });
      // Fires once the request is definitely in flight.
      setTimeout(() => handler("SIGTERM"), 100);
    });
    const response = await fetch(`http://127.0.0.1:${port}/`);
    expect(await response.text()).toBe("done");
    expect(await exited).toBe(0);
  });

  it("ignores a second signal during the drain", async () => {
    const server = createServer((_req, res) => res.end("ok"));
    await new Promise<void>((r) => server.listen(0, r));
    const close = vi.spyOn(server, "close");
    const exit = vi.fn();
    const handler = installShutdown(server, { listen: false, exit, log: () => {} });
    handler("SIGTERM");
    handler("SIGTERM");
    expect(close).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, 100));
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("forces exit 1 when the drain exceeds the limit", async () => {
    const server = createServer(() => {
      // never responds
    });
    await new Promise<void>((r) => server.listen(0, r));
    const { port } = server.address() as AddressInfo;
    const abort = new AbortController();
    fetch(`http://127.0.0.1:${port}/`, { signal: abort.signal }).catch(() => {});
    await new Promise((r) => setTimeout(r, 50));
    const exit = vi.fn();
    const handler = installShutdown(server, {
      listen: false,
      exit,
      forceExitMs: 100,
      log: () => {},
    });
    handler("SIGINT");
    await new Promise((r) => setTimeout(r, 250));
    expect(exit).toHaveBeenCalledWith(1);
    abort.abort();
    server.closeAllConnections();
  });
});
