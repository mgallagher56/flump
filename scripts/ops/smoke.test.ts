import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { resolve } from "node:path";

const SCRIPT = resolve(import.meta.dir, "smoke.sh");

type Route = { status?: number; headers?: Record<string, string>; body?: string };
type Routes = Record<string, Route>;

const NOINDEX = { "x-robots-tag": "noindex, nofollow" };
const ROBOTS = { headers: { "content-type": "text/plain" }, body: "User-agent: *\nDisallow: /\n" };

const goodBackend = (): Routes => ({
  "/": { body: "Flump API is running." },
  "/health/ready": { body: JSON.stringify({ status: "ok", version: "1.0.0", commit: "abc1234" }) },
});
const goodWeb = (): Routes => ({
  "/healthz": { body: "{}" },
  "/ping": { body: "" },
  "/": { headers: NOINDEX, body: "<html></html>" },
  "/robots.txt": ROBOTS,
});
const goodMarketing = (): Routes => ({
  "/healthz": { body: "{}" },
  "/": { headers: NOINDEX, body: "<html></html>" },
  "/robots.txt": ROBOTS,
});

let servers: ReturnType<typeof Bun.serve>[] = [];

function stub(routes: Routes): string {
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch(req) {
      const route = routes[new URL(req.url).pathname];
      if (!route) return new Response("not found SECRET-BODY", { status: 404 });
      return new Response(route.body ?? "", {
        status: route.status ?? 200,
        headers: route.headers,
      });
    },
  });
  servers.push(server);
  return `http://127.0.0.1:${server.port}`;
}

async function smoke(
  backend: Routes,
  web: Routes,
  marketing: Routes,
  extraEnv: Record<string, string> = {},
  args: string[] = ["env"],
) {
  const proc = Bun.spawn(["bash", SCRIPT, ...args], {
    env: {
      ...process.env,
      BACKEND_URL: stub(backend),
      WEB_URL: stub(web),
      MARKETING_URL: stub(marketing),
      ...extraEnv,
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

const without = (routes: Routes, path: string): Routes => {
  const copy = { ...routes };
  delete copy[path];
  return copy;
};

beforeEach(() => {
  servers = [];
});
afterEach(() => {
  for (const server of servers) server.stop(true);
});

describe("smoke.sh", () => {
  test("exits 0 when every service answers correctly", async () => {
    const result = await smoke(goodBackend(), goodWeb(), goodMarketing());
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("PASS backend /health/ready");
    expect(result.stdout).not.toContain("FAIL");
  });

  test("never prints response bodies", async () => {
    const result = await smoke(without(goodBackend(), "/"), goodWeb(), goodMarketing());
    expect(result.exitCode).toBe(1);
    expect(result.stdout + result.stderr).not.toContain("SECRET-BODY");
  });

  test.each([
    ["backend /", () => smoke(without(goodBackend(), "/"), goodWeb(), goodMarketing())],
    [
      "backend /health/ready",
      () => smoke(without(goodBackend(), "/health/ready"), goodWeb(), goodMarketing()),
    ],
    ["web /healthz", () => smoke(goodBackend(), without(goodWeb(), "/healthz"), goodMarketing())],
    ["web /ping", () => smoke(goodBackend(), without(goodWeb(), "/ping"), goodMarketing())],
    [
      "marketing /healthz",
      () => smoke(goodBackend(), goodWeb(), without(goodMarketing(), "/healthz")),
    ],
    ["marketing /", () => smoke(goodBackend(), goodWeb(), without(goodMarketing(), "/"))],
  ])("exits non-zero when %s is a 404", async (_name, run) => {
    const result = await run();
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("FAIL");
  });

  test("fails when the readiness body has no commit field", async () => {
    const backend = { ...goodBackend(), "/health/ready": { body: '{"status":"ok"}' } };
    const result = await smoke(backend, goodWeb(), goodMarketing());
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("no commit");
  });

  test("EXPECTED_COMMIT passes on a matching prefix and fails on a mismatch", async () => {
    const ok = await smoke(goodBackend(), goodWeb(), goodMarketing(), {
      EXPECTED_COMMIT: "abc1234def5678",
    });
    expect(ok.exitCode).toBe(0);
    expect(ok.stdout).toContain("PASS backend commit matches");

    const bad = await smoke(goodBackend(), goodWeb(), goodMarketing(), {
      EXPECTED_COMMIT: "fffffff",
    });
    expect(bad.exitCode).toBe(1);
    expect(bad.stdout).toContain("FAIL backend commit");
  });

  test("fails when web lacks the noindex header", async () => {
    const web = { ...goodWeb(), "/": { body: "<html></html>" } };
    const result = await smoke(goodBackend(), web, goodMarketing());
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("FAIL web / X-Robots-Tag");
  });

  test("fails when marketing lacks the noindex header", async () => {
    const marketing = { ...goodMarketing(), "/": { body: "<html></html>" } };
    const result = await smoke(goodBackend(), goodWeb(), marketing);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("FAIL marketing / X-Robots-Tag");
  });

  test.each(["web", "marketing"])("fails when %s robots.txt lacks Disallow: /", async (service) => {
    const weak = { headers: { "content-type": "text/plain" }, body: "User-agent: *\nAllow: /\n" };
    const web = service === "web" ? { ...goodWeb(), "/robots.txt": weak } : goodWeb();
    const marketing =
      service === "marketing" ? { ...goodMarketing(), "/robots.txt": weak } : goodMarketing();
    const result = await smoke(goodBackend(), web, marketing);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain(`FAIL ${service} /robots.txt`);
  });

  test("fails on connection failure", async () => {
    const proc = Bun.spawn(["bash", SCRIPT, "env"], {
      env: {
        ...process.env,
        BACKEND_URL: "http://127.0.0.1:1",
        WEB_URL: "http://127.0.0.1:1",
        MARKETING_URL: "http://127.0.0.1:1",
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(await proc.exited).toBe(1);
  });

  test("usage error: unknown target exits 2; production without MARKETING_URL exits 2", async () => {
    const unknown = Bun.spawn(["bash", SCRIPT, "nowhere"], { stdout: "pipe", stderr: "pipe" });
    expect(await unknown.exited).toBe(2);

    const { MARKETING_URL: _omit, ...env } = process.env;
    const prod = Bun.spawn(["bash", SCRIPT, "production"], { env, stdout: "pipe", stderr: "pipe" });
    expect(await prod.exited).toBe(2);
    expect(await new Response(prod.stderr).text()).toContain("MARKETING_URL");
  });
});
