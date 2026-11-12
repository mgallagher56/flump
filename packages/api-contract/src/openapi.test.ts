import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { allRoutes } from "./manifest.js";
import { buildOpenApiDocument, openApiPath } from "./openapi.js";

type Doc = {
  paths: Record<
    string,
    Record<
      string,
      {
        operationId: string;
        requestBody?: unknown;
        parameters?: { name: string; in: string }[];
        security: unknown[];
      }
    >
  >;
};

describe("OpenAPI document", () => {
  const doc = buildOpenApiDocument() as unknown as Doc;

  it("has one operation per manifest route under /v1", () => {
    const ops = Object.values(doc.paths).flatMap((p) => Object.values(p).map((o) => o.operationId));
    expect(ops.sort()).toEqual(allRoutes.map((r) => r.id).sort());
    expect(Object.keys(doc.paths).every((p) => p.startsWith("/v1/"))).toBe(true);
  });

  it("converts path params and documents them", () => {
    const route = allRoutes.find((r) => r.path === "accounts/:id" && r.method === "GET");
    if (!route) throw new Error("route missing");
    expect(openApiPath(route)).toBe("/v1/accounts/{id}");
    const op = doc.paths["/v1/accounts/{id}"]?.get;
    expect(op?.parameters).toEqual([
      expect.objectContaining({ name: "id", in: "path", required: true }),
    ]);
  });

  it("documents request bodies and marks public routes as unauthenticated", () => {
    expect(doc.paths["/v1/accounts"]?.post?.requestBody).toBeDefined();
    expect(doc.paths["/v1/health"]?.get?.security).toEqual([]);
    expect(doc.paths["/v1/accounts"]?.get?.security).toEqual([{ bearerAuth: [] }]);
  });

  it("matches the checked-in openapi.json (run `bun run openapi` to regenerate)", () => {
    const checkedIn = JSON.parse(readFileSync(new URL("../openapi.json", import.meta.url), "utf8"));
    expect(checkedIn).toEqual(JSON.parse(JSON.stringify(doc)));
  });
});
