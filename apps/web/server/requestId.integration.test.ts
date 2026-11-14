// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type IncomingHttpHeaders, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ServerBuild } from "react-router";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

/**
 * BE-07 (audit M14): one request id per incoming request, on the web access log line AND on every
 * backend call that request makes. Real `createApp` (access log, AsyncLocalStorage context, the
 * real React Router handler) over a minimal build whose loader calls the real `backendFetch`
 * against a local fake backend that records the headers it receives.
 */
const backend = vi.hoisted(() => ({ base: "" }));
vi.mock("~/config.server", () => ({
  apiConfig: {
    get apiBaseUrl() {
      return backend.base;
    },
  },
}));

const { createApp } = await import("./app");
const { backendFetch } = await import("~/services/backend-client.server");
const { getRequestId } = await import("~/security/request-id.server");

const build = {
  entry: {
    module: {
      default: () => new Response("rendered", { status: 200 }),
    },
  },
  routes: {
    root: {
      id: "root",
      path: "probe",
      index: undefined,
      caseSensitive: undefined,
      parentId: undefined,
      module: {
        default: () => null,
        loader: async () => {
          // Two calls, after an await, so the id must survive async continuations.
          await backendFetch("/accounts", { accessToken: "tok", schema: null, allowEmpty: true });
          await backendFetch("/user-profile", {
            accessToken: "tok",
            schema: null,
            allowEmpty: true,
          });
          return null;
        },
      },
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
} as unknown as ServerBuild;

const staticDir = mkdtempSync(path.join(tmpdir(), "flump-reqid-"));
afterAll(() => rmSync(staticDir, { recursive: true, force: true }));

const servers: Server[] = [];
afterEach(() => {
  for (const s of servers.splice(0)) s.close();
});

function listen(server: Server): Promise<number> {
  servers.push(server);
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve((server.address() as AddressInfo).port));
  });
}

async function startBackend(seen: IncomingHttpHeaders[]): Promise<void> {
  const port = await listen(
    createServer((req, res) => {
      seen.push(req.headers);
      res.writeHead(200, { "Content-Type": "application/json" }).end("[]");
    }),
  );
  backend.base = `http://127.0.0.1:${port}`;
}

async function startWeb(lines: string[]): Promise<number> {
  const app = createApp({
    build,
    mode: "production",
    assetsBuildDirectory: staticDir,
    publicDir: staticDir,
    logWrite: (l) => lines.push(l),
  });
  const server = createServer(app);
  return listen(server);
}

function get(port: number, headers: Record<string, string> = {}): Promise<IncomingHttpHeaders> {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path: "/probe", headers }, (res) => {
      res.resume();
      res.once("end", () => resolve(res.headers));
    });
    req.once("error", reject);
    req.end();
  });
}

const waitForLog = async (lines: string[]) => {
  for (let i = 0; i < 50 && lines.length === 0; i += 1) await new Promise((r) => setTimeout(r, 10));
};

describe("request id across tiers", () => {
  it("puts one generated id on the access log, the response and every backend call", async () => {
    const seen: IncomingHttpHeaders[] = [];
    const lines: string[] = [];
    await startBackend(seen);
    const port = await startWeb(lines);

    const headers = await get(port);
    await waitForLog(lines);

    const id = headers["x-request-id"];
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(seen).toHaveLength(2);
    for (const backendHeaders of seen) expect(backendHeaders["x-request-id"]).toBe(id);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? "{}")).toMatchObject({ context: "HttpAccess", requestId: id });
  });

  it("keeps a valid inbound id end to end and replaces an invalid one", async () => {
    const seen: IncomingHttpHeaders[] = [];
    const lines: string[] = [];
    await startBackend(seen);
    const port = await startWeb(lines);

    const inbound = "edge.req_0123-ABCD";
    expect((await get(port, { "x-request-id": inbound }))["x-request-id"]).toBe(inbound);
    await waitForLog(lines);
    expect(seen.map((h) => h["x-request-id"])).toEqual([inbound, inbound]);
    expect(lines[0]).toContain(inbound);

    seen.length = 0;
    const replaced = (await get(port, { "x-request-id": "bad id;" }))["x-request-id"];
    expect(replaced).toMatch(/^[0-9a-f-]{36}$/);
    expect(seen.map((h) => h["x-request-id"])).toEqual([replaced, replaced]);
  });

  it("concurrent requests never see each other's id", async () => {
    const seen: IncomingHttpHeaders[] = [];
    await startBackend(seen);
    const port = await startWeb([]);
    const ids = Array.from({ length: 5 }, (_, i) => `concurrent-${i}-abcdef`);
    await Promise.all(ids.map((id) => get(port, { "x-request-id": id })));
    for (const id of ids) {
      expect(seen.filter((h) => h["x-request-id"] === id)).toHaveLength(2);
    }
  });

  it("sends no id outside a request", async () => {
    const seen: IncomingHttpHeaders[] = [];
    await startBackend(seen);
    expect(getRequestId()).toBeUndefined();
    await backendFetch("/accounts", { accessToken: "tok", schema: null, allowEmpty: true });
    expect(seen[0]?.["x-request-id"]).toBeUndefined();
  });
});
