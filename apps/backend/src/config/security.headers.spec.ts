import { Controller, Get, type INestApplication, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applySecurity } from "./security.config";

@Controller()
class ProbeController {
  @Get("health")
  health() {
    return { status: "ok" };
  }

  @Get("boom")
  boom(): never {
    throw new Error("boom");
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

// ZAP reported X-Powered-By on the servers. Boot the app the way main.ts does (applySecurity on a
// Nest express app) and assert the header is absent on success, 404 and 500 responses.
describe("security headers on real responses", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ProbeModule] }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false, logger: false });
    applySecurity(app, { NODE_ENV: "production", CORS_ALLOWED_ORIGINS: "https://a.example" });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ["/health", 200],
    ["/does-not-exist", 404],
    ["/boom", 500],
  ])("omits x-powered-by on GET %s (%i)", async (path, status) => {
    const res = await request(app.getHttpServer()).get(path);
    expect(res.status).toBe(status);
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
