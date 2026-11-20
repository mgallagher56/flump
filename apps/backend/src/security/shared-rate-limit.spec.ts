import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";
import { PgRateLimitStore } from "./pg-rate-limit.store";
import { MemorySharedRateLimitStore } from "./rate-limit.store";
import {
  isMissingTableError,
  SHARED_RATE_LIMIT_STORE,
  sharedRateLimitStoreProvider,
} from "./shared-rate-limit";

describe("sharedRateLimitStoreProvider", () => {
  it("uses Postgres when the module has a DataSource", async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        { provide: DataSource, useValue: { query: async () => [] } },
        sharedRateLimitStoreProvider,
      ],
    }).compile();
    expect(moduleRef.get(SHARED_RATE_LIMIT_STORE)).toBeInstanceOf(PgRateLimitStore);
  });

  it("uses the in-memory store when the module has no DataSource", async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [sharedRateLimitStoreProvider],
    }).compile();
    expect(moduleRef.get(SHARED_RATE_LIMIT_STORE)).toBeInstanceOf(MemorySharedRateLimitStore);
  });
});

describe("isMissingTableError", () => {
  it("recognises Postgres undefined_table (42P01) directly or from the driver", () => {
    expect(isMissingTableError({ code: "42P01" })).toBe(true);
    expect(isMissingTableError({ driverError: { code: "42P01" } })).toBe(true);
  });

  it("is false for other errors and for values that are not objects, without throwing", () => {
    expect(isMissingTableError({ code: "23505" })).toBe(false);
    expect(isMissingTableError({ driverError: { code: "" } })).toBe(false);
    expect(isMissingTableError(null)).toBe(false);
    expect(isMissingTableError(undefined)).toBe(false);
    expect(isMissingTableError("42P01")).toBe(false);
  });
});
