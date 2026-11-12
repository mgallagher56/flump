import { ConsoleLogger } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppLogger } from "./logger";

describe("createAppLogger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("emits JSON when NODE_ENV is production", () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const logger = createAppLogger({ NODE_ENV: "production" });
    logger.log("hello", "Ctx");
    const out = String(spy.mock.calls[0]?.[0]);
    expect(JSON.parse(out)).toMatchObject({ level: "log", message: "hello", context: "Ctx" });
  });

  it("emits JSON when LOG_FORMAT is json", () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    createAppLogger({ LOG_FORMAT: "json" }).log("hi");
    expect(() => JSON.parse(String(spy.mock.calls[0]?.[0]))).not.toThrow();
  });

  it("uses Nest's text format otherwise", () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const logger = createAppLogger({ NODE_ENV: "development" });
    expect(logger).toBeInstanceOf(ConsoleLogger);
    logger.log("hi");
    expect(() => JSON.parse(String(spy.mock.calls[0]?.[0]))).toThrow();
  });
});
