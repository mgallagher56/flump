import { Logger } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SLOW_QUERY_MS, resolveSlowQueryMs } from "../config/db.config";
import { MAX_SLOW_QUERY_LENGTH, SlowQueryLogger, slowQueryOptions } from "./slow-query.logger";

afterEach(() => vi.restoreAllMocks());

describe("resolveSlowQueryMs", () => {
  it("defaults to 500 ms and reads DB_SLOW_QUERY_MS", () => {
    expect(DEFAULT_SLOW_QUERY_MS).toBe(500);
    expect(resolveSlowQueryMs({})).toBe(500);
    expect(resolveSlowQueryMs({ DB_SLOW_QUERY_MS: " " })).toBe(500);
    expect(resolveSlowQueryMs({ DB_SLOW_QUERY_MS: "1200" })).toBe(1200);
  });

  it.each(["0", "fast", "1.5", "600001"])("refuses %s, naming the variable", (value) => {
    expect(() => resolveSlowQueryMs({ DB_SLOW_QUERY_MS: value })).toThrow(/^DB_SLOW_QUERY_MS/);
  });
});

describe("SlowQueryLogger", () => {
  it("logs duration and SQL, never the parameters", () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    new SlowQueryLogger().logQuerySlow(812, 'SELECT *\n  FROM "account" WHERE "userId" = $1', [
      "user_SENTINEL",
    ]);
    expect(warn).toHaveBeenCalledWith({
      event: "slow_query",
      durationMs: 812,
      query: 'SELECT * FROM "account" WHERE "userId" = $1',
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain("SENTINEL");
  });

  it("truncates long SQL", () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    new SlowQueryLogger().logQuerySlow(900, `INSERT ${"x".repeat(2000)}`);
    const query = (warn.mock.calls[0]?.[0] as { query: string } | undefined)?.query ?? "";
    expect(query.length).toBe(MAX_SLOW_QUERY_LENGTH + 3);
  });

  it("stays quiet for ordinary queries and errors", () => {
    const spies = (["log", "warn", "error"] as const).map((m) =>
      vi.spyOn(Logger.prototype, m).mockImplementation(() => undefined),
    );
    const logger = new SlowQueryLogger();
    logger.logQuery();
    logger.logQueryError();
    logger.logSchemaBuild();
    logger.log();
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it("slowQueryOptions wires the threshold and the logger for TypeORM", () => {
    const options = slowQueryOptions({ DB_SLOW_QUERY_MS: "250" });
    expect(options.maxQueryExecutionTime).toBe(250);
    expect(options.logger).toBeInstanceOf(SlowQueryLogger);
  });
});
