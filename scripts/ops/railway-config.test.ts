import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

type RailwayConfig = {
  build?: { dockerfilePath?: string; watchPatterns?: string[] };
  deploy?: { healthcheckPath?: string; drainingSeconds?: number };
  variables?: unknown;
  environments?: Record<string, { build?: { watchPatterns?: string[] } }>;
};

const SERVICES = ["backend", "web", "marketing"] as const;
const load = (s: string): RailwayConfig => JSON.parse(read(`apps/${s}/railway.json`));

const SECRET_LIKE = [
  /sk_(live|test)_/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /postgres(ql)?:\/\//i,
  /\b(password|secret|api[_-]?key|token)\b"?\s*:/i,
  /[A-Za-z0-9+/]{40,}={0,2}/,
];

describe.each(SERVICES)("railway.json (%s)", (service) => {
  const cfg = load(service);

  test("dockerfilePath exists", () => {
    const path = cfg.build?.dockerfilePath;
    expect(path).toBe(`apps/${service}/Dockerfile`);
    expect(existsSync(resolve(ROOT, path as string))).toBe(true);
  });

  test("healthcheck path is served", () => {
    const path = cfg.deploy?.healthcheckPath as string;
    expect(path).toBeDefined();
    if (service === "backend") {
      const manifest = read("packages/api-contract/src/manifest.ts");
      expect(manifest).toContain(`path: "${path.slice(1)}"`);
    } else if (service === "web") {
      expect(path).toBe("/healthz");
      expect(existsSync(resolve(ROOT, "apps/web/app/routes/healthz.ts"))).toBe(true);
    } else {
      expect(read("apps/marketing/server/ops.ts")).toContain(`"${path}"`);
    }
  });

  test("drainingSeconds is a non-negative number", () => {
    const d = cfg.deploy?.drainingSeconds;
    expect(typeof d).toBe("number");
    expect(d as number).toBeGreaterThanOrEqual(0);
  });

  test("has no variables and nothing secret-like", () => {
    expect(cfg.variables).toBeUndefined();
    const raw = read(`apps/${service}/railway.json`);
    for (const re of SECRET_LIKE) expect(raw).not.toMatch(re);
  });
});

describe("environment overrides and drain values", () => {
  test("backend staging watches every commit", () => {
    expect(load("backend").environments?.staging?.build?.watchPatterns).toEqual(["**"]);
  });
  test("backend production watch pattern is the changelog", () => {
    expect(load("backend").build?.watchPatterns).toEqual(["apps/backend/CHANGELOG.md"]);
  });
  test("drain: backend 15, web 15, marketing 0", () => {
    expect(load("backend").deploy?.drainingSeconds).toBe(15);
    expect(load("web").deploy?.drainingSeconds).toBe(15);
    expect(load("marketing").deploy?.drainingSeconds).toBe(0);
  });
});
