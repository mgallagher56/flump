import { expect, test } from "@playwright/test";

test("/sandbox redirects to /signup", async ({ request }) => {
  const response = await request.get("/sandbox", { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  expect(response.headers().location).toBe("/signup");
});
