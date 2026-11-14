import { EventEmitter } from "node:events";
import {
  Controller,
  Get,
  type INestApplication,
  Logger,
  type LoggerService,
  Param,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { applySecurity } from "../config/security.config";
import { requestContextMiddleware } from "./request-context.middleware";

const SENTINEL = "SENTINEL-secret-value-123";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

@Controller("accounts")
class AccountsController {
  @Get(":id")
  one(@Param("id") id: string) {
    return { id };
  }
}

describe("requestContextMiddleware", () => {
  let app: INestApplication;
  let lines: Record<string, unknown>[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AccountsController],
    }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    const capture: LoggerService = {
      log: (message: unknown) => {
        if (typeof message === "object" && message !== null) {
          lines.push(message as Record<string, unknown>);
        }
      },
      error: () => undefined,
      warn: () => undefined,
    };
    app.useLogger(capture);
    app.use(requestContextMiddleware);
    applySecurity(app, { NODE_ENV: "test" });
    await app.init();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    lines = [];
  });

  it("logs one access line without URL, query, headers or body", async () => {
    await request(app.getHttpServer())
      .get(`/accounts/42?token=${SENTINEL}`)
      .set("Authorization", `Bearer ${SENTINEL}`)
      .set("Cookie", `session=${SENTINEL}`)
      .expect(200);
    expect(lines).toHaveLength(1);
    const line = lines[0] as Record<string, unknown>;
    expect(Object.keys(line).sort()).toEqual(
      ["durationMs", "method", "requestId", "route", "status"].sort(),
    );
    expect(JSON.stringify(line)).not.toContain(SENTINEL);
    expect(line).toMatchObject({ method: "GET", route: "/accounts/:id", status: 200 });
    expect(typeof line.durationMs).toBe("number");
  });

  it("logs the route template under the /v1 alias too", async () => {
    await request(app.getHttpServer()).get("/v1/accounts/42").expect(200);
    expect(lines[0]).toMatchObject({ route: "/accounts/:id", status: 200 });
  });

  it("logs 404s as unmatched", async () => {
    await request(app.getHttpServer()).get(`/nope/${SENTINEL}`).expect(404);
    expect(lines[0]).toMatchObject({ route: "unmatched", status: 404 });
    expect(JSON.stringify(lines[0])).not.toContain(SENTINEL);
  });

  it("replaces an x-request-id outside the safe pattern", async () => {
    const res = await request(app.getHttpServer())
      .get("/accounts/1")
      .set("x-request-id", "evil\tid with spaces");
    const id = res.headers["x-request-id"] as string;
    expect(id).toMatch(UUID_RE);
    expect(lines[0]?.requestId).toBe(id);
  });

  it.each(["short", "x".repeat(129), "has/slash-00", 'quote"d-0000'])(
    "replaces the unsafe x-request-id %s",
    async (supplied) => {
      const res = await request(app.getHttpServer())
        .get("/accounts/1")
        .set("x-request-id", supplied);
      expect(res.headers["x-request-id"]).toMatch(UUID_RE);
    },
  );

  it("echoes a safe non-UUID x-request-id (the web server's id format may differ)", async () => {
    const supplied = "web.req_01-ABCdef";
    const res = await request(app.getHttpServer()).get("/accounts/1").set("x-request-id", supplied);
    expect(res.headers["x-request-id"]).toBe(supplied);
    expect(lines[0]?.requestId).toBe(supplied);
  });

  it("echoes a valid UUID x-request-id", async () => {
    const supplied = "3f2b1c9e-8a47-4d6e-9b1a-0c5d7e2f4a11";
    const res = await request(app.getHttpServer()).get("/accounts/1").set("x-request-id", supplied);
    expect(res.headers["x-request-id"]).toBe(supplied);
    expect(lines[0]?.requestId).toBe(supplied);
  });
});

describe("requestContextMiddleware lifecycle (fake req/res)", () => {
  function run(route: unknown, events: ("finish" | "close")[], statusCode = 200) {
    const spy = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const res = Object.assign(new EventEmitter(), {
      statusCode,
      setHeader: () => undefined,
    });
    const req = {
      method: "GET",
      headers: {},
      route: route === undefined ? undefined : { path: route as string },
    };
    requestContextMiddleware(req, res, () => undefined);
    for (const e of events) res.emit(e);
    const calls = spy.mock.calls.map((c) => c[0] as Record<string, unknown>);
    spy.mockRestore();
    return calls;
  }

  it("logs one aborted line when the client closes before finish", () => {
    const calls = run("/accounts/:id", ["close"]);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ route: "/accounts/:id", aborted: true });
  });

  it("logs exactly once when finish is followed by close", () => {
    const calls = run("/accounts/:id", ["finish", "close"]);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.aborted).toBeUndefined();
  });

  it("treats a non-string route path as unmatched", () => {
    expect(run({ not: "a string" }, ["finish"])[0]).toMatchObject({ route: "unmatched" });
  });

  it("skips successful health probes but logs failing ones", () => {
    expect(run("/health", ["finish"])).toHaveLength(0);
    expect(run("/health/ready", ["finish"])).toHaveLength(0);
    expect(run("/health/ready", ["finish"], 503)).toHaveLength(1);
  });
});
