// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { type IncomingHttpHeaders, request } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequestHandler } from "@react-router/express";
import express from "express";
import type { ServerBuild } from "react-router";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app";

/**
 * Regression guard for the staging logout outage. Behind Railway TLS terminates at the proxy, so
 * Express sees plain http. React Router 7.18's `throwIfPotentialCSRFAttack` compares the full
 * origin of the Origin header with the origin of `request.url`; with an http `request.url` every
 * same-origin form POST (https Origin) was rejected with a 400 "Bad Request", which broke logout.
 * `createApp` sets `trust proxy` 1 so `@react-router/express` builds `request.url` from the
 * forwarded protocol and host. If that ever regresses, every action breaks again.
 *
 * The Playwright E2E suite runs on plain http with no proxy, so it cannot catch this; this
 * in-process test (a real express app and the real React Router handler over a minimal build) can.
 *
 * Not asserted: that a client-supplied X-Forwarded-Proto is ignored. With `trust proxy` 1 the
 * immediate peer is trusted as the proxy hop, so a direct client's header is honoured (here the
 * test client is that peer). On Railway the edge proxy overwrites the header; the spoofable case is
 * a client talking straight to the container, which Railway does not expose.
 */
const FORWARDED_HOST = "app.example.invalid";
const seenUrls: string[] = [];

const tmpDirs: string[] = [];
const makeTmpDir = () => {
  const dir = mkdtempSync(path.join(tmpdir(), "flump-app-test-"));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
});

const build = {
  entry: {
    module: {
      // Reached only when React Router accepted the request (it ran the action, then renders).
      default: (req: Request) => {
        seenUrls.push(req.url);
        return new Response("rendered", { status: 200 });
      },
    },
  },
  routes: {
    root: {
      id: "root",
      path: "logout",
      index: undefined,
      caseSensitive: undefined,
      parentId: undefined,
      module: { default: () => null, action: () => ({ ok: true }) },
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

interface Reply {
  status: number;
  body: string;
  headers: IncomingHttpHeaders;
}

function send(port: number, headers: Record<string, string>): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = request(
      { host: "127.0.0.1", port, path: "/logout", method: "POST", headers },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.once("end", () => resolve({ status: res.statusCode ?? 0, body, headers: res.headers }));
      },
    );
    req.once("error", reject);
    req.end("a=b");
  });
}

const formPost = (extra: Record<string, string>) => ({
  "Content-Type": "application/x-www-form-urlencoded",
  ...extra,
});

const proxied = (extra: Record<string, string> = {}) =>
  formPost({
    Host: FORWARDED_HOST,
    "X-Forwarded-Proto": "https",
    "X-Forwarded-Host": FORWARDED_HOST,
    ...extra,
  });

describe("createApp behind a TLS-terminating proxy", () => {
  let server: ReturnType<typeof express.application.listen> | undefined;
  let port = 0;
  afterEach(() => {
    server?.close();
    server = undefined;
    seenUrls.length = 0;
  });

  const listen = (app: express.Express) =>
    new Promise<void>((resolve) => {
      const listening = app.listen(0, "127.0.0.1", () => {
        port = (listening.address() as AddressInfo).port;
        resolve();
      });
      server = listening;
    });

  const trustedApp = () =>
    createApp({
      build,
      mode: "production",
      assetsBuildDirectory: makeTmpDir(),
      publicDir: makeTmpDir(),
      logWrite: () => {},
    });

  it("hands React Router an https request.url built from X-Forwarded-Proto and -Host", async () => {
    await listen(trustedApp());
    const res = await send(port, proxied({ Origin: `https://${FORWARDED_HOST}` }));
    expect(res.status).toBe(200);
    expect(seenUrls).toEqual([`https://${FORWARDED_HOST}/logout`]);
  });

  it("accepts a same-origin form POST (https Origin) instead of the CSRF 400", async () => {
    await listen(trustedApp());
    const res = await send(port, proxied({ Origin: `https://${FORWARDED_HOST}` }));
    expect(res.status).not.toBe(400);
    expect(res.body).toBe("rendered");
  });

  it("still rejects a foreign Origin with the CSRF 400 (positive control)", async () => {
    await listen(trustedApp());
    const res = await send(port, proxied({ Origin: "https://evil.example" }));
    expect(res.status).toBe(400);
    expect(res.body).toBe("Bad Request");
    expect(seenUrls).toEqual([]);
  });

  it("negative control: without trust proxy (the pre-#557 setup) the same POST is a 400", async () => {
    const old = express();
    old.use(createRequestHandler({ build, mode: "production" }));
    await listen(old);
    const res = await send(port, proxied({ Origin: `https://${FORWARDED_HOST}` }));
    expect(res.status).toBe(400);
    expect(res.body).toBe("Bad Request");
  });

  it("without any forwarded headers request.url stays http (nothing invents https)", async () => {
    await listen(trustedApp());
    const res = await send(port, formPost({ Host: "127.0.0.1", Origin: "http://127.0.0.1" }));
    expect(res.status).toBe(200);
    expect(seenUrls).toEqual(["http://127.0.0.1/logout"]);
  });
});
