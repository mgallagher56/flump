import { Controller, Get, type INestApplication, type LoggerService, Param } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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

  it("replaces a non-UUID x-request-id", async () => {
    const res = await request(app.getHttpServer())
      .get("/accounts/1")
      .set("x-request-id", "evil\tid with spaces");
    const id = res.headers["x-request-id"] as string;
    expect(id).toMatch(UUID_RE);
    expect(lines[0]?.requestId).toBe(id);
  });

  it("echoes a valid UUID x-request-id", async () => {
    const supplied = "3f2b1c9e-8a47-4d6e-9b1a-0c5d7e2f4a11";
    const res = await request(app.getHttpServer()).get("/accounts/1").set("x-request-id", supplied);
    expect(res.headers["x-request-id"]).toBe(supplied);
    expect(lines[0]?.requestId).toBe(supplied);
  });
});
