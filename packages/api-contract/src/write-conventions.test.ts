import { describe, expect, it } from "vitest";
import { z } from "zod";
import { DEFAULT_TRANSACTION_PAGE, MAX_TRANSACTION_PAGE } from "./domains/transactions.js";
import { etagFor, IdempotencyKey, parseEtag } from "./http-headers.js";
import { allRoutes, isIdempotentRoute, type RouteDefinition, routes } from "./manifest.js";
import { buildOpenApiDocument, openApiPath } from "./openapi.js";
import { NEXT_CURSOR_HEADER, PAGE_LIMITS, PageCursor, pageQuery } from "./pagination.js";

const queryKeys = (route: RouteDefinition): string[] =>
  route.query instanceof z.ZodObject ? Object.keys(route.query.shape) : [];

type Operation = {
  parameters?: { name: string; in: string }[];
  responses: Record<string, { headers?: Record<string, unknown> }>;
};
const operation = (route: RouteDefinition): Operation => {
  const doc = buildOpenApiDocument() as { paths: Record<string, Record<string, Operation>> };
  return doc.paths[openApiPath(route)]?.[route.method.toLowerCase()] as Operation;
};

describe("pagination law (BE-09, audit M-API1)", () => {
  it("every GET route whose response is an array declares limit and cursor and a page kind", () => {
    const lists = allRoutes.filter((r) => r.method === "GET" && r.response instanceof z.ZodArray);
    expect(lists.length).toBeGreaterThan(0);
    const offenders = lists
      .filter((r) => !r.page || !queryKeys(r).includes("limit") || !queryKeys(r).includes("cursor"))
      .map((r) => r.id);
    expect(offenders).toEqual([]);
  });

  it("only list routes are paginated, and each limit is capped at its kind's maximum", () => {
    for (const route of allRoutes.filter((r) => r.page)) {
      expect(route.method, route.id).toBe("GET");
      const kind = route.page as keyof typeof PAGE_LIMITS;
      const query = route.query as z.ZodType;
      expect(query.safeParse({ limit: String(PAGE_LIMITS[kind].max) }).success, route.id).toBe(
        true,
      );
      expect(query.safeParse({ limit: String(PAGE_LIMITS[kind].max + 1) }).success).toBe(false);
      expect(query.safeParse({ limit: "0" }).success, route.id).toBe(false);
    }
  });

  it("keeps small per-user lists whole by default; transactions keep BE-08's bounds", () => {
    // The lists the web client reads whole until BE-10 follows X-Next-Cursor are larger, and
    // GET /transactions keeps the page sizes BE-08 gave it (500 by default, 1000 at most).
    const wholeForWeb: Record<string, number> = {
      accountDetails: 5000,
      tax: 2000,
      transactions: 1000,
    };
    for (const [kind, limits] of Object.entries(PAGE_LIMITS)) {
      expect(limits.default, kind).toBeLessThanOrEqual(limits.max);
      expect(limits.max, kind).toBeLessThanOrEqual(wholeForWeb[kind] ?? 500);
    }
    expect(PAGE_LIMITS.accountDetails).toEqual({ default: 5000, max: 5000 });
    expect(PAGE_LIMITS.tax).toEqual({ default: 2000, max: 2000 });
    expect(PAGE_LIMITS.accounts).toEqual({ default: 500, max: 500 });
    expect(PAGE_LIMITS.transactions).toEqual({
      default: DEFAULT_TRANSACTION_PAGE,
      max: MAX_TRANSACTION_PAGE,
    });
    expect(PAGE_LIMITS.transactions).toEqual({ default: 500, max: 1000 });
    expect(PAGE_LIMITS.activity).toEqual({ default: 100, max: 500 });
  });

  it("parses limit from the query string and rejects a malformed cursor or an unknown key", () => {
    const query = pageQuery("budget");
    expect(query.parse({ limit: "25", cursor: "eyJrIjpbXX0" })).toEqual({
      limit: 25,
      cursor: "eyJrIjpbXX0",
    });
    expect(query.parse({})).toEqual({});
    expect(query.safeParse({ cursor: "not a cursor!" }).success).toBe(false);
    expect(query.safeParse({ limit: "2.5" }).success).toBe(false);
    expect(query.safeParse({ page: "2" }).success).toBe(false);
    expect(PageCursor.safeParse("a".repeat(513)).success).toBe(false);
    expect(
      routes.transactions.list.query.parse({
        accountId: "6f1c2a4e-8b3d-4c5e-9f70-1a2b3c4d5e6f",
        limit: "10",
      }),
    ).toEqual({ accountId: "6f1c2a4e-8b3d-4c5e-9f70-1a2b3c4d5e6f", limit: 10 });
  });

  it("documents limit, cursor and the X-Next-Cursor header on every paginated route", () => {
    for (const route of allRoutes.filter((r) => r.page)) {
      const op = operation(route);
      const names = (op.parameters ?? []).map((p) => p.name);
      expect(names, route.id).toEqual(expect.arrayContaining(["limit", "cursor"]));
      expect(op.responses["200"]?.headers?.[NEXT_CURSOR_HEADER], route.id).toBeDefined();
    }
  });
});

describe("idempotency keys (BE-09, audit M7)", () => {
  it("applies to every create POST except imports.stage, mcpTokens.create and bankConnections.connect", () => {
    expect(
      allRoutes
        .filter(isIdempotentRoute)
        .map((r) => r.id)
        .sort(),
    ).toEqual([
      "accounts.create",
      "budget.addCategory",
      "budget.create",
      "tax.bulkCreate",
      "tax.create",
      "transactions.create",
    ]);
  });

  it("documents the header, the replay header and the 409 and 422 answers", () => {
    for (const route of allRoutes.filter(isIdempotentRoute)) {
      const op = operation(route);
      expect(op.parameters?.find((p) => p.name === "Idempotency-Key")?.in, route.id).toBe("header");
      expect(op.responses["201"]?.headers?.["Idempotent-Replayed"], route.id).toBeDefined();
      expect(op.responses["409"], route.id).toBeDefined();
      expect(op.responses["422"], route.id).toBeDefined();
    }
  });

  it("accepts 1 to 255 printable ASCII characters", () => {
    expect(IdempotencyKey.safeParse("a").success).toBe(true);
    expect(IdempotencyKey.safeParse("x".repeat(255)).success).toBe(true);
    expect(IdempotencyKey.safeParse("").success).toBe(false);
    expect(IdempotencyKey.safeParse("x".repeat(256)).success).toBe(false);
    expect(IdempotencyKey.safeParse("tab\there").success).toBe(false);
    expect(IdempotencyKey.safeParse("café").success).toBe(false);
  });
});

describe("conditional updates (BE-09, audit M7, L15)", () => {
  it("accounts, budget entries, tax records and the profile accept If-Match", () => {
    expect(
      allRoutes
        .filter((r) => r.etag === "conditional")
        .map((r) => r.id)
        .sort(),
    ).toEqual([
      "accounts.replace",
      "accounts.update",
      "budget.update",
      "profile.update",
      "tax.update",
    ]);
    for (const route of allRoutes.filter((r) => r.etag === "conditional")) {
      const op = operation(route);
      expect(op.parameters?.find((p) => p.name === "If-Match")?.in, route.id).toBe("header");
      expect(op.responses["412"], route.id).toBeDefined();
      expect(op.responses["200"]?.headers?.ETag, route.id).toBeDefined();
    }
  });

  it("round-trips an ETag and rejects anything else", () => {
    const at = new Date("2026-11-14T09:30:00.123Z");
    expect(etagFor(at)).toBe('"2026-11-14T09:30:00.123Z"');
    expect(parseEtag(etagFor(at))?.toISOString()).toBe(at.toISOString());
    expect(parseEtag(`W/${etagFor(at)}`)?.toISOString()).toBe(at.toISOString());
    expect(parseEtag("*")).toBeNull();
    expect(parseEtag("2026-11-14T09:30:00.123Z")).toBeNull();
    expect(parseEtag('"2026-13-40T99:99:99.999Z"')).toBeNull();
  });
});
