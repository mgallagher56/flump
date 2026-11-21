// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type IncomingHttpHeaders, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ServerBuild } from "react-router";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { installShutdown, resetDrainStateForTests } from "./shutdown";

const tmpDirs: string[] = [];
const makeTmpDir = () => {
  const dir = mkdtempSync(path.join(tmpdir(), "flump-app-edges-"));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
});

const baseBuild = {
  entry: { module: { default: () => new Response("rendered", { status: 200 }) } },
  routes: {
    root: {
      id: "root",
      path: "",
      index: undefined,
      caseSensitive: undefined,
      parentId: undefined,
      module: { default: () => null },
    },
  },
  assets: { version: "test", entry: { module: "", imports: [] }, routes: {}, url: "" },
  publicPath: "/",
  assetsBuildDirectory: "",
  future: {},
  ssr: true,
  isSpaMode: false,
  prerender: [],
  routeDiscovery: { mode: "initial", manifestPath: "/__manifest" },
};

let server: Server | undefined;
afterEach(async () => {
  resetDrainStateForTests();
  await new Promise<void>((r) => (server ? server.close(() => r()) : r()));
  server = undefined;
});

const start = (app: ReturnType<typeof createApp>) =>
  new Promise<number>((resolve) => {
    const listening = app.listen(0, () => resolve((listening.address() as AddressInfo).port));
    server = listening;
  });

const get = (
  port: number,
  urlPath: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; headers: IncomingHttpHeaders }> =>
  new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path: urlPath, headers }, (res) => {
      res.resume();
      res.once("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers }));
    });
    req.once("error", reject);
    req.end();
  });

/** A build directory with one hashed asset and one dotfile, and a public dir with the same. */
const makeDirs = () => {
  const assetsBuildDirectory = makeTmpDir();
  mkdirSync(path.join(assetsBuildDirectory, "assets"));
  writeFileSync(path.join(assetsBuildDirectory, "assets", "app-abc123.js"), "x".repeat(4096));
  mkdirSync(path.join(assetsBuildDirectory, ".well-known"));
  writeFileSync(path.join(assetsBuildDirectory, ".well-known", "build.txt"), "build");
  const publicDir = makeTmpDir();
  writeFileSync(path.join(publicDir, "robots.txt"), "User-agent: *");
  mkdirSync(path.join(publicDir, ".well-known"));
  writeFileSync(path.join(publicDir, ".well-known", "security.txt"), "Contact: x");
  return { assetsBuildDirectory, publicDir };
};

const appWith = (
  overrides: Record<string, unknown> = {},
  mode: "production" | "development" = "production",
  lines: string[] = [],
) => {
  const dirs = makeDirs();
  return createApp({
    build: { ...baseBuild, ...overrides } as unknown as ServerBuild,
    mode,
    ...dirs,
    logWrite: (line) => lines.push(line),
  });
};

describe("createApp static files and headers", () => {
  it("serves hashed assets as immutable for a year", async () => {
    const port = await start(appWith());
    const res = await get(port, "/assets/app-abc123.js");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
  });

  it("serves public files for an hour, including .well-known files", async () => {
    const port = await start(appWith());
    const robots = await get(port, "/robots.txt");
    expect(robots.headers["cache-control"]).toBe("public, max-age=3600");
    expect((await get(port, "/.well-known/security.txt")).status).toBe(200);
  });

  it("serves dotfiles from the build directory", async () => {
    const port = await start(appWith());
    expect((await get(port, "/.well-known/build.txt")).status).toBe(200);
  });

  it("compresses a large response when the client accepts gzip", async () => {
    const port = await start(appWith());
    const res = await get(port, "/assets/app-abc123.js", { "Accept-Encoding": "gzip" });
    expect(res.headers["content-encoding"]).toBe("gzip");
  });

  it("does not announce Express", async () => {
    const port = await start(appWith());
    expect((await get(port, "/robots.txt")).headers["x-powered-by"]).toBeUndefined();
  });

  it("serves assets at / when the build names no public path", async () => {
    const port = await start(appWith({ publicPath: undefined }));
    expect((await get(port, "/assets/app-abc123.js")).status).toBe(200);
  });

  it("asks clients to close the connection once shutdown has started", async () => {
    const port = await start(appWith());
    expect((await get(port, "/robots.txt")).headers.connection).not.toBe("close");
    // The drain flag is shared by the whole process; start it through a server that is not the
    // one under test, so this app keeps accepting requests.
    installShutdown(createServer(), { listen: false, exit: () => {}, log: () => {} })("SIGTERM");
    expect((await get(port, "/robots.txt")).headers.connection).toBe("close");
  });
});

describe("createApp access log format", () => {
  it("writes plain text lines outside production", async () => {
    const lines: string[] = [];
    const port = await start(appWith({}, "development", lines));
    await get(port, "/robots.txt");
    await new Promise((r) => setTimeout(r, 20));
    expect(lines).toHaveLength(1);
    expect(lines[0].startsWith("GET /robots.txt 200 ")).toBe(true);
  });

  it("writes JSON lines in production", async () => {
    const lines: string[] = [];
    const port = await start(appWith({}, "production", lines));
    await get(port, "/robots.txt");
    await new Promise((r) => setTimeout(r, 20));
    expect(JSON.parse(lines[0])).toMatchObject({ route: "/robots.txt", status: 200 });
  });
});
