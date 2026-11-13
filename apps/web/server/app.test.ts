// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
        // Variants for the non-document CSP tests: the app answering like the root middleware does
        // (its own enforced CSP on an HTML document, and on a JSON resource) versus not at all.
        const variant = req.headers.get("x-test-variant");
        const appCsp = { "Content-Security-Policy": "frame-ancestors 'none'" };
        if (variant === "html-own-csp") {
          return new Response("<!doctype html><p>hi", {
            headers: {
              ...appCsp,
              "Content-Type": "text/html",
              "Content-Security-Policy-Report-Only": "default-src 'self'",
            },
          });
        }
        if (variant === "json-own-csp") {
          return Response.json({ ok: true }, { headers: appCsp });
        }
        if (variant === "html-no-csp") {
          return new Response("<!doctype html><p>hi", { headers: { "Content-Type": "text/html" } });
        }
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

// Default CSP for responses outside the app's own headers (E20-N11 follow-up, plan for N12).
const FRAME_ONLY = "frame-ancestors 'none'";
const NON_DOCUMENT = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";

function fetchRaw(
  port: number,
  init: { path: string; method?: string; headers?: Record<string, string>; body?: string },
): Promise<{ status: number; headers: IncomingHttpHeaders; rawHeaders: string[] }> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: "127.0.0.1",
        port,
        path: init.path,
        method: init.method ?? "GET",
        headers: init.headers,
      },
      (res) => {
        res.resume();
        res.once("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            rawHeaders: res.rawHeaders,
          }),
        );
      },
    );
    req.once("error", reject);
    req.end(init.body);
  });
}

const countHeader = (rawHeaders: string[], name: string) =>
  rawHeaders.filter((h, i) => i % 2 === 0 && h.toLowerCase() === name).length;

describe("createApp default CSP for non-document responses", () => {
  let server: ReturnType<typeof express.application.listen> | undefined;
  let port = 0;
  afterEach(() => {
    server?.close();
    server = undefined;
  });

  async function start() {
    const publicDir = makeTmpDir();
    writeFileSync(path.join(publicDir, "data.json"), '{"a":1}');
    writeFileSync(path.join(publicDir, "app.js"), "console.log(1)");
    writeFileSync(path.join(publicDir, "style.css"), "a{color:red}");
    writeFileSync(path.join(publicDir, "pic.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    writeFileSync(path.join(publicDir, "font.woff2"), Buffer.from([0x77, 0x4f, 0x46, 0x32]));
    writeFileSync(path.join(publicDir, "note.txt"), "hello");
    writeFileSync(path.join(publicDir, "logo.svg"), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    writeFileSync(path.join(publicDir, "page.html"), "<!doctype html><p>static document");
    const app = createApp({
      build,
      mode: "production",
      assetsBuildDirectory: makeTmpDir(),
      publicDir,
      logWrite: () => {},
    });
    await new Promise<void>((resolve) => {
      const listening = app.listen(0, "127.0.0.1", () => {
        port = (listening.address() as AddressInfo).port;
        resolve();
      });
      server = listening;
    });
  }

  it.each([
    ["JSON file", "/data.json"],
    ["CSS file", "/style.css"],
    ["font", "/font.woff2"],
    ["plain text file", "/note.txt"],
  ])("sends the restrictive policy once on a static %s", async (_label, urlPath) => {
    await start();
    const res = await fetchRaw(port, { path: urlPath });
    expect(res.status).toBe(200);
    expect(res.headers["content-security-policy"]).toBe(NON_DOCUMENT);
    expect(countHeader(res.rawHeaders, "content-security-policy")).toBe(1);
    // The rest of the security header set is unchanged.
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it.each([
    ["JavaScript (a Worker would inherit its policy)", "/app.js"],
    ["SVG (a document that may carry inline style)", "/logo.svg"],
    ["static HTML (a document)", "/page.html"],
    ["raster image (the browser image viewer needs inline styles)", "/pic.png"],
  ])("keeps the frame-ancestors-only default on static %s", async (_label, urlPath) => {
    await start();
    const res = await fetchRaw(port, { path: urlPath });
    expect(res.status).toBe(200);
    expect(res.headers["content-security-policy"]).toBe(FRAME_ONLY);
    expect(countHeader(res.rawHeaders, "content-security-policy")).toBe(1);
  });

  it("keeps the default on a 304 (no Content-Type) so a cached file's policy is not rewritten", async () => {
    await start();
    const first = await fetchRaw(port, { path: "/data.json" });
    const etag = first.headers.etag as string;
    const res = await fetchRaw(port, { path: "/data.json", headers: { "If-None-Match": etag } });
    expect(res.status).toBe(304);
    expect(res.headers["content-security-policy"]).toBe(FRAME_ONLY);
  });

  it("sends the restrictive policy on the document-level CSRF 400 text response", async () => {
    await start();
    const res = await fetchRaw(port, {
      path: "/logout",
      method: "POST",
      headers: { ...formPost({ Origin: "https://evil.example" }) },
      body: "a=b",
    });
    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toMatch(/^text\/plain/);
    expect(res.headers["content-security-policy"]).toBe(NON_DOCUMENT);
    expect(countHeader(res.rawHeaders, "content-security-policy")).toBe(1);
  });

  it("an HTML document with the app's own CSP keeps exactly that header, once, plus the report-only one", async () => {
    await start();
    const res = await fetchRaw(port, {
      path: "/logout",
      method: "POST",
      headers: formPost({ Origin: `http://127.0.0.1:${port}`, "x-test-variant": "html-own-csp" }),
      body: "a=b",
    });
    expect(res.headers["content-type"]).toMatch(/^text\/html/);
    expect(res.headers["content-security-policy"]).toBe(FRAME_ONLY);
    expect(countHeader(res.rawHeaders, "content-security-policy")).toBe(1);
    expect(res.headers["content-security-policy-report-only"]).toBe("default-src 'self'");
    expect(countHeader(res.rawHeaders, "content-security-policy-report-only")).toBe(1);
  });

  it("a text/html response without an app CSP keeps the frame-ancestors-only default", async () => {
    await start();
    const res = await fetchRaw(port, {
      path: "/logout",
      method: "POST",
      headers: formPost({ Origin: `http://127.0.0.1:${port}`, "x-test-variant": "html-no-csp" }),
      body: "a=b",
    });
    expect(res.headers["content-security-policy"]).toBe(FRAME_ONLY);
  });

  it("never replaces a CSP the app set itself, even on a JSON response", async () => {
    await start();
    const res = await fetchRaw(port, {
      path: "/logout",
      method: "POST",
      headers: formPost({ Origin: `http://127.0.0.1:${port}`, "x-test-variant": "json-own-csp" }),
      body: "a=b",
    });
    expect(res.headers["content-type"]).toMatch(/^application\/json/);
    expect(res.headers["content-security-policy"]).toBe(FRAME_ONLY);
    expect(countHeader(res.rawHeaders, "content-security-policy")).toBe(1);
  });
});
