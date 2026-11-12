import "reflect-metadata";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module";

/**
 * Route inventory guard (E23 section 9.3, B1).
 *
 * Statically extracts every (method, path) the web app sends through backendFetch/apiFetch and
 * checks that the backend registers a matching route. A web call to a route the backend does not
 * have is a silent 404 in production (this would have caught D03, D04 and D05).
 *
 * Backend routes are read from the controllers registered on AppModule using the same Nest
 * metadata the router uses, so no database is needed.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");
const WEB_APP_DIR = join(REPO_ROOT, "apps", "web", "app");
const MOBILE_CLIENT = join(REPO_ROOT, "apps", "mobile-companion", "src", "api", "client.ts");

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
interface Call {
  method: Method;
  path: string;
  source: string;
}

/**
 * Web calls whose backend route does not exist yet. Each entry carries an expiry date: once the
 * date passes the test fails, forcing the entry to be fixed or consciously renewed.
 * G-04: per-year account details are not implemented in the backend; owned by E16 T-CUT-4.
 */
const KNOWN_MISSING: ReadonlyArray<{
  method: Method;
  path: string;
  reason: string;
  expires: string;
}> = [
  { method: "DELETE", path: "/accounts/:p/details/:p", reason: "G-04", expires: "2027-03-31" },
  { method: "POST", path: "/accounts/:p/details/year", reason: "G-04", expires: "2027-03-31" },
  { method: "PUT", path: "/accounts/:p/details", reason: "G-04", expires: "2027-03-31" },
];

/**
 * Call sites whose endpoint is not a string literal, so a regex cannot see the path. They are
 * covered by the literal call sites or by the contract test, and are listed so a new dynamic
 * call site is a conscious decision.
 */
const KNOWN_DYNAMIC: ReadonlyArray<{ file: string; token: string; reason: string }> = [
  {
    file: "routes/app.onboarding.tsx",
    token: "job.endpoint",
    reason: "POST /accounts and /budget-entries, covered by onboarding-seed and the contract test",
  },
  {
    file: "routes/app.onboarding.tsx",
    token: "endpoint",
    reason: "existingNames helper, called with the literals /accounts and /budget-entries (GET)",
  },
  {
    file: "services/api-client.ts",
    token: "endpoint",
    reason: "the apiFetch definition itself",
  },
  {
    file: "routes/app.accounts._index.tsx",
    token: "endpoint",
    reason: "local `send` wrapper, extracted separately",
  },
  {
    file: "services/backend-client.server.ts",
    token: "endpoint",
    reason: "generic `get` wrapper in loadWorkspaceSnapshot, extracted separately",
  },
];

/** Wrappers whose first argument is the endpoint (and, for send, second the method). */
const WRAPPERS: ReadonlyArray<{ file: string; name: string; methodArg: boolean }> = [
  { file: "routes/app.accounts._index.tsx", name: "send", methodArg: true },
  { file: "services/backend-client.server.ts", name: "get", methodArg: false },
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return entry === "node_modules" ? [] : walk(full);
    return /\.(ts|tsx)$/.test(entry) && !/\.(test|spec|stories)\.(ts|tsx)$/.test(entry)
      ? [full]
      : [];
  });
}

/** `/accounts/${encodeURIComponent(x)}/details?y=1` becomes `/accounts/:p/details`. */
function normalisePath(raw: string): string {
  return raw
    .replace(/\$\{[^}]*\}/g, ":p")
    .replace(/\?.*$/, "")
    .replace(/\/+$/, "")
    .replace(/^(?!\/)/, "/");
}

const CALL_RE =
  /\b(backendFetch|apiFetch)\s*(?:<[^()]*>)?\s*\(\s*(?:(["'`])((?:\\.|(?!\2)[^\\])*)\2|([A-Za-z_.$]+))/g;

function extractWebCalls(text: string, rel: string): { calls: Call[]; dynamic: string[] } {
  const calls: Call[] = [];
  const dynamic: string[] = [];
  const matches = [...text.matchAll(CALL_RE)];
  matches.forEach((m, i) => {
    const end = matches[i + 1]?.index ?? text.length;
    const window = text.slice(m.index ?? 0, Math.min(end, (m.index ?? 0) + 700));
    if (m[3] === undefined) {
      dynamic.push(`${rel}:${m[4]}`);
      return;
    }
    const method = (/method:\s*"(GET|POST|PATCH|PUT|DELETE)"/.exec(window)?.[1] ?? "GET") as Method;
    calls.push({ method, path: normalisePath(m[3]), source: `${rel}` });
  });

  for (const w of WRAPPERS.filter((x) => x.file === rel)) {
    const re = new RegExp(
      `\\b${w.name}\\s*(?:<[^()]*>)?\\s*\\(\\s*(["'\`])((?:\\\\.|(?!\\1)[^\\\\])*)\\1(?:\\s*,\\s*"(GET|POST|PATCH|PUT|DELETE)")?`,
      "g",
    );
    for (const m of text.matchAll(re)) {
      calls.push({
        method: (w.methodArg ? (m[3] ?? "GET") : "GET") as Method,
        path: normalisePath(m[2]),
        source: rel,
      });
    }
  }
  return { calls, dynamic };
}

const VERBS: Record<number, Method> = {
  [RequestMethod.GET]: "GET",
  [RequestMethod.POST]: "POST",
  [RequestMethod.PATCH]: "PATCH",
  [RequestMethod.PUT]: "PUT",
  [RequestMethod.DELETE]: "DELETE",
};

function backendRoutes(): Array<{ method: Method; path: string }> {
  const controllers: Array<new (...args: never[]) => unknown> =
    Reflect.getMetadata("controllers", AppModule) ?? [];
  const join2 = (a: string, b: string) =>
    `/${[a, b]
      .map((s) => s.replace(/^\/+|\/+$/g, ""))
      .filter(Boolean)
      .join("/")}`.replace(/:[A-Za-z_]+/g, ":p");
  const routes: Array<{ method: Method; path: string }> = [];
  for (const controller of controllers) {
    const prefix = (Reflect.getMetadata(PATH_METADATA, controller) as string | undefined) ?? "/";
    for (const name of Object.getOwnPropertyNames(controller.prototype)) {
      const handler = (controller.prototype as Record<string, unknown>)[name];
      if (typeof handler !== "function") continue;
      const verb = Reflect.getMetadata(METHOD_METADATA, handler) as number | undefined;
      if (verb === undefined || VERBS[verb] === undefined) continue;
      const sub = (Reflect.getMetadata(PATH_METADATA, handler) as string | undefined) ?? "/";
      routes.push({ method: VERBS[verb], path: join2(prefix, sub) });
    }
  }
  return routes;
}

/**
 * Express matches the first registered route, and literal segments shadow params only by order.
 * Here a call matches when some route has the same verb and the same segment count, where each
 * segment is equal or either side is a parameter.
 */
function matches(route: { method: Method; path: string }, call: Call): boolean {
  if (route.method !== call.method) return false;
  const r = route.path.split("/");
  const c = call.path.split("/");
  return (
    r.length === c.length && r.every((seg, i) => seg === c[i] || seg === ":p" || c[i] === ":p")
  );
}

const webFiles = walk(WEB_APP_DIR);
const extracted = webFiles.map((f) => {
  const rel = relative(WEB_APP_DIR, f);
  return { rel, ...extractWebCalls(readFileSync(f, "utf8"), rel) };
});
const webCalls = extracted.flatMap((e) => e.calls);
const webDynamic = extracted.flatMap((e) => e.dynamic);

describe("web to backend route inventory", () => {
  const routes = backendRoutes();

  it("reads a plausible number of backend routes and web call sites", () => {
    expect(routes.length).toBeGreaterThan(30);
    expect(webCalls.length).toBeGreaterThan(40);
    expect(routes).toContainEqual({ method: "PATCH", path: "/accounts/:p" });
    expect(routes).toContainEqual({ method: "POST", path: "/bank-connections/:p/refresh" });
  });

  it("normalises template and query paths", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: a template-literal source string, not a template
    expect(normalisePath('/accounts/${encodeURIComponent(String(id ?? ""))}/details?x=1')).toBe(
      "/accounts/:p/details",
    );
  });

  it("every web call matches a registered backend route (modulo the dated allow-list)", () => {
    const unmatched = webCalls.filter(
      (c) =>
        !routes.some((r) => matches(r, c)) &&
        !KNOWN_MISSING.some((k) => k.method === c.method && k.path === c.path),
    );
    expect(
      unmatched.map((c) => `${c.method} ${c.path} (${c.source})`),
      "web calls with no backend route",
    ).toEqual([]);
  });

  it("allow-listed missing routes are still missing, and unexpired", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const k of KNOWN_MISSING) {
      expect(k.expires > today, `${k.method} ${k.path} (${k.reason}) allow-list expired`).toBe(
        true,
      );
      expect(
        routes.some((r) => matches(r, { ...k, source: "allow-list" })),
        `${k.method} ${k.path} now exists: remove it from KNOWN_MISSING`,
      ).toBe(false);
      expect(
        webCalls.some((c) => c.method === k.method && c.path === k.path),
        `${k.method} ${k.path} is no longer called by the web: remove it from KNOWN_MISSING`,
      ).toBe(true);
    }
  });

  it("every non-literal call site is on the known-dynamic allow-list", () => {
    const allowed = new Set(KNOWN_DYNAMIC.map((d) => `${d.file}:${d.token}`));
    expect(webDynamic.filter((d) => !allowed.has(d))).toEqual([]);
  });

  it("mobile client (report-only): lists calls with no backend route", () => {
    const text = readFileSync(MOBILE_CLIENT, "utf8");
    const calls: Call[] = [];
    for (const m of text.matchAll(
      /apiFetch(?:<[^()]*>)?\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1([^)]*)\)/g,
    )) {
      const method = (/method:\s*"(GET|POST|PATCH|PUT|DELETE)"/.exec(m[3])?.[1] ?? "GET") as Method;
      calls.push({ method, path: normalisePath(m[2]), source: "mobile-companion" });
    }
    const missing = calls.filter((c) => !routes.some((r) => matches(r, c)));
    if (missing.length > 0) {
      console.warn(
        `[route-inventory] mobile-companion calls with no backend route (report-only):\n${missing
          .map((c) => `  ${c.method} ${c.path}`)
          .join("\n")}`,
      );
    }
    expect(calls.length).toBeGreaterThan(0);
  });
});
