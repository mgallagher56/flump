import { expect, test } from "@playwright/test";

test("document responses carry the security headers", async ({ request }) => {
  const response = await request.get("/sandbox");
  expect(response.status()).toBe(200);
  const headers = response.headers();

  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});
