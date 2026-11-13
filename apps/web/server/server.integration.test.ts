// @vitest-environment node
import { type ChildProcess, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readdirSync, statSync } from "node:fs";
import { request } from "node:http";
import { createServer } from "node:net";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SECURITY_HEADERS } from "../app/security/headers.server";

/**
 * Spawns the real `server.ts` against the production build (`build/server/index.js`) with dummy
 * WorkOS settings. It needs `bun run build` first, so it skips with a loud message when `build/`
 * is missing. CI runs it in the E2E smoke job, after the build, with REQUIRE_WEB_BUILD=1 so a
 * missing build fails instead of skipping.
 *
 * WEB_SERVER_TEST_NODE_ENV overrides NODE_ENV for the spawned server (default production); only
 * for machines whose Bun cannot load react-dom's production server build.
 */
const webDir = path.resolve(import.meta.dirname, "..");
const buildReady = existsSync(path.join(webDir, "build/server/index.js"));
if (!buildReady) {
  const message =
    "[web server integration] SKIPPED: apps/web/build is missing. Run `bun run build` first.";
  if (process.env.REQUIRE_WEB_BUILD) throw new Error(message);
  console.warn(`\n${"!".repeat(8)} ${message} ${"!".repeat(8)}\n`);
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
  });
}

interface Reply {
  status: number;
  headers: { get(name: string): string | null };
}

/** node:http rather than fetch: the unit project installs happy-dom, whose fetch drops Origin. */
function send(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = request(url, { method: init.method ?? "GET", headers: init.headers }, (res) => {
      res.resume();
      res.once("end", () => {
        resolve({
          status: res.statusCode ?? 0,
          headers: {
            get: (name) => {
              const value = res.headers[name.toLowerCase()];
              return Array.isArray(value) ? value.join(", ") : (value ?? null);
            },
          },
        });
      });
    });
    req.once("error", reject);
    req.end(init.body);
  });
}

function assertSecurityHeaders(res: Reply) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    expect(res.headers.get(name), name).toBe(value);
  }
  expect(res.headers.get("x-powered-by")).toBeNull();
}

describe.skipIf(!buildReady)("web express server (built)", () => {
  let child: ChildProcess;
  let base: string;
  let output = "";
  let exitCode: number | null | undefined;
  let exited: Promise<void>;
  const asset = (() => {
    const dir = path.join(webDir, "build/client/assets");
    if (!existsSync(dir)) return "";
    return (
      readdirSync(dir).find((f) => f.endsWith(".js") && statSync(path.join(dir, f)).size > 2000) ??
      ""
    );
  })();

  beforeAll(async () => {
    const port = await freePort();
    base = `http://127.0.0.1:${port}`;
    const cookiePassword = randomBytes(24).toString("hex");
    child = spawn("bun", ["server.ts"], {
      cwd: webDir,
      env: {
        ...process.env,
        NODE_ENV: process.env.WEB_SERVER_TEST_NODE_ENV ?? "production",
        PORT: String(port),
        HOST: "127.0.0.1",
        WORKOS_API_KEY: `test_${randomBytes(8).toString("hex")}`,
        WORKOS_CLIENT_ID: `client_${randomBytes(8).toString("hex")}`,
        WORKOS_COOKIE_PASSWORD: cookiePassword,
        WORKOS_REDIRECT_URI: `${base}/callback`,
      },
    });
    child.stdout?.on("data", (d) => {
      output += d;
    });
    child.stderr?.on("data", (d) => {
      output += d;
    });
    exited = new Promise((resolve) => {
      child.once("exit", (code) => {
        exitCode = code;
        resolve();
      });
    });
    const deadline = Date.now() + 30_000;
    for (;;) {
      if (exitCode !== undefined) throw new Error(`server exited early (${exitCode}):\n${output}`);
      try {
        if ((await send(`${base}/healthz`)).status === 200) break;
      } catch {
        // not listening yet
      }
      if (Date.now() > deadline) throw new Error(`server did not start:\n${output}`);
      await new Promise((r) => setTimeout(r, 200));
    }
  }, 45_000);

  afterAll(async () => {
    if (exitCode === undefined) {
      child.kill("SIGKILL");
      await exited;
    }
  });

  it("serves /healthz (the Docker HEALTHCHECK path) with the full header set", async () => {
    const res = await send(`${base}/healthz`);
    expect(res.status).toBe(200);
    assertSecurityHeaders(res);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("stamps a document response (302 redirect) and echoes a request id", async () => {
    const res = await send(`${base}/`);
    expect([200, 302]).toContain(res.status);
    assertSecurityHeaders(res);
    expect(res.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("stamps a .data response", async () => {
    const res = await send(`${base}/_root.data`);
    assertSecurityHeaders(res);
    expect(res.headers.get("cache-control")).toMatch(/no-store|private/);
  });

  it("stamps /__manifest responses", async () => {
    const res = await send(`${base}/__manifest`);
    expect([204, 400]).toContain(res.status);
    assertSecurityHeaders(res);
  });

  it("stamps the document-level CSRF 400 (POST with a foreign Origin)", async () => {
    const res = await send(`${base}/`, {
      method: "POST",
      headers: {
        Origin: "https://evil.example",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "a=b",
    });
    expect(res.status).toBe(400);
    assertSecurityHeaders(res);
  });

  it("stamps an error response from a failing route (/callback without a cookie)", async () => {
    const res = await send(`${base}/callback?code=zzcode&state=zzstate`);
    expect(res.status).toBeGreaterThanOrEqual(400);
    assertSecurityHeaders(res);
  });

  it("keeps immutable caching and gzip for hashed assets, with the security headers", async () => {
    expect(asset).not.toBe("");
    const res = await send(`${base}/assets/${asset}`, { headers: { "Accept-Encoding": "gzip" } });
    expect(res.status).toBe(200);
    assertSecurityHeaders(res);
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("content-encoding")).toBe("gzip");
  });

  it("stamps files from public/", async () => {
    const res = await send(`${base}/favicon.ico`);
    expect(res.status).toBe(200);
    assertSecurityHeaders(res);
    expect(res.headers.get("cache-control")).toMatch(/^public, max-age=\d+/);
  });

  it("never writes query values to the access log", async () => {
    await send(`${base}/callback?code=leakcode42&state=leakstate42`);
    await new Promise((r) => setTimeout(r, 300));
    expect(output).toContain("/callback");
    expect(output).not.toMatch(/leakcode42|leakstate42|code=|state=/);
  });

  it("drains on SIGTERM and exits 0", async () => {
    child.kill("SIGTERM");
    await Promise.race([
      exited,
      new Promise((_, reject) => setTimeout(() => reject(new Error("no exit in 10s")), 10_000)),
    ]);
    expect(exitCode).toBe(0);
  });
});
