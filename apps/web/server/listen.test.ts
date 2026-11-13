// @vitest-environment node
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { describe, expect, it, vi } from "vitest";
import { listen, resolvePort } from "./listen";

describe("resolvePort", () => {
  it("defaults to 3000 only when PORT is unset or empty", () => {
    expect(resolvePort(undefined)).toBe(3000);
    expect(resolvePort("")).toBe(3000);
  });

  it("accepts valid ports", () => {
    expect(resolvePort("8080")).toBe(8080);
    expect(resolvePort("65535")).toBe(65535);
  });

  it("rejects invalid explicit values instead of falling back", () => {
    for (const bad of ["abc", "0", "-1", "65536", "3000x", "1.5", " 80", "123456"]) {
      expect(() => resolvePort(bad), bad).toThrow(/Invalid PORT/);
    }
  });
});

describe("listen", () => {
  it("logs the error and exits 1 when the port is in use, without a listening line", async () => {
    const blocker = createServer();
    await new Promise<void>((r) => blocker.listen(0, "127.0.0.1", r));
    const { port } = blocker.address() as AddressInfo;
    const exit = vi.fn();
    const log = vi.fn();
    const logError = vi.fn();
    const server = listen(express(), { port, host: "127.0.0.1", exit, log, logError });
    await new Promise((r) => setTimeout(r, 200));
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(logError.mock.calls[0]?.[0]).toMatch(/EADDRINUSE|in use/i);
    expect(log).not.toHaveBeenCalled();
    server.close();
    blocker.close();
  });

  it("exits 1 on an unbindable HOST", async () => {
    const exit = vi.fn();
    const log = vi.fn();
    listen(express(), { port: 0, host: "203.0.113.1", exit, log, logError: () => {} });
    await new Promise((r) => setTimeout(r, 200));
    expect(exit).toHaveBeenCalledWith(1);
    expect(log).not.toHaveBeenCalled();
  });

  it("logs a listening line on success", async () => {
    const log = vi.fn();
    const exit = vi.fn();
    const server = listen(express(), { port: 0, host: "127.0.0.1", exit, log });
    await new Promise((r) => setTimeout(r, 200));
    expect(log).toHaveBeenCalledTimes(1);
    expect(exit).not.toHaveBeenCalled();
    server.close();
  });
});
