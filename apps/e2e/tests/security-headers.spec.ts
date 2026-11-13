import { expect, test } from "@playwright/test";

test("document responses carry the security headers", async ({ request }) => {
  const response = await request.get("/sandbox");
  expect(response.status()).toBe(200);
  const headers = response.headers();

  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("unmatched multi-segment paths run the middleware and are not cacheable", async ({
  request,
}) => {
  // Multi-segment so it hits the `$.tsx` splat; a single segment is caught by the legacy
  // `$feature._index` redirect instead.
  const response = await request.get("/no/such/page");
  expect(response.status()).toBe(404);
  const headers = response.headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["cache-control"]).toBe("no-store");
});

test("a single-segment unmatched path is a no-store 404, not a cacheable redirect (R-14)", async ({
  request,
}) => {
  const response = await request.get("/definitely-not-a-route", { maxRedirects: 0 });
  expect(response.status()).toBe(404);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
});

test("HTML and .data responses are no-store, including the public tools pages", async ({
  request,
}) => {
  for (const path of ["/sandbox", "/tools", "/tools.data"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.headers()["cache-control"], path).toBe("no-store");
  }
});

test("healthz keeps its own no-store", async ({ request }) => {
  const response = await request.get("/healthz");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("documents carry a nonce report-only CSP next to the unchanged enforced frame-ancestors CSP (E20-N11)", async ({
  request,
}) => {
  const response = await request.get("/sandbox");
  expect(response.status()).toBe(200);
  const headers = response.headers();

  expect(headers["content-security-policy"]).toBe("frame-ancestors 'none'");
  const policy = headers["content-security-policy-report-only"];
  expect(policy).toBeDefined();
  const nonce = /'nonce-([A-Za-z0-9_-]{22})'/.exec(policy ?? "")?.[1];
  expect(nonce).toBeDefined();
  expect(policy).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9_-]{22}'(;|$)/);
  expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  expect(policy).toContain("report-uri /csp-report");

  // Every script element in the document carries the same nonce (inline ones need it to run).
  const html = await response.text();
  const scripts = html.match(/<script\b[^>]*>/gi) ?? [];
  expect(scripts.length).toBeGreaterThan(0);
  for (const tag of scripts) expect(tag).toContain(`nonce="${nonce}"`);

  // A fresh nonce per request.
  const again = await request.get("/sandbox");
  expect(again.headers()["content-security-policy-report-only"]).not.toBe(policy);
});

test("/csp-report takes a same-origin report with 204", async ({ request, baseURL }) => {
  const response = await request.post("/csp-report", {
    headers: { "Content-Type": "application/csp-report", Origin: baseURL ?? "" },
    data: JSON.stringify({
      "csp-report": { "effective-directive": "img-src", "blocked-uri": "inline" },
    }),
  });
  expect(response.status()).toBe(204);
  expect(response.headers()["x-frame-options"]).toBe("DENY");
});
