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
