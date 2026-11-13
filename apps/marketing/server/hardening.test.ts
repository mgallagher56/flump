// @vitest-environment node
import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { applyServerHardening } from "./hardening";

type Closeable = { close: (cb: () => void) => void };
const open: Closeable[] = [];

afterEach(async () => {
  await Promise.all(open.splice(0).map((s) => new Promise<void>((r) => s.close(r))));
});

async function get(app: express.Express, path: string): Promise<Response> {
  const server = app.listen(0, "127.0.0.1");
  open.push(server);
  await new Promise<void>((r) => server.once("listening", r));
  const { port } = server.address() as AddressInfo;
  return fetch(`http://127.0.0.1:${port}${path}`);
}

describe("applyServerHardening", () => {
  it("control: an Express app sends X-Powered-By by default", async () => {
    const app = express();
    app.get("/x", (_req, res) => res.send("ok"));
    const res = await get(app, "/x");
    expect(res.headers.get("x-powered-by")).toBe("Express");
  });

  it("removes X-Powered-By on success, 404 and error responses", async () => {
    const app = express();
    applyServerHardening(app);
    app.get("/ok", (_req, res) => res.send("ok"));
    app.get("/boom", () => {
      throw new Error("boom");
    });
    const [ok, missing, boom] = await Promise.all([
      get(app, "/ok"),
      get(app, "/nope"),
      get(app, "/boom"),
    ]);
    expect(ok.status).toBe(200);
    expect(missing.status).toBe(404);
    expect(boom.status).toBe(500);
    for (const res of [ok, missing, boom]) {
      expect(res.headers.get("x-powered-by")).toBeNull();
    }
  });
});
