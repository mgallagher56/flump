import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { serializeOpenApiDocument } from "../../packages/api-contract/src/openapi";
import {
  ALLOWLIST_PATH,
  type AllowEntry,
  applyAllowlist,
  loadBaseDocument,
  OPENAPI_PATH,
  parseAllowlist,
  runCheck,
} from "./check-openapi-breaking";
import { type BreakingKind, findBreakingChanges } from "./openapi-diff";

type Json = Record<string, unknown>;

const json = (schema: Json) => ({ content: { "application/json": { schema } } });

/** A one-operation document: PATCH /v1/things/{id} with a body, a query and a 200 body. */
const doc = (parts: {
  response?: Json;
  body?: Json;
  query?: Json[];
  successCode?: string;
  extraPath?: boolean;
}): Json => ({
  openapi: "3.1.0",
  paths: {
    "/v1/things/{id}": {
      patch: {
        operationId: "things.update",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          ...(parts.query ?? []),
        ],
        requestBody: { required: true, ...json(parts.body ?? baseBody) },
        responses: {
          [parts.successCode ?? "200"]: {
            description: "ok",
            ...json(parts.response ?? baseResponse),
          },
        },
      },
      ...(parts.extraPath === false
        ? {}
        : { get: { operationId: "things.get", responses: { "200": { description: "ok" } } } }),
    },
  },
});

const baseResponse: Json = {
  type: "object",
  additionalProperties: false,
  required: ["id", "status", "amount"],
  properties: {
    id: { type: "string" },
    status: { type: "string", enum: ["open", "closed"] },
    amount: { type: "number" },
    note: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
};

const baseBody: Json = {
  type: "object",
  additionalProperties: false,
  required: ["name"],
  properties: {
    name: { type: "string", maxLength: 120 },
    kind: { type: "string", enum: ["a", "b"] },
    amount: { type: "number" },
    tags: { type: "array", items: { type: "string" }, maxItems: 20 },
  },
};

const withProps = (schema: Json, props: Json, extra: Json = {}): Json => ({
  ...schema,
  ...extra,
  properties: { ...(schema.properties as Json), ...props },
});

const without = (schema: Json, name: string): Json => {
  const { [name]: _gone, ...props } = schema.properties as Json;
  return { ...schema, properties: props };
};

const kinds = (before: Json, after: Json): BreakingKind[] =>
  findBreakingChanges(before, after).map((c) => c.kind);

describe("findBreakingChanges", () => {
  const base = doc({});

  test("no change, no findings", () => {
    expect(findBreakingChanges(base, doc({}))).toEqual([]);
  });

  test("a removed path", () => {
    expect(kinds(base, { openapi: "3.1.0", paths: {} })).toEqual(["removed-path"]);
  });

  test("a removed operation", () => {
    expect(kinds(base, doc({ extraPath: false }))).toEqual(["removed-operation"]);
  });

  test("a changed success code removes the old response", () => {
    expect(kinds(base, doc({ successCode: "201" }))).toEqual(["removed-response"]);
  });

  test("a removed response property", () => {
    expect(kinds(base, doc({ response: without(baseResponse, "note") }))).toEqual([
      "removed-response-property",
    ]);
  });

  test("a retyped response property", () => {
    const after = withProps(baseResponse, { amount: { type: "string" } });
    expect(kinds(base, doc({ response: after }))).toEqual(["retyped-response-property"]);
  });

  test("a response property that became nullable is retyped", () => {
    const after = withProps(baseResponse, {
      amount: { anyOf: [{ type: "number" }, { type: "null" }] },
    });
    expect(kinds(base, doc({ response: after }))).toEqual(["retyped-response-property"]);
  });

  test("a removed enum value in a response", () => {
    const after = withProps(baseResponse, { status: { type: "string", enum: ["open"] } });
    expect(kinds(base, doc({ response: after }))).toEqual(["removed-response-enum-value"]);
  });

  test("a request property that became required", () => {
    const after = { ...baseBody, required: ["name", "kind"] };
    expect(kinds(base, doc({ body: after }))).toEqual(["request-became-required"]);
  });

  test("a new required request field", () => {
    const after = withProps(
      baseBody,
      { currency: { type: "string" } },
      { required: ["name", "currency"] },
    );
    expect(kinds(base, doc({ body: after }))).toEqual(["new-required-request-field"]);
  });

  test("a narrowed request type: fewer types", () => {
    const after = withProps(baseBody, { amount: { type: "integer" } });
    expect(kinds(base, doc({ body: after }))).toEqual(["narrowed-request-type"]);
  });

  test("a narrowed request type: an enum value removed", () => {
    const after = withProps(baseBody, { kind: { type: "string", enum: ["a"] } });
    expect(kinds(base, doc({ body: after }))).toEqual(["narrowed-request-type"]);
  });

  test("a narrowed request type: a tighter bound", () => {
    const after = withProps(baseBody, { name: { type: "string", maxLength: 60 } });
    expect(kinds(base, doc({ body: after }))).toEqual(["narrowed-request-type"]);
  });

  test("a narrowed request type: a new pattern", () => {
    const after = withProps(baseBody, {
      name: { type: "string", maxLength: 120, pattern: "^[a-z]+$" },
    });
    expect(kinds(base, doc({ body: after }))).toEqual(["narrowed-request-type"]);
  });

  test("a narrowed request type inside an array", () => {
    const after = withProps(baseBody, {
      tags: { type: "array", items: { type: "string", maxLength: 5 }, maxItems: 20 },
    });
    expect(kinds(base, doc({ body: after }))).toEqual(["narrowed-request-type"]);
  });

  test("a removed field of a strict request object", () => {
    expect(kinds(base, doc({ body: without(baseBody, "kind") }))).toEqual([
      "removed-request-field",
    ]);
  });

  test("a new required query parameter", () => {
    const query = [{ name: "limit", in: "query", required: true, schema: { type: "number" } }];
    expect(kinds(base, doc({ query }))).toEqual(["new-required-request-field"]);
  });

  test("a query parameter that became required", () => {
    const before = doc({
      query: [{ name: "limit", in: "query", required: false, schema: { type: "number" } }],
    });
    const after = doc({
      query: [{ name: "limit", in: "query", required: true, schema: { type: "number" } }],
    });
    expect(kinds(before, after)).toEqual(["request-became-required"]);
  });

  test("a response property that went from required to optional", () => {
    const after = { ...baseResponse, required: ["id", "status"] };
    const changes = findBreakingChanges(base, doc({ response: after }));
    expect(changes.map((c) => c.kind)).toEqual(["response-became-optional"]);
    expect(changes[0]?.where).toBe("PATCH /v1/things/{id} 200 response.amount");
  });

  test("a response property that became required is not breaking", () => {
    const after = { ...baseResponse, required: ["id", "status", "amount", "note"] };
    expect(findBreakingChanges(base, doc({ response: after }))).toEqual([]);
  });

  test("allOf members are walked like one merged object", () => {
    const split = (props: Json, required: string[]): Json => ({
      allOf: [
        { type: "object", required: ["id"], properties: { id: { type: "string" } } },
        { type: "object", required, properties: props },
      ],
    });
    const { id: _id, ...rest } = baseResponse.properties as Json;
    const before = doc({ response: split(rest, ["status", "amount"]) });
    expect(
      findBreakingChanges(before, doc({ response: split(rest, ["status", "amount"]) })),
    ).toEqual([]);
    const { note: _note, ...restWithoutNote } = rest;
    expect(kinds(before, doc({ response: split(restWithoutNote, ["status", "amount"]) }))).toEqual([
      "removed-response-property",
    ]);
    expect(kinds(before, doc({ response: split(rest, ["status"]) }))).toEqual([
      "response-became-optional",
    ]);
    const retyped = { ...rest, amount: { type: "string" } };
    expect(kinds(before, doc({ response: split(retyped, ["status", "amount"]) }))).toEqual([
      "retyped-response-property",
    ]);
  });

  test("allOf in a request body: a new required field", () => {
    const before = doc({ body: { allOf: [baseBody] } });
    const after = doc({
      body: {
        allOf: [
          baseBody,
          { type: "object", required: ["currency"], properties: { currency: { type: "string" } } },
        ],
      },
    });
    expect(kinds(before, after)).toEqual(["new-required-request-field"]);
  });

  test("additive changes are not breaking", () => {
    const response = withProps(baseResponse, {
      extra: { type: "string" },
      status: { type: "string", enum: ["open", "closed", "archived"] },
    });
    const body = withProps(baseBody, {
      notes: { type: "string" },
      name: { type: "string", maxLength: 200 },
      kind: { type: "string", enum: ["a", "b", "c"] },
    });
    const query = [{ name: "limit", in: "query", required: false, schema: { type: "number" } }];
    expect(findBreakingChanges(base, doc({ response, body, query }))).toEqual([]);
  });
});

describe("runCheck", () => {
  const removedNote = doc({ response: without(baseResponse, "note") });
  const noteEntry: AllowEntry = {
    kind: "removed-response-property",
    where: "PATCH /v1/things/{id} 200 response.note",
    reason: "test",
  };
  const atBase = (d: Json) => ({ doc: d, ref: "merge base abc" });

  test("passes when committed, fresh and base are equal", () => {
    const result = runCheck({
      committed: doc({}),
      fresh: doc({}),
      base: atBase(doc({})),
      allowlist: [],
    });
    expect(result).toMatchObject({ ok: true, errors: [], warnings: [], stale: false });
  });

  test("an additive difference from the committed file fails as stale, with the regenerate command", () => {
    const fresh = doc({ body: withProps(baseBody, { notes: { type: "string" } }) });
    const result = runCheck({ committed: doc({}), fresh, base: atBase(doc({})), allowlist: [] });
    expect(result.ok).toBe(false);
    expect(result.stale).toBe(true);
    expect(result.errors.join("\n")).toContain("openapi:write");
  });

  test("a breaking change against the base fails even when openapi.json was regenerated", () => {
    const result = runCheck({
      committed: removedNote,
      fresh: removedNote,
      base: atBase(doc({})),
      allowlist: [],
    });
    expect(result.ok).toBe(false);
    expect(result.stale).toBe(false);
    const text = result.errors.join("\n");
    expect(text).toContain("[removed-response-property] PATCH /v1/things/{id} 200 response.note");
    expect(text).toContain("merge base abc");
    expect(text).toContain("openapi-breaking-allowlist.json");
    expect(text).toContain("/v2");
  });

  test("an allow-listed break passes", () => {
    const result = runCheck({
      committed: removedNote,
      fresh: removedNote,
      base: atBase(doc({})),
      allowlist: [noteEntry],
    });
    expect(result).toMatchObject({ ok: true, unallowed: [], unused: [] });
  });

  test("allow-list entries match kind and where exactly", () => {
    const wrongKind = { ...noteEntry, kind: "retyped-response-property" as const };
    const wrongWhere = { ...noteEntry, where: "PATCH /v1/things/{id} 200 response" };
    const result = runCheck({
      committed: removedNote,
      fresh: removedNote,
      base: atBase(doc({})),
      allowlist: [wrongKind, wrongWhere],
    });
    expect(result.ok).toBe(false);
    expect(result.unallowed).toHaveLength(1);
    expect(result.unused).toEqual([wrongKind, wrongWhere]);
  });

  test("an unused allow-list entry only warns", () => {
    const result = runCheck({
      committed: doc({}),
      fresh: doc({}),
      base: atBase(doc({})),
      allowlist: [noteEntry],
    });
    expect(result.ok).toBe(true);
    expect(result.warnings.join("\n")).toContain("unused allow-list entry");
  });

  test("a skipped base comparison warns and still runs the stale check", () => {
    const skipped = { skipped: "git is unavailable" };
    expect(
      runCheck({ committed: doc({}), fresh: doc({}), base: skipped, allowlist: [] }),
    ).toMatchObject({
      ok: true,
      warnings: ["check-openapi-breaking: base comparison skipped: git is unavailable"],
    });
    expect(
      runCheck({ committed: doc({}), fresh: removedNote, base: skipped, allowlist: [] }).ok,
    ).toBe(false);
  });

  test("a missing merge base fails", () => {
    const result = runCheck({
      committed: doc({}),
      fresh: doc({}),
      base: { error: "no merge base" },
      allowlist: [],
    });
    expect(result.ok).toBe(false);
  });
});

describe("applyAllowlist and parseAllowlist", () => {
  test("splits changes and unused entries", () => {
    const change = { kind: "removed-path" as const, where: "/v1/a", detail: "path removed" };
    const used: AllowEntry = { kind: "removed-path", where: "/v1/a", reason: "r" };
    const spare: AllowEntry = { kind: "removed-path", where: "/v1/b", reason: "r" };
    expect(applyAllowlist([change], [used, spare])).toEqual({ unallowed: [], unused: [spare] });
  });

  test("rejects malformed entries and entries without a reason", () => {
    expect(() => parseAllowlist({})).toThrow();
    expect(() => parseAllowlist([{ kind: "removed-path", where: "/v1/a" }])).toThrow();
    expect(() => parseAllowlist([{ kind: "removed-path", where: "/v1/a", reason: " " }])).toThrow();
  });
});

describe("loadBaseDocument", () => {
  const fake = (answers: Record<string, { ok: boolean; stdout?: string }>) => (args: string[]) => {
    const answer = answers[args.join(" ")] ?? { ok: false };
    return { ok: answer.ok, stdout: answer.stdout ?? "" };
  };

  test("reads openapi.json at the merge base with origin/main", () => {
    const git = fake({
      "rev-parse --is-inside-work-tree": { ok: true, stdout: "true" },
      "rev-parse --verify --quiet origin/main^{commit}": { ok: true },
      "merge-base origin/main HEAD": { ok: true, stdout: "abcdef1234567890\n" },
      "show abcdef1234567890:packages/api-contract/openapi.json": {
        ok: true,
        stdout: '{"paths":{}}',
      },
    });
    expect(loadBaseDocument(git)).toEqual({ doc: { paths: {} }, ref: "merge base abcdef123456" });
  });

  test("falls back to main when origin/main is missing", () => {
    const git = fake({
      "rev-parse --is-inside-work-tree": { ok: true },
      "rev-parse --verify --quiet main^{commit}": { ok: true },
      "merge-base main HEAD": { ok: true, stdout: "fedcba\n" },
      "show fedcba:packages/api-contract/openapi.json": { ok: true, stdout: "{}" },
    });
    expect(loadBaseDocument(git)).toEqual({ doc: {}, ref: "merge base fedcba" });
  });

  test("skips without git and when the file is absent at the base", () => {
    expect(loadBaseDocument(fake({}))).toHaveProperty("skipped");
    const git = fake({
      "rev-parse --is-inside-work-tree": { ok: true },
      "rev-parse --verify --quiet origin/main^{commit}": { ok: true },
      "merge-base origin/main HEAD": { ok: true, stdout: "abc\n" },
    });
    expect(loadBaseDocument(git)).toHaveProperty("skipped");
  });

  test("errors when there is no merge base (shallow checkout)", () => {
    const git = fake({
      "rev-parse --is-inside-work-tree": { ok: true },
      "rev-parse --verify --quiet origin/main^{commit}": { ok: true },
    });
    const base = loadBaseDocument(git);
    expect(base).toHaveProperty("error");
    expect(JSON.stringify(base)).toContain("fetch-depth: 0");
  });
});

describe("the committed files", () => {
  test("openapi.json matches the contract", () => {
    const committed = JSON.parse(readFileSync(OPENAPI_PATH, "utf8"));
    const fresh = JSON.parse(serializeOpenApiDocument());
    expect(runCheck({ committed, fresh, base: { skipped: "test" }, allowlist: [] }).stale).toBe(
      false,
    );
  });

  test("the allow-list parses and every entry has a reason", () => {
    expect(() => parseAllowlist(JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8")))).not.toThrow();
  });
});
