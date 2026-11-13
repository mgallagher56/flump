// @vitest-environment node
import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { NON_DOCUMENT_CSP, SECURITY_HEADERS } from "../app/security/headers.server";
import { securityHeaders, wantsNonDocumentCsp } from "./securityHeaders";

describe("securityHeaders", () => {
  let server: ReturnType<typeof express.application.listen> | undefined;
  afterEach(() => server?.close());

  async function get(handler: express.RequestHandler) {
    const app = express();
    app.use(securityHeaders());
    app.use(handler);
    server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    return fetch(`http://127.0.0.1:${port}/`);
  }

  it("stamps the full set on a plain response", async () => {
    const res = await get((_req, r) => {
      r.status(500).send("boom");
    });
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(res.headers.get(name)).toBe(value);
    }
  });

  it("lets the app's own appended header win without duplicating", async () => {
    const res = await get((_req, r) => {
      r.append("Content-Security-Policy", "default-src 'self'; script-src 'nonce-abc'");
      r.append("Set-Cookie", "a=b");
      r.send("ok");
    });
    expect(res.headers.get("content-security-policy")).toBe(
      "default-src 'self'; script-src 'nonce-abc'",
    );
    expect(res.headers.get("strict-transport-security")).toBe(
      SECURITY_HEADERS["Strict-Transport-Security"],
    );
  });

  it("passes the app's report-only CSP through once next to the enforced default (E20-N11)", async () => {
    const res = await get((_req, r) => {
      // What @react-router/express does with the middleware's response headers.
      r.append("Content-Security-Policy", "frame-ancestors 'none'");
      r.append("Content-Security-Policy-Report-Only", "default-src 'self'; script-src 'nonce-abc'");
      r.send("ok");
    });
    expect(res.headers.get("content-security-policy")).toBe("frame-ancestors 'none'");
    expect(res.headers.get("content-security-policy-report-only")).toBe(
      "default-src 'self'; script-src 'nonce-abc'",
    );
  });

  it("keeps the enforced frame-ancestors default when the app sends only a report-only CSP", async () => {
    const res = await get((_req, r) => {
      r.append("Content-Security-Policy-Report-Only", "default-src 'self'");
      r.send("ok");
    });
    expect(res.headers.get("content-security-policy")).toBe("frame-ancestors 'none'");
  });

  describe("non-document default CSP", () => {
    const csp = (res: Response) => res.headers.get("content-security-policy");

    it("upgrades a JSON response the app gave no CSP", async () => {
      const res = await get((_req, r) => {
        r.json({ a: 1 });
      });
      expect(csp(res)).toBe(NON_DOCUMENT_CSP);
    });

    it("leaves text/html, svg and javascript on the frame-ancestors-only default", async () => {
      for (const type of ["text/html", "image/svg+xml", "text/javascript", "application/pdf"]) {
        const res = await get((_req, r) => {
          r.type(type).send("x");
        });
        expect(csp(res), type).toBe("frame-ancestors 'none'");
      }
    });

    it("leaves a response without a Content-Type alone (204)", async () => {
      const res = await get((_req, r) => {
        r.status(204).end();
      });
      expect(csp(res)).toBe("frame-ancestors 'none'");
    });

    it("upgrades an error response that declares no Content-Type (Bun's lazy default)", async () => {
      const res = await get((_req, r) => {
        r.status(400).end("Bad Request");
      });
      expect(res.headers.get("content-type")).toBeNull();
      expect(csp(res)).toBe(NON_DOCUMENT_CSP);
    });

    it("keeps the default for a bodiless untyped 304", async () => {
      const notModified = await get((_req, r) => {
        r.status(304).end();
      });
      expect(csp(notModified)).toBe("frame-ancestors 'none'");
    });

    it("never overrides a CSP set with setHeader, append or writeHead", async () => {
      const own = "default-src 'self'";
      const viaSet = await get((_req, r) => {
        r.setHeader("Content-Security-Policy", own);
        r.json({});
      });
      expect(csp(viaSet)).toBe(own);
      const viaAppend = await get((_req, r) => {
        r.append("Content-Security-Policy", own);
        r.json({});
      });
      expect(csp(viaAppend)).toBe(own);
      const viaWriteHead = await get((_req, r) => {
        r.writeHead(200, { "Content-Type": "application/json", "Content-Security-Policy": own });
        r.end("{}");
      });
      expect(csp(viaWriteHead)).toBe(own);
    });

    it("reads the Content-Type from writeHead's headers object too", async () => {
      const res = await get((_req, r) => {
        r.writeHead(200, { "Content-Type": "application/json" });
        r.end("{}");
      });
      expect(csp(res)).toBe(NON_DOCUMENT_CSP);
    });

    it("wantsNonDocumentCsp allow-list", () => {
      for (const t of [
        "application/json; charset=utf-8",
        "application/problem+json",
        "text/plain;charset=UTF-8",
        "text/css",
        "font/woff2",
      ]) {
        expect(wantsNonDocumentCsp(t), t).toBe(true);
      }
      // A missing type qualifies only on an error status.
      expect(wantsNonDocumentCsp(undefined, 400)).toBe(true);
      expect(wantsNonDocumentCsp("", 500)).toBe(true);
      expect(wantsNonDocumentCsp(undefined, 204)).toBe(false);
      expect(wantsNonDocumentCsp(undefined, 304)).toBe(false);
      expect(wantsNonDocumentCsp(undefined, 302)).toBe(false);
      // A document type never qualifies, whatever the status.
      expect(wantsNonDocumentCsp("text/html", 500)).toBe(false);
      for (const t of [
        undefined,
        "",
        "text/html",
        "application/xhtml+xml",
        "image/svg+xml",
        "image/png",
        "image/x-icon",
        "text/xml",
        "application/xml",
        "text/javascript",
        "application/javascript",
        "application/pdf",
        "application/octet-stream",
        "application/wasm",
      ]) {
        expect(wantsNonDocumentCsp(t), String(t)).toBe(false);
      }
    });
  });

  it("does not double a header the app sets with the same value", async () => {
    const res = await get((_req, r) => {
      r.append("X-Frame-Options", "DENY");
      r.send("ok");
    });
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });
});
