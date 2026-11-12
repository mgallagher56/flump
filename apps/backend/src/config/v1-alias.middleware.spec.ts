import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { v1AliasMiddleware } from "./v1-alias.middleware";

const makeApp = () => {
  const app = express();
  app.use(v1AliasMiddleware);
  app.use("/tax-records", express.json({ limit: "8mb" }));
  app.use(express.json({ limit: "10b" }));
  app.use((req, res) =>
    res.json({
      url: req.url,
      original: req.originalUrl,
      query: req.query,
      bodyLen: JSON.stringify(req.body ?? {}).length,
    }),
  );
  return app;
};

describe("v1AliasMiddleware", () => {
  it("serves /v1/<path> as /<path>, keeping the query string", async () => {
    const res = await request(makeApp()).get("/v1/accounts/abc?x=1");
    expect(res.body.url).toBe("/accounts/abc?x=1");
    expect(res.body.query).toEqual({ x: "1" });
    expect(res.body.original).toBe("/v1/accounts/abc?x=1");
  });

  it("matches the prefix case-insensitively, like Express routing", async () => {
    expect((await request(makeApp()).get("/V1/accounts")).body.url).toBe("/accounts");
  });

  it("leaves unversioned paths alone", async () => {
    expect((await request(makeApp()).get("/accounts")).body.url).toBe("/accounts");
  });

  it("maps /v1 and /v1?x to the root", async () => {
    expect((await request(makeApp()).get("/v1")).body.url).toBe("/");
    expect((await request(makeApp()).get("/v1?x=1")).body.url).toBe("/?x=1");
  });

  it("does not touch look-alike prefixes", async () => {
    expect((await request(makeApp()).get("/v10/accounts")).body.url).toBe("/v10/accounts");
    expect((await request(makeApp()).get("/v1x")).body.url).toBe("/v1x");
  });

  it("applies the tax-records body limit to /v1/tax-records", async () => {
    const big = { receipt: "x".repeat(500) };
    const v1 = await request(makeApp()).post("/v1/tax-records").send(big);
    expect(v1.status).toBe(200);
    const other = await request(makeApp()).post("/v1/accounts").send(big);
    expect(other.status).toBe(413);
  });
});
