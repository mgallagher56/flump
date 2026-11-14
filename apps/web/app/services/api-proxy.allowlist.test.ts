// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { allRoutes, type RouteDefinition } from "@flump/api-contract";
import { describe, expect, it, vi } from "vitest";

vi.mock("~/config.server", () => ({ apiConfig: { apiBaseUrl: "https://backend.test" } }));
vi.mock("~/utils/auth.server", () => ({ getAuthSession: vi.fn() }));

import { API_ALLOW_LIST, forwardedQuery, matchAllowList } from "./api-proxy.server";

/**
 * Guards the `/api` proxy allow-list against drift (the AI connections and imports calls were
 * once missing, so the browser got 404s). It reads every browser `apiFetch` / `apiFetchAll` call
 * in the web app, matches it to a contract route, and fails when the proxy would refuse it.
 */

const APP_DIR = join(import.meta.dirname, "..");
const SAMPLE_UUID = "123e4567-e89b-42d3-a456-426614174000";
/** A sample value for each path parameter the contract uses, by name. */
const SAMPLE_PARAM: Record<string, string> = { id: SAMPLE_UUID, month: "2026-01" };
/** A sample value for each query parameter a browser call builds at runtime, by name. */
const SAMPLE_QUERY: Record<string, string> = { anonymize: "true" };

/**
 * Calls whose endpoint or method is not a literal in the call itself, per file: how many such
 * calls the file holds, and the requests they can make (each checked like a literal call). A new
 * dynamic call, here or in any other file, fails the test until it is counted and listed.
 */
const DYNAMIC_CALLS: Record<
  string,
  { count: number; requests: Array<{ method: string; endpoint: string }> }
> = {
  // Onboarding seed jobs post to one of two fixed endpoints (buildOnboardingSeedJobs).
  "features/onboarding/useFinishOnboarding.ts": {
    count: 2,
    requests: [
      { method: "POST", endpoint: "/accounts" },
      { method: "POST", endpoint: "/budget-entries" },
    ],
  },
};

interface BrowserCall {
  file: string;
  method: string;
  endpoint: string;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === "test" ? [] : sourceFiles(full);
    if (!/\.tsx?$/.test(name) || /\.(test|stories)\.tsx?$/.test(name)) return [];
    if (name.endsWith(".server.ts") || name === "api-client.ts") return [];
    return [full];
  });
}

/** The argument text of a call starting at `open` (the index of its `(`), parens balanced. */
function callArguments(source: string, open: number): string {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "(") depth++;
    else if (source[i] === ")" && --depth === 0) return source.slice(open + 1, i);
  }
  return source.slice(open + 1);
}

/** Removes import declarations and comments, so the only `apiFetch` mentions left are uses. */
function withoutImports(source: string): string {
  return source
    .replace(/^import\s[\s\S]*?\sfrom\s*["'][^"']+["'];?/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function browserCalls(): { calls: BrowserCall[]; unlisted: string[] } {
  const calls: BrowserCall[] = [];
  const unlisted: string[] = [];
  for (const full of sourceFiles(APP_DIR)) {
    const file = relative(APP_DIR, full);
    const source = withoutImports(readFileSync(full, "utf8"));
    let dynamic = 0;
    // Every mention, not only `apiFetch(`: a generic call, a space before the paren, or the
    // function passed as a value must not slip past the scan.
    for (const match of source.matchAll(/\bapiFetch(?:All)?\b/g)) {
      const after = source.slice((match.index ?? 0) + match[0].length);
      const open = /^\s*(?:<[^>()]*>)?\s*\(/.exec(after);
      if (!open) {
        unlisted.push(`${file}: ${match[0]} used as a value`);
        continue;
      }
      const args = callArguments(after, open[0].length - 1);
      // A quoted path, or a template literal (whose `${...}` may itself hold quotes).
      const literal = /^\s*(?:(["'])(\/[^"']*)\1|(`)(\/[^`]*)`)/.exec(args);
      const endpoint = literal ? (literal[2] ?? literal[4] ?? "") : "";
      const method = /\bmethod:\s*["'](GET|POST|PATCH|PUT|DELETE)["']/.exec(args)?.[1];
      const methodUnknown = (/\bmethod:/.test(args) && !method) || /\.\.\.\w+/.test(args);
      if (literal && (method || !methodUnknown)) {
        calls.push({ file, method: method ?? "GET", endpoint });
      } else {
        dynamic++;
      }
    }
    const listed = DYNAMIC_CALLS[file]?.count ?? 0;
    if (dynamic !== listed) {
      unlisted.push(`${file}: ${dynamic} dynamic apiFetch call(s), DYNAMIC_CALLS lists ${listed}`);
    }
  }
  for (const [file, entry] of Object.entries(DYNAMIC_CALLS)) {
    for (const request of entry.requests) calls.push({ file, ...request });
  }
  return { calls, unlisted };
}

/** The contract route a call's path (with `${...}` placeholders) refers to, if any. */
function contractRouteFor(method: string, path: string): RouteDefinition | undefined {
  const segments = path.replace(/^\//, "").split("/");
  return allRoutes.find((route) => {
    if (route.method !== method || route.aliasOf) return false;
    const template = route.path.split("/");
    if (template.length !== segments.length) return false;
    return template.every((part, i) =>
      part.startsWith(":") ? segments[i] !== "" : part === segments[i],
    );
  });
}

/** The concrete path to probe the allow-list with: placeholders become sample values. */
function concretePath(route: RouteDefinition, path: string): string {
  const segments = path.replace(/^\//, "").split("/");
  const template = route.path.split("/");
  return `/${template
    .map((part, i) => {
      if (!part.startsWith(":")) return part;
      const segment = segments[i] ?? "";
      return segment.includes("${") ? (SAMPLE_PARAM[part.slice(1)] ?? segment) : segment;
    })
    .join("/")}`;
}

function sampleQuery(query: string): URLSearchParams {
  const params = new URLSearchParams(query);
  for (const [key, value] of [...params]) {
    if (value.includes("${")) params.set(key, SAMPLE_QUERY[key] ?? value);
  }
  return params;
}

const { calls, unlisted } = browserCalls();

describe("/api proxy allow-list covers every browser call", () => {
  it("finds the browser calls (the scan is not silently empty)", () => {
    expect(calls.length).toBeGreaterThan(10);
    expect(calls.some((call) => call.endpoint.startsWith("/mcp-tokens"))).toBe(true);
    expect(calls.some((call) => call.endpoint.startsWith("/imports"))).toBe(true);
  });

  it("has no dynamic call that is not listed in DYNAMIC_CALLS", () => {
    expect(unlisted).toEqual([]);
  });

  it.each(calls.map((call) => [`${call.method} ${call.endpoint} (${call.file})`, call] as const))(
    "%s is a contract route the proxy forwards",
    (_label, call) => {
      const [path, query = ""] = call.endpoint.split("?");
      const route = contractRouteFor(call.method, path ?? "");
      expect(route, "no contract route matches this call").toBeDefined();
      if (!route) return;
      expect(route.auth).toBe("user");
      const probe = concretePath(route, path ?? "");
      expect(matchAllowList(call.method, probe), `${call.method} ${probe} is not allowed`).toBe(
        true,
      );
      expect(forwardedQuery(sampleQuery(query), call.method, probe)).not.toBeNull();
    },
  );

  it("lists only user routes from the contract (no dead or public rules)", () => {
    for (const rule of API_ALLOW_LIST) {
      const regex = new RegExp(`^${rule.pattern}$`);
      for (const method of rule.methods) {
        const matches = allRoutes.filter((route) => {
          if (route.method !== method) return false;
          const sample = `/${route.path
            .split("/")
            .map((part) => (part.startsWith(":") ? (SAMPLE_PARAM[part.slice(1)] ?? part) : part))
            .join("/")}`;
          return regex.test(sample);
        });
        expect(
          matches.length,
          `${method} ${rule.pattern} matches no contract route`,
        ).toBeGreaterThan(0);
        for (const route of matches) expect(route.auth).toBe("user");
      }
    }
  });
});
