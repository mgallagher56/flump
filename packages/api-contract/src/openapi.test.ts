import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { allRoutes, successStatusOf } from "./manifest.js";
import {
  buildOpenApiDocument,
  ERROR_RESPONSE_REF,
  openApiPath,
  serializeOpenApiDocument,
  sortKeysDeep,
} from "./openapi.js";
import { MONEY_WIRE_DESCRIPTION } from "./primitives.js";

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

  it("matches the checked-in openapi.json (run `bun run openapi:write` to regenerate)", () => {
    const checkedIn = JSON.parse(readFileSync(new URL("../openapi.json", import.meta.url), "utf8"));
    expect(checkedIn).toEqual(JSON.parse(JSON.stringify(doc)));
  });
});

describe("OpenAPI status codes, errors, money and deprecation (BE-09)", () => {
  type Op = {
    deprecated?: boolean;
    responses: Record<string, { content?: { "application/json": { schema: any } } }>;
  };
  const doc = buildOpenApiDocument() as unknown as {
    info: { description: string };
    paths: Record<string, Record<string, Op>>;
    components: { schemas: Record<string, any> };
  };
  const op = (id: string): Op => {
    const route = allRoutes.find((r) => r.id === id);
    if (!route) throw new Error(`no route ${id}`);
    const found = doc.paths[openApiPath(route)]?.[route.method.toLowerCase()];
    if (!found) throw new Error(`no operation ${id}`);
    return found;
  };
  const successCodes = (o: Op) => Object.keys(o.responses).filter((c) => c.startsWith("2"));

  it("emits each route's own success status, defaulting to 200", () => {
    for (const route of allRoutes) {
      expect(successCodes(op(route.id)), route.id).toEqual([String(successStatusOf(route))]);
    }
    expect(successCodes(op("accounts.create"))).toEqual(["201"]);
    expect(successCodes(op("imports.commit"))).toEqual(["200"]);
  });

  it("documents error responses with the shared ErrorResponse schema", () => {
    expect(doc.components.schemas.ErrorResponse).toMatchObject({
      type: "object",
      required: expect.arrayContaining(["code", "message", "requestId"]),
      additionalProperties: false,
    });
    for (const route of allRoutes) {
      const responses = op(route.id).responses;
      const errorCodes = Object.keys(responses).filter((c) => !c.startsWith("2"));
      expect(errorCodes, route.id).toContain("500");
      for (const code of errorCodes) {
        expect(
          responses[code]?.content?.["application/json"].schema,
          `${route.id} ${code}`,
        ).toEqual({
          $ref: ERROR_RESPONSE_REF,
        });
      }
      if (route.params || route.query || route.body) expect(errorCodes).toContain("400");
      if (route.auth !== "public") expect(errorCodes).toContain("401");
      else expect(errorCodes).not.toContain("401");
      if (route.params) expect(errorCodes).toContain("404");
    }
    expect(Object.keys(op("app.health").responses)).not.toContain("429");
    expect(Object.keys(op("accounts.list").responses)).toContain("429");
    expect(Object.keys(op("imports.commit").responses)).toContain("409");
  });

  it("describes money fields as JSON numbers (D9)", () => {
    const create = allRoutes.find((r) => r.id === "accounts.create");
    const body = (op("accounts.create") as unknown as { requestBody: any }).requestBody;
    expect(create).toBeDefined();
    expect(body.content["application/json"].schema.properties.balance).toMatchObject({
      type: "number",
      description: MONEY_WIRE_DESCRIPTION,
    });
    const snapshot = op("accounts.portfolioSnapshot").responses["200"]?.content?.[
      "application/json"
    ].schema;
    expect(snapshot.properties.netWorth.description).toBe(MONEY_WIRE_DESCRIPTION);
    expect(doc.info.description).toContain("decision D9");
  });

  it("marks aliases deprecated and says the unversioned surface is deprecated", () => {
    for (const route of allRoutes) {
      expect(Boolean(op(route.id).deprecated), route.id).toBe(Boolean(route.aliasOf));
    }
    expect(doc.info.description).toMatch(/without the \/v1 prefix are deprecated/);
  });

  it("serialises deterministically with sorted keys", () => {
    const text = serializeOpenApiDocument();
    expect(serializeOpenApiDocument()).toBe(text);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual([...Object.keys(parsed)].sort());
    expect(sortKeysDeep({ b: [{ d: 1, c: 2 }], a: 1 })).toEqual({ a: 1, b: [{ c: 2, d: 1 }] });
    expect(JSON.stringify(sortKeysDeep({ b: 1, a: 2 }))).toBe('{"a":2,"b":1}');
  });
});
