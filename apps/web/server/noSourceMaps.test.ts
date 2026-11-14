// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ServerBuild } from "react-router";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { isSourceMapPath } from "./noSourceMaps";

describe("isSourceMapPath", () => {
  it("matches .map paths in any case or encoding", () => {
    for (const p of [
      "/assets/root-abc.js.map",
      "/assets/x.css.map",
      "/A.JS.MAP",
      "/assets/x.js%2Emap",
      "/assets/x.js.map/",
      "/%E0%A4%A",
    ]) {
      expect(isSourceMapPath(p), p).toBe(true);
    }
  });

  it("leaves ordinary assets alone", () => {
    for (const p of ["/assets/root-abc.js", "/map", "/sitemap.xml", "/app/map-view", "/x.mapx"]) {
      expect(isSourceMapPath(p), p).toBe(false);
    }
  });
});

describe("createApp never serves source maps (BE-07, L14)", () => {
  const dirs: string[] = [];
  let server: Server | undefined;
  let base = "";

  beforeAll(async () => {
    const assetsDir = mkdtempSync(path.join(tmpdir(), "flump-maps-"));
    const publicDir = mkdtempSync(path.join(tmpdir(), "flump-maps-public-"));
    dirs.push(assetsDir, publicDir);
    const assets = path.join(assetsDir, "assets");
    mkdirSync(assets);
    writeFileSync(path.join(assets, "root-abc.js"), "console.log(1)");
    writeFileSync(path.join(assets, "root-abc.js.map"), '{"version":3,"sources":["secret.ts"]}');
    writeFileSync(path.join(assetsDir, "top.js.map"), "{}");
    writeFileSync(path.join(publicDir, "legacy.js.map"), "{}");
    const build = {
      entry: { module: { default: () => new Response("app", { status: 200 }) } },
      routes: {},
      assets: { version: "t", entry: { module: "", imports: [] }, routes: {}, url: "" },
      publicPath: "/",
      assetsBuildDirectory: assetsDir,
      future: {},
      ssr: true,
      isSpaMode: false,
      prerender: [],
      routeDiscovery: { mode: "initial", manifestPath: "/__manifest" },
    } as unknown as ServerBuild;
    const app = createApp({ build, mode: "production", publicDir, logWrite: () => {} });
    await new Promise<void>((resolve) => {
      const listening = app.listen(0, "127.0.0.1", () => {
        base = `http://127.0.0.1:${(listening.address() as AddressInfo).port}`;
        resolve();
      });
      server = listening;
    });
  });
  afterAll(() => {
    server?.close();
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  });

  it("still serves the script itself", async () => {
    const res = await fetch(`${base}/assets/root-abc.js`);
    expect(res.status).toBe(200);
  });

  it.each([
    "/assets/root-abc.js.map",
    "/assets/root-abc.JS.MAP",
    "/assets/root-abc.js%2Emap",
    "/top.js.map",
    "/legacy.js.map",
  ])("answers 404 for %s, with the security headers and no map body", async (urlPath) => {
    const res = await fetch(`${base}${urlPath}`);
    expect(res.status).toBe(404);
    const body = await res.text();
    expect(body).not.toContain("secret.ts");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
