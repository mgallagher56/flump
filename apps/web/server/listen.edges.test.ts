// @vitest-environment node
import express from "express";
import { describe, expect, it, vi } from "vitest";
import { listen, resolvePort } from "./listen";

describe("resolvePort bounds", () => {
  it("accepts port 1, the lowest valid port", () => {
    expect(resolvePort("1")).toBe(1);
  });

  it("rejects more than five digits even when the number is small", () => {
    expect(() => resolvePort("000080")).toThrow(/Invalid PORT/);
  });
});

describe("listen after binding", () => {
  it("exits 1 on a server error after it started listening", async () => {
    const exit = vi.fn();
    const logError = vi.fn();
    const server = listen(express(), { port: 0, exit, log: () => {}, logError });
    await new Promise((r) => server.once("listening", r));
    server.emit("error", new Error("socket failure"));
    expect(exit).toHaveBeenCalledWith(1);
    expect(logError).toHaveBeenCalledTimes(1);
    server.close();
  });
});
