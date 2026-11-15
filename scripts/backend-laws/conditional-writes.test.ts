import { describe, expect, test } from "bun:test";
import {
  checkConditionalWrites,
  findWebWrites,
  handlerReadsIfMatch,
  isProductionSource,
  routeFor,
} from "./check-conditional-writes";

const ROUTES = [
  { id: "accounts.update", method: "PATCH", path: "accounts/:id", etag: "conditional" },
  { id: "accounts.list", method: "GET", path: "accounts", etag: "read" },
  { id: "snapshots.upsert", method: "PUT", path: "snapshots/:month", etag: "conditional" },
  { id: "profile.updateChecklist", method: "PATCH", path: "user-profile/checklist" },
] as const;

const CONTROLLERS = [
  `@Controller()
   export class FinanceController {
     @Patch("accounts/:id")
     async update(@Headers("if-match") ifMatch?: string) {}
     @Patch("user-profile/checklist")
     async checklist() {}
   }`,
  `@Controller("snapshots")
   export class SnapshotsController {
     @Put(":month")
     async upsert(@Headers("If-Match") ifMatch?: string) {}
   }`,
];

const GOOD_WEB = `
  await backendFetch(\`/accounts/\${encodeURIComponent(String(id ?? ""))}\`, {
    method: "PATCH", body, ifMatch: ifMatchFromForm(formData),
  });
  await apiFetchVersioned(\`/snapshots/\${month}\`, { method: "PUT", body, ifMatch });
  await apiFetch("/user-profile/checklist", { method: "PATCH", body });
`;

const check = (
  web: string,
  overrides: Partial<Parameters<typeof checkConditionalWrites>[0]> = {},
) =>
  checkConditionalWrites({
    routes: ROUTES,
    unconditional: ["profile.updateChecklist"],
    webWrites: findWebWrites(web, "page.tsx"),
    controllers: CONTROLLERS,
    ...overrides,
  });

describe("conditional-writes law (BE-16, M7)", () => {
  test("passes when every update route is conditional or listed, and every caller sends ifMatch", () => {
    expect(check(GOOD_WEB)).toEqual([]);
  });

  test("fails a PATCH or PUT route with no ETag that is not a listed exception", () => {
    const errors = check(GOOD_WEB, { unconditional: [] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("profile.updateChecklist");
    expect(errors[0]).toContain("takes no If-Match");
  });

  test("fails a listed exception that is conditional or is not an update route", () => {
    const errors = check(GOOD_WEB, {
      unconditional: ["profile.updateChecklist", "accounts.update", "accounts.list"],
    });
    expect(errors).toEqual([
      "UNCONDITIONAL_UPDATE_ROUTES lists accounts.update, which is conditional: remove it",
      "UNCONDITIONAL_UPDATE_ROUTES lists accounts.list, which is not an update route",
    ]);
  });

  test("fails a web write to a conditional route that sends no ifMatch", () => {
    const errors = check(
      `${GOOD_WEB}\n await apiFetch(\`/accounts/\${id}\`, { method: "PATCH", body });`,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("page.tsx:8");
    expect(errors[0]).toContain("sends no ifMatch");
    // `ifMatch: undefined` written out is not sending it.
    expect(
      check(`${GOOD_WEB}\n apiFetch("/accounts/1", { method: "PATCH", ifMatch: undefined });`),
    ).toHaveLength(1);
  });

  test("fails a conditional route that no web caller sends ifMatch to", () => {
    const errors = check(`await apiFetch(\`/accounts/\${id}\`, { method: "PATCH", ifMatch });`);
    expect(errors).toEqual([
      "snapshots.upsert is conditional, but no web caller sends ifMatch to it",
    ]);
  });

  test("fails a write the scan cannot read: a variable method, a shorthand, a spread or a dynamic path", () => {
    for (const call of [
      `backendFetch(endpoint, { accessToken, method, body, schema });`,
      `apiFetch("/accounts/1", { method: verb, body });`,
      `apiFetch("/accounts/1", { ...options, schema });`,
      `apiFetch(path, { method: "PATCH", body, ifMatch });`,
    ]) {
      const errors = check(`${GOOD_WEB}\n ${call}`);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("cannot be checked");
    }
  });

  test("fails a write to a path that is not a contract route", () => {
    const errors = check(`${GOOD_WEB}\n apiFetch("/accounts/1/rename", { method: "PATCH" });`);
    expect(errors).toEqual(["page.tsx:8: PATCH /accounts/1/rename matches no contract route"]);
  });

  test("ignores reads, creates, deletes, declarations, comments and imports", () => {
    const writes = findWebWrites(
      `import { apiFetch } from "~/services/api-client";
       // apiFetch("/accounts/1", { method: "PATCH" })
       export async function apiFetch<T>(endpoint: string, opts: Options<T>) {}
       await apiFetch("/accounts", { schema });
       await apiFetch("/accounts", { method: "POST", body });
       await backendFetch(\`/accounts/\${id}\`, { method: "DELETE" });
       const call = apiFetch;`,
      "x.ts",
    );
    expect(writes).toEqual([]);
  });

  test("fails a conditional route whose backend handler does not read if-match", () => {
    const errors = check(GOOD_WEB, {
      controllers: [
        `@Controller()
         export class C {
           @Patch("accounts/:id")
           async update() {}
           @Put("snapshots/:month")
           async upsert(@Headers("if-match") ifMatch?: string) {}
         }`,
      ],
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("no backend handler for PATCH /accounts/:id reads the if-match");
  });

  test("handlerReadsIfMatch looks only at the route's own handler and honours a prefix", () => {
    const route = { id: "a", method: "PATCH", path: "accounts/:id", etag: "conditional" } as const;
    expect(
      handlerReadsIfMatch(
        `@Patch("accounts/:id") async a() {} @Patch("other") async b(@Headers("if-match") m) {}`,
        route,
      ),
    ).toBe(false);
    expect(
      handlerReadsIfMatch(
        `@Controller("accounts") class C { @Patch(":id") async a(@Headers("if-match") m) {} }`,
        route,
      ),
    ).toBe(true);
    expect(
      handlerReadsIfMatch(
        `@Controller("budget") class C { @Patch(":id") async a(@Headers("if-match") m) {} }`,
        route,
      ),
    ).toBe(false);
  });

  test("routeFor matches placeholders by position and the method exactly", () => {
    expect(routeFor(ROUTES, "PATCH", "/accounts/:param")?.id).toBe("accounts.update");
    expect(routeFor(ROUTES, "PUT", "/accounts/:param")).toBeUndefined();
    expect(routeFor(ROUTES, "PATCH", "/user-profile/checklist")?.id).toBe(
      "profile.updateChecklist",
    );
  });

  test("scans production source only", () => {
    expect(isProductionSource("apps/web/app/routes/app.debt.tsx")).toBe(true);
    expect(isProductionSource("apps/web/app/routes/app.debt.test.tsx")).toBe(false);
    expect(isProductionSource("apps/web/app/x/Thing.stories.tsx")).toBe(false);
    expect(isProductionSource("apps/web/app/x/types.d.ts")).toBe(false);
  });
});
