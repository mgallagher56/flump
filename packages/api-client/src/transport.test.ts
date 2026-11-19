import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AccountListResponse,
  BudgetEntryResponse,
  DeleteBudgetEntryResponse,
} from "@flump/api-contract";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BackendError } from "./backend-error.js";
import {
  API_VERSION_PREFIX,
  type ContractIssue,
  type ContractSchema,
  callBackend,
  callBackendAll,
  MAX_PAGES,
  parseResponse,
  stringField,
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

  it("returns the response ETag, the version of what was read or written", async () => {
    const { cfg, fetchMock } = setup();
    const etag = '"2026-04-06T09:15:00.000Z"';
    fetchMock.mockResolvedValueOnce(json(200, recorded.budgetEntry, { ETag: etag }));
    fetchMock.mockResolvedValueOnce(json(200, recorded.budgetEntry));
    const opts = { method: "PATCH", body: { amount: 1 }, schema: BudgetEntryResponse } as const;
    expect((await callBackend(cfg, "/budget-entries/x", opts)).etag).toBe(etag);
    expect((await callBackend(cfg, "/budget-entries/x", opts)).etag).toBeNull();
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
    let calls = 0;
    fetchMock.mockImplementation(async () => {
      // A page loop that never stops would fail here (as unavailable) instead of hanging.
      if (++calls > 1000) throw new Error("the page loop did not stop");
      return json(200, [], { "X-Next-Cursor": "again" });
    });
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

type Owner = { id: string; owner: { name: string } };
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * A strict schema for `{ id: string; owner: { name: string } }` that reports issues the way zod's
 * strict objects do: unknown keys as one `unrecognized_keys` issue per object, with the keys.
 * It throws after 1000 parses so a parse loop that never stops fails the test instead of hanging.
 */
function strictOwnerSchema(): ContractSchema<Owner> & { calls: () => number } {
  let calls = 0;
  return {
    calls: () => calls,
    safeParse(u: unknown) {
      calls++;
      if (calls > 1000) throw new Error("the parse loop did not stop");
      if (!isRecord(u))
        return { success: false, error: { issues: [{ path: [], code: "invalid_type" }] } };
      const issues: ContractIssue[] = [];
      const extra = Object.keys(u).filter((k) => k !== "id" && k !== "owner");
      if (extra.length > 0) issues.push({ path: [], code: "unrecognized_keys", keys: extra });
      if (typeof u.id !== "string") issues.push({ path: ["id"], code: "invalid_type" });
      const owner = u.owner;
      if (!isRecord(owner)) {
        issues.push({ path: ["owner"], code: "invalid_type" });
      } else {
        const ownerExtra = Object.keys(owner).filter((k) => k !== "name");
        if (ownerExtra.length > 0) {
          issues.push({ path: ["owner"], code: "unrecognized_keys", keys: ownerExtra });
        }
        if (typeof owner.name !== "string") {
          issues.push({ path: ["owner", "name"], code: "invalid_type" });
        }
      }
      return issues.length > 0
        ? { success: false, error: { issues } }
        : { success: true, data: u as unknown as Owner };
    },
  };
}

/** A schema that always fails with the given issues. */
const failingWith = (issues: ContractIssue[]): ContractSchema<unknown> => ({
  safeParse: () => ({ success: false, error: { issues } }),
});

/** Accepts any JSON body. */
const anyJson: ContractSchema<unknown> = { safeParse: (u) => ({ success: true, data: u }) };

describe("versionedPath with a /v1 segment further along", () => {
  it("still prefixes a path that only contains /v1 later on", () => {
    // Only a path that starts with /v1 is already versioned; "/files/v1/report" is not.
    expect(versionedPath("/files/v1/report")).toBe("/v1/files/v1/report");
  });
});

describe("request URL", () => {
  it("adds no '?' when every query value is left out", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(200, {}));
    await callBackend(cfg, "/accounts", { schema: anyJson, query: { a: null, b: undefined } });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/v1/accounts");
  });

  it("joins the query with '&' when the path already has one", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(200, {}));
    await callBackend(cfg, "/accounts?type=isa", { schema: anyJson, query: { limit: 5 } });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.example.test/v1/accounts?type=isa&limit=5",
    );
  });

  it("ignores every trailing slash on the base URL", async () => {
    const { cfg, fetchMock } = setup({ baseUrl: "https://api.example.test//" });
    fetchMock.mockResolvedValue(json(200, {}));
    await callBackend(cfg, "/accounts", { schema: anyJson });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/v1/accounts");
  });
});

describe("request headers", () => {
  it("works without a headers function", async () => {
    const { cfg, fetchMock } = setup({ headers: undefined });
    fetchMock.mockResolvedValue(json(200, { ok: true }));
    await expect(callBackend(cfg, "/x", { schema: anyJson })).resolves.toMatchObject({
      data: { ok: true },
    });
    expect(fetchMock.mock.calls[0][1].headers).toEqual({});
  });

  it("sends neither Content-Type nor If-Match on a plain GET", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(200, {}));
    await callBackend(cfg, "/x", { schema: anyJson });
    const { headers } = fetchMock.mock.calls[0][1];
    // A key with an undefined value would reach the wire as the text "undefined".
    expect(headers).not.toHaveProperty("Content-Type");
    expect(headers).not.toHaveProperty("If-Match");
  });
});

describe("failure causes", () => {
  it("keeps the underlying error as the cause of a header or transport failure", async () => {
    const storeError = new Error("token store");
    const { cfg } = setup({
      headers: () => {
        throw storeError;
      },
    });
    const headerErr = await callBackend(cfg, "/x", { schema: anyJson }).catch((e) => e);
    expect(headerErr).toMatchObject({ kind: "unavailable" });
    expect(headerErr.cause).toBe(storeError);

    const second = setup();
    const networkError = new TypeError("fetch failed");
    second.fetchMock.mockRejectedValue(networkError);
    const fetchErr = await callBackend(second.cfg, "/x", { schema: anyJson }).catch((e) => e);
    expect(fetchErr).toMatchObject({ kind: "unavailable" });
    expect(fetchErr.cause).toBe(networkError);
  });
});

describe("response bodies", () => {
  it("ignores a body that comes back from a no-body endpoint", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(200, { unexpected: true }));
    await expect(
      callBackend(cfg, "/x", { method: "DELETE", schema: null, allowEmpty: true }),
    ).resolves.toMatchObject({ data: undefined, status: 200 });
  });

  it("treats a whitespace-only body as empty when empty is allowed", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(new Response(" \n ", { status: 200 }));
    await expect(
      callBackend(cfg, "/x", { schema: anyJson, allowEmpty: true }),
    ).resolves.toMatchObject({ data: undefined });
  });
});

describe("timers", () => {
  afterEach(() => vi.useRealTimers());

  it("reports a timeout while the body is read as unavailable, with the status", async () => {
    vi.useFakeTimers();
    const { cfg, fetchMock } = setup();
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const res = json(200, {});
      // The body never arrives; reading it ends only when the call's signal aborts.
      vi.spyOn(res, "text").mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
          }),
      );
      return res;
    });
    const pending = callBackend(cfg, "/x", { schema: anyJson, timeoutMs: 100 }).catch((e) => e);
    await vi.advanceTimersByTimeAsync(101);
    const err = await pending;
    expect(err).toMatchObject({ kind: "unavailable", status: 200 });
    // The failed read is kept as the cause, for a report.
    expect(err.cause).toBeInstanceOf(Error);
  });

  it("leaves no timer running once a call has finished", async () => {
    vi.useFakeTimers();
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(200, {}));
    await callBackend(cfg, "/x", { schema: anyJson });
    // A forgotten 15 s timeout would keep a server or CLI process alive after the call.
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("issue paths", () => {
  it("joins nested paths with dots and names symbol keys by their description", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(200, {}));
    const schema = failingWith([
      { path: ["details", 0, "value"] },
      { path: [Symbol("tag")] },
      { path: [Symbol()] },
    ]);
    const err = await callBackend(cfg, "/x", { schema }).catch((e) => e);
    // ["details", 0, "value"] -> "details.0.value"; Symbol("tag") -> "tag"; a bare Symbol() has
    // no description, so it is named "symbol".
    expect(err.issuePaths).toEqual(["details.0.value", "tag", "symbol"]);
  });

  it("keeps at most 20 paths, the first ones", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(200, {}));
    const names = Array.from({ length: 25 }, (_, i) => `field${i}`);
    const schema = failingWith(names.map((n) => ({ path: [n] })));
    const err = await callBackend(cfg, "/x", { schema }).catch((e) => e);
    // 25 failures are reported; the error keeps field0 to field19 so it stays small.
    expect(err.issuePaths).toEqual(names.slice(0, 20));
  });
});

describe("stringField", () => {
  it("is undefined for a value that is not an object", () => {
    expect(stringField("text", "length")).toBeUndefined();
    expect(stringField(5, "code")).toBeUndefined();
    expect(stringField(null, "code")).toBeUndefined();
    expect(stringField({ code: "x" }, "code")).toBe("x");
    expect(stringField({ code: 1 }, "code")).toBeUndefined();
  });
});

describe("error envelope, field by field", () => {
  it("reads code from a body that is not the envelope", async () => {
    const { cfg, fetchMock } = setup();
    // No message or requestId, so not the envelope; code is still read on its own.
    fetchMock.mockResolvedValue(json(409, { code: "conflict" }));
    const err = await callBackend(cfg, "/x", { schema: anyJson }).catch((e) => e);
    expect(err).toMatchObject({ kind: "client", status: 409, code: "conflict" });
  });

  it("maps the legacy 403 { error: 'not_invited' } body to not-invited", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(403, { error: "not_invited" }));
    const err = await callBackend(cfg, "/x", { schema: anyJson }).catch((e) => e);
    expect(err).toMatchObject({ kind: "not-invited", status: 403 });
  });

  it("treats not_invited as the beta refusal only on a 403", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(
      json(400, { code: "not_invited", message: "m", requestId: "req-1" }),
    );
    const err = await callBackend(cfg, "/x", { schema: anyJson }).catch((e) => e);
    // 400 maps to "client" by status; the beta refusal is a 403 only.
    expect(err).toMatchObject({ kind: "client", status: 400 });
  });

  it("never surfaces a 401 message as detail", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(
      json(401, { code: "unauthorised", message: "Secret", requestId: "r" }),
    );
    const err = await callBackend(cfg, "/x", { schema: anyJson }).catch((e) => e);
    expect(err).toMatchObject({ kind: "unauthorised", status: 401 });
    expect(err.detail).toBeUndefined();
  });
});

describe("parseResponse with a strict schema", () => {
  it("drops unknown keys at any depth and parses again, leaving the input untouched", () => {
    const schema = strictOwnerSchema();
    const body = { id: "a", owner: { name: "b", nickname: "c" }, addedLater: 1 };
    const result = parseResponse(schema, body);
    expect(result).toEqual({ success: true, data: { id: "a", owner: { name: "b" } } });
    expect(body).toEqual({ id: "a", owner: { name: "b", nickname: "c" }, addedLater: 1 });
  });

  it("fails at once, with every issue as reported, when any issue is not an unknown key", () => {
    const schema = strictOwnerSchema();
    // owner is an array where an object belongs, and there is also an unknown key.
    const result = parseResponse(schema, { id: "a", owner: [], addedLater: 1 });
    expect(result).toEqual({
      success: false,
      error: {
        issues: [
          { path: [], code: "unrecognized_keys", keys: ["addedLater"] },
          { path: ["owner"], code: "invalid_type" },
        ],
      },
    });
    expect(schema.calls()).toBe(1);
  });

  it("gives up with a failure on a schema that keeps reporting unknown keys", () => {
    let calls = 0;
    const stubborn: ContractSchema<unknown> = {
      safeParse: () => {
        calls++;
        if (calls > 1000) throw new Error("the parse loop did not stop");
        return {
          success: false,
          error: { issues: [{ path: [], code: "unrecognized_keys", keys: ["ghost"] }] },
        };
      },
    };
    const result = parseResponse(stubborn, { id: "a" });
    expect(result.success).toBe(false);
  });
});

describe("callBackendAll requests", () => {
  it("GETs each page", async () => {
    const { cfg, fetchMock } = setup();
    fetchMock.mockResolvedValue(json(200, recorded.accountsPage2));
    await callBackendAll(cfg, "/accounts", { schema: AccountListResponse });
    expect(fetchMock.mock.calls[0][1].method).toBe("GET");
  });

  it("quotes the last request id when it stops a server that never ends", async () => {
    const { cfg, fetchMock } = setup({ headers: () => ({}) });
    let calls = 0;
    fetchMock.mockImplementation(async () => {
      // A page loop that never stops would fail here (as unavailable) instead of hanging.
      if (++calls > 1000) throw new Error("the page loop did not stop");
      return json(200, [], { "X-Next-Cursor": "again", "x-request-id": "loop-1" });
    });
    const err = await callBackendAll(cfg, "/accounts", { schema: AccountListResponse }).catch(
      (e) => e,
    );
    expect(err).toMatchObject({ kind: "bad-response", requestId: "loop-1" });
  });
});
