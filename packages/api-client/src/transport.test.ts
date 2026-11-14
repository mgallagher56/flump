import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AccountListResponse,
  BudgetEntryResponse,
  DeleteBudgetEntryResponse,
} from "@flump/api-contract";
import { describe, expect, it, vi } from "vitest";
import { BackendError } from "./backend-error.js";
import {
  API_VERSION_PREFIX,
  callBackend,
  callBackendAll,
  MAX_PAGES,
  type TransportConfig,
  versionedPath,
} from "./transport.js";

const recorded = JSON.parse(
  readFileSync(join(__dirname, "__fixtures__", "recorded-responses.json"), "utf8"),
);

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function setup(overrides: Partial<TransportConfig> = {}) {
  const fetchMock = vi.fn();
  const cfg: TransportConfig = {
    baseUrl: "https://api.example.test/",
    fetch: fetchMock as unknown as typeof fetch,
    headers: () => ({ Authorization: "Bearer tok", "x-request-id": "sent-1" }),
    ...overrides,
  };
  return { cfg, fetchMock };
}

describe("versionedPath", () => {
  it("prefixes /v1 once", () => {
    expect(API_VERSION_PREFIX).toBe("/v1");
    expect(versionedPath("/accounts")).toBe("/v1/accounts");
    expect(versionedPath("accounts")).toBe("/v1/accounts");
    expect(versionedPath("/v1/accounts")).toBe("/v1/accounts");
    expect(versionedPath("/v1")).toBe("/v1");
    expect(versionedPath("/v1?x=1")).toBe("/v1?x=1");
    expect(versionedPath("/v10/x")).toBe("/v1/v10/x");
  });
});

describe("callBackend against recorded responses", () => {
  it("calls /v1 and parses a recorded list with its contract schema", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(200, recorded.accountsPage1, { "x-request-id": "res-1" }));
    const result = await callBackend(cfg, "/accounts", { schema: AccountListResponse });
    expect(result.data[0]?.details[0]?.value).toBe(1100.1);
    expect(result).toMatchObject({ status: 200, nextCursor: null, requestId: "res-1" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/v1/accounts");
    expect(init.headers.Authorization).toBe("Bearer tok");
  });

  it("skips versioning when the config says so (a proxy that adds /v1 itself)", async () => {
    const { cfg, fetchMock } = setup({
      baseUrl: "/api",
      version: false,
      credentials: "same-origin",
    });
    fetchMock.mockResolvedValue(json(200, recorded.budgetEntry));
    await callBackend(cfg, "/budget-entries/x", { schema: BudgetEntryResponse });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/budget-entries/x");
    expect(init.credentials).toBe("same-origin");
  });

  it("maps a shape mismatch to bad-response with the request id and issue paths, never values", async () => {
    const { cfg, fetchMock } = setup();
    const leaked = { ...recorded.budgetEntry, amount: "secret-1200.00", internalNote: "secret" };
    fetchMock.mockResolvedValue(json(201, leaked, { "x-request-id": "res-bad" }));
    const err = await callBackend(cfg, "/budget-entries", {
      method: "POST",
      body: {},
      schema: BudgetEntryResponse,
    }).catch((e) => e);
    expect(err).toBeInstanceOf(BackendError);
    expect(err).toMatchObject({ kind: "bad-response", status: 201, requestId: "res-bad" });
    expect(err.issuePaths).toEqual(expect.arrayContaining(["amount"]));
    expect(err.cause).toBeUndefined();
    expect(JSON.stringify({ ...err, message: err.message })).not.toContain("secret");
  });

  it("falls back to the sent request id when the response has none", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(200, { nope: true }));
    const err = await callBackend(cfg, "/x", { schema: DeleteBudgetEntryResponse }).catch((e) => e);
    expect(err).toMatchObject({ kind: "bad-response", requestId: "sent-1" });
  });

  it("returns undefined for no-body endpoints and rejects an empty body otherwise", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(
      callBackend(cfg, "/x", { method: "DELETE", schema: null, allowEmpty: true }),
    ).resolves.toMatchObject({ data: undefined, status: 204 });
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 }));
    await expect(
      callBackend(cfg, "/x", { schema: DeleteBudgetEntryResponse }),
    ).rejects.toMatchObject({ kind: "bad-response" });
  });

  it("appends the query", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(200, []));
    await callBackend(cfg, "/accounts", {
      schema: AccountListResponse,
      query: { limit: 10, cursor: undefined, anonymize: null },
    });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/v1/accounts?limit=10");
  });
});

describe("write conventions", () => {
  it("sends a fresh Idempotency-Key on every POST unless told not to", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockImplementation(async () => json(201, recorded.budgetEntry));
    const post = { method: "POST", body: { name: "Gym" }, schema: BudgetEntryResponse } as const;
    await callBackend(cfg, "/budget-entries", post);
    await callBackend(cfg, "/budget-entries", post);
    await callBackend(cfg, "/budget-entries", { ...post, idempotencyKey: "retry-me" });
    await callBackend(cfg, "/budget-entries", { ...post, idempotencyKey: false });
    const keys = fetchMock.mock.calls.map(([, init]) => init.headers["Idempotency-Key"]);
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(keys[1]).toMatch(/^[0-9a-f-]{36}$/);
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[2]).toBe("retry-me");
    expect(keys[3]).toBeUndefined();
  });

  it("never sends Idempotency-Key on other methods, and sends If-Match when given", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(200, recorded.budgetEntry));
    await callBackend(cfg, "/budget-entries/x", {
      method: "PATCH",
      body: { amount: 1 },
      schema: BudgetEntryResponse,
      ifMatch: '"2026-04-06T09:15:00.000Z"',
    });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Idempotency-Key"]).toBeUndefined();
    expect(init.headers["If-Match"]).toBe('"2026-04-06T09:15:00.000Z"');
    expect(init.headers["Content-Type"]).toBe("application/json");
  });
});

describe("error envelope", () => {
  it("maps a validation failure: code, request id and the message as detail", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(400, recorded.validationFailed));
    const err = await callBackend(cfg, "/x", { schema: BudgetEntryResponse }).catch((e) => e);
    expect(err).toMatchObject({
      kind: "client",
      status: 400,
      code: "validation_failed",
      requestId: "req-validation-1",
      detail: "Request failed validation",
    });
    expect(err.message).not.toContain("Request failed validation");
  });

  it("maps 403 not_invited to its own kind without detail", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(403, recorded.notInvited));
    const err = await callBackend(cfg, "/x", { schema: BudgetEntryResponse }).catch((e) => e);
    expect(err).toMatchObject({ kind: "not-invited", status: 403, code: "not_invited" });
    expect(err.detail).toBeUndefined();
  });

  it("keeps 412 and 410 statuses with their codes", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(json(412, recorded.preconditionFailed));
    await expect(callBackend(cfg, "/x", { schema: BudgetEntryResponse })).rejects.toMatchObject({
      kind: "client",
      status: 412,
      code: "precondition_failed",
    });
    fetchMock.mockResolvedValueOnce(json(410, recorded.gone));
    await expect(callBackend(cfg, "/x", { schema: BudgetEntryResponse })).rejects.toMatchObject({
      status: 410,
      code: "account_deleted",
      requestId: "req-410-1",
    });
  });

  it("uses the response request id for a non-envelope error", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(
      new Response("<html>bad gateway</html>", {
        status: 502,
        headers: { "x-request-id": "edge-7" },
      }),
    );
    const err = await callBackend(cfg, "/x", { schema: BudgetEntryResponse }).catch((e) => e);
    expect(err).toMatchObject({ kind: "server", status: 502, requestId: "edge-7" });
    expect(err.code).toBeUndefined();
    expect(JSON.stringify(err)).not.toContain("bad gateway");
  });

  it("reports a header failure and a transport failure as unavailable", async () => {
    const { cfg, fetchMock } = setup({
      headers: () => {
        throw new Error("token store");
      },
    });
    await expect(callBackend(cfg, "/x", { schema: BudgetEntryResponse })).rejects.toMatchObject({
      kind: "unavailable",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    const second = setup();
    second.fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(
      callBackend(second.cfg, "/x", { schema: BudgetEntryResponse }),
    ).rejects.toMatchObject({ kind: "unavailable" });
  });
});

describe("callBackendAll", () => {
  it("follows X-Next-Cursor until it is absent and joins the pages", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock
      .mockResolvedValueOnce(json(200, recorded.accountsPage1, { "X-Next-Cursor": "abc_123" }))
      .mockResolvedValueOnce(json(200, recorded.accountsPage2));
    const result = await callBackendAll(cfg, "/accounts", {
      schema: AccountListResponse,
      query: { limit: 1 },
    });
    expect(result.data.map((a) => a.name)).toEqual(["Everyday current", "Home"]);
    expect(result.nextCursor).toBeNull();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.example.test/v1/accounts?limit=1",
      "https://api.example.test/v1/accounts?limit=1&cursor=abc_123",
    ]);
  });

  it("stops a server that never ends with bad-response", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockImplementation(async () => json(200, [], { "X-Next-Cursor": "again" }));
    await expect(
      callBackendAll(cfg, "/accounts", { schema: AccountListResponse }),
    ).rejects.toMatchObject({ kind: "bad-response" });
    expect(fetchMock).toHaveBeenCalledTimes(MAX_PAGES);
  });

  it("validates every page", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock
      .mockResolvedValueOnce(json(200, recorded.accountsPage1, { "X-Next-Cursor": "p2" }))
      .mockResolvedValueOnce(
        json(200, [{ ...recorded.accountsPage2[0], balance: "not a number" }]),
      );
    await expect(
      callBackendAll(cfg, "/accounts", { schema: AccountListResponse }),
    ).rejects.toMatchObject({ kind: "bad-response" });
  });
});

describe("error endpoint", () => {
  it("never carries the query (a cursor can encode a row's sort key)", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(500, {}));
    const err = await callBackend(cfg, "/accounts", {
      schema: AccountListResponse,
      query: { cursor: "c2VjcmV0LXNvcnQta2V5", limit: 1 },
    }).catch((e) => e);
    expect(err).toBeInstanceOf(BackendError);
    expect(err.endpoint).toBe("/accounts");
    expect(err.message).not.toContain("c2VjcmV0");
  });
});

describe("unknown response fields (additive v1 changes)", () => {
  it("ignores a field a newer backend adds, at any depth", async () => {
    const { cfg, fetchMock } = setup();
    const rows = recorded.accountsPage2 as Array<Record<string, unknown>>;
    fetchMock.mockResolvedValue(
      json(
        200,
        rows.map((r) => ({ ...r, addedLater: true })),
      ),
    );
    const { data } = await callBackend(cfg, "/accounts", { schema: AccountListResponse });
    expect(data).toHaveLength(rows.length);
    expect(data[0]).not.toHaveProperty("addedLater");
  });

  it("still fails when a known field is missing or mistyped", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(200, [{ addedLater: true }]));
    await expect(
      callBackend(cfg, "/accounts", { schema: AccountListResponse }),
    ).rejects.toMatchObject({ kind: "bad-response", requestId: "sent-1" });
  });
});
