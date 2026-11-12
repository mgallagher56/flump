import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HealthController } from "./health.controller";

const pkg = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf8"));

function makeRes() {
  return { status: vi.fn(), setHeader: vi.fn() };
}

function makeController(
  query: () => Promise<unknown>,
  migrations: { loaded?: number; executed?: () => Promise<unknown> } = {},
) {
  const { loaded = 1, executed = async () => [{ n: loaded }] } = migrations;
  const dataSource = {
    migrations: Array.from({ length: loaded }, () => ({})),
    query: vi.fn((sql: string) => (sql.includes("FROM migrations") ? executed() : query())),
  };
  return { controller: new HealthController(dataSource as never), dataSource };
}

describe("HealthController", () => {
  const originalSha = process.env.RAILWAY_GIT_COMMIT_SHA;
  beforeEach(() => {
    process.env.RAILWAY_GIT_COMMIT_SHA = "abcdef1234567890";
  });
  afterEach(() => {
    vi.useRealTimers();
    if (originalSha === undefined) delete process.env.RAILWAY_GIT_COMMIT_SHA;
    else process.env.RAILWAY_GIT_COMMIT_SHA = originalSha;
  });

  it("liveness returns ok without touching the DataSource", () => {
    const { controller, dataSource } = makeController(async () => [{ "?column?": 1 }]);
    const res = makeRes();
    expect(controller.live(res as never)).toEqual({ status: "ok" });
    expect(dataSource.query).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
  });

  it("readiness returns 200 with version and truncated commit", async () => {
    const { controller, dataSource } = makeController(async () => [{ "?column?": 1 }]);
    const res = makeRes();
    const body = await controller.ready(res as never);
    expect(dataSource.query).toHaveBeenCalledWith("SELECT 1");
    expect(body).toEqual({ status: "ok", version: pkg.version, commit: "abcdef1" });
    expect(res.status).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
  });

  it.each([undefined, "", "   "])("commit falls back to unknown for %j", async (sha) => {
    if (sha === undefined) delete process.env.RAILWAY_GIT_COMMIT_SHA;
    else process.env.RAILWAY_GIT_COMMIT_SHA = sha;
    const { controller } = makeController(async () => []);
    const body = await controller.ready(makeRes() as never);
    expect(body).toMatchObject({ status: "ok", commit: "unknown" });
  });

  it("returns 503 with the exact body when the query throws, leaking nothing", async () => {
    const secret = "postgres://u:hunter2@db.internal.example:5432/flump";
    process.env.DATABASE_URL = secret;
    const { controller } = makeController(async () => {
      throw new Error(`connect ECONNREFUSED db.internal.example ${secret}`);
    });
    const res = makeRes();
    const body = await controller.ready(res as never);
    delete process.env.DATABASE_URL;
    expect(res.status).toHaveBeenCalledWith(503);
    expect(body).toEqual({ status: "unavailable" });
    const serialised = JSON.stringify(body);
    expect(serialised).not.toContain("hunter2");
    expect(serialised).not.toContain("db.internal");
    expect(serialised).not.toContain("ECONNREFUSED");
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
  });

  it("returns 503 when the query hangs past 2s and clears its timer", async () => {
    vi.useFakeTimers();
    const { controller } = makeController(() => new Promise(() => {}));
    const res = makeRes();
    const pending = controller.ready(res as never);
    await vi.advanceTimersByTimeAsync(2000);
    await expect(pending).resolves.toEqual({ status: "unavailable" });
    expect(res.status).toHaveBeenCalledWith(503);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the timeout timer on success", async () => {
    vi.useFakeTimers();
    const { controller } = makeController(async () => []);
    await controller.ready(makeRes() as never);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("returns 503 with the same body when a migration is pending", async () => {
    const { controller, dataSource } = makeController(async () => [], {
      loaded: 3,
      executed: async () => [{ n: 2 }],
    });
    const res = makeRes();
    const body = await controller.ready(res as never);
    expect(dataSource.query).toHaveBeenCalledWith("SELECT count(*)::int AS n FROM migrations");
    expect(res.status).toHaveBeenCalledWith(503);
    expect(body).toEqual({ status: "unavailable" });
  });

  it("returns 200 when executed migrations equal loaded migrations", async () => {
    const { controller } = makeController(async () => [], {
      loaded: 3,
      executed: async () => [{ n: 3 }],
    });
    const res = makeRes();
    const body = await controller.ready(res as never);
    expect(res.status).not.toHaveBeenCalled();
    expect(body).toMatchObject({ status: "ok" });
  });

  it("returns 503 when the migrations table is missing", async () => {
    const { controller } = makeController(async () => [], {
      executed: async () => {
        throw new Error('relation "migrations" does not exist');
      },
    });
    const res = makeRes();
    const body = await controller.ready(res as never);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(body).toEqual({ status: "unavailable" });
  });

  it("has no AuthGuard metadata on the class or handlers", () => {
    expect(Reflect.getMetadata("__guards__", HealthController)).toBeUndefined();
    expect(Reflect.getMetadata("__guards__", HealthController.prototype.live)).toBeUndefined();
    expect(Reflect.getMetadata("__guards__", HealthController.prototype.ready)).toBeUndefined();
  });
});
