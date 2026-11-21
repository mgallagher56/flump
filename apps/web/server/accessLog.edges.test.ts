// @vitest-environment node
import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientIp } from "../app/security/request-id.server";
import { accessLog, normalisePath } from "./accessLog";

describe("normalisePath edge cases", () => {
  it("keeps short static segments that only start or end with a digit", () => {
    expect(normalisePath("/onboarding/step2")).toBe("/onboarding/step2");
    expect(normalisePath("/settings/2fa")).toBe("/settings/2fa");
  });

  it("collapses a hex id of 12 to 19 characters, too short to count as a token", () => {
    expect(normalisePath("/h/0123456789abcdef")).toBe("/h/:id");
  });

  it("caps the logged path at 200 characters", () => {
    // "/" then 60 x "seg/" is 241 characters; none of the segments collapse.
    const long = `/${"seg/".repeat(60)}`;
    expect(normalisePath(long)).toBe(long.slice(0, 200));
    expect(normalisePath(long)).toHaveLength(200);
  });
});

describe("accessLog middleware details", () => {
  let server: ReturnType<typeof express.application.listen> | undefined;
  afterEach(() => {
    server?.close();
    vi.restoreAllMocks();
  });

  const listen = (app: express.Express) => {
    server = app.listen(0);
    return (server.address() as AddressInfo).port;
  };
  const settle = () => new Promise((r) => setTimeout(r, 30));

  it("logs a 400 from a health probe", async () => {
    const lines: string[] = [];
    const app = express();
    app.use(accessLog({ json: true, write: (l) => lines.push(l) }));
    app.use((_req, res) => {
      res.status(400).send("bad");
    });
    const port = listen(app);
    await (await fetch(`http://127.0.0.1:${port}/healthz`)).text();
    await settle();
    expect(lines).toHaveLength(1);
  });

  it("writes to the console when no writer is given", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const app = express();
    app.use(accessLog({ json: true }));
    app.use((_req, res) => {
      res.send("ok");
    });
    const port = listen(app);
    await (await fetch(`http://127.0.0.1:${port}/x`)).text();
    await settle();
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0][0] as string).route).toBe("/x");
  });

  it("records the duration in milliseconds to one decimal place", async () => {
    const lines: string[] = [];
    const app = express();
    app.use(accessLog({ json: true, write: (l) => lines.push(l) }));
    app.use((_req, res) => {
      setTimeout(() => res.send("ok"), 40);
    });
    const port = listen(app);
    await (await fetch(`http://127.0.0.1:${port}/slow`)).text();
    await settle();
    const { durationMs } = JSON.parse(lines[0]);
    // The handler waits 40ms, so the figure is at least about 40 and well under a second.
    expect(durationMs).toBeGreaterThanOrEqual(35);
    expect(durationMs).toBeLessThan(1000);
    expect(Number.isInteger(Math.round(durationMs * 10 * 1000) / 1000)).toBe(true);
  });

  it("marks a request the client gave up on as aborted", async () => {
    const lines: string[] = [];
    const app = express();
    app.use(accessLog({ json: true, write: (l) => lines.push(l) }));
    app.use(() => {
      // Never responds.
    });
    const port = listen(app);
    const controller = new AbortController();
    const pending = fetch(`http://127.0.0.1:${port}/hang`, { signal: controller.signal }).catch(
      () => undefined,
    );
    await settle();
    controller.abort();
    await pending;
    await settle();
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({ route: "/hang", aborted: true });
  });

  it("holds the client address for backend calls made during the request", async () => {
    let seen: { ip?: string; held?: string } = {};
    const app = express();
    app.use(accessLog({ json: true, write: () => {} }));
    app.use((req, res) => {
      seen = { ip: req.ip, held: getClientIp() };
      res.send("ok");
    });
    const port = listen(app);
    await (await fetch(`http://127.0.0.1:${port}/x`)).text();
    expect(seen.ip).toBeTruthy();
    expect(seen.held).toBe(seen.ip);
  });
});
