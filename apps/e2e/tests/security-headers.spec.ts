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

test("unmatched paths run the middleware and are not cacheable", async ({ request }) => {
  const response = await request.get("/definitely-not-a-route");
  expect(response.status()).toBe(404);
  const headers = response.headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["cache-control"]).toBe("no-store");
});

test("personal-data documents are no-store, public tools pages are not forced", async ({
  request,
}) => {
  const sandbox = await request.get("/sandbox");
  expect(sandbox.headers()["cache-control"]).toBe("no-store");

  const tools = await request.get("/tools");
  expect(tools.status()).toBe(200);
  expect(tools.headers()["cache-control"]).toBeUndefined();
});

test("healthz keeps its own no-store", async ({ request }) => {
  const response = await request.get("/healthz");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
});
