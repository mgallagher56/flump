import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";

/**
 * AI connections through the same-origin `/api` proxy, and the imports list (loaded server-side),
 * for the signed-in dev user (the E2E backend runs in development, where MCP and imports access is
 * open). The allowlist itself, 200 for an allowed user and 404 for anyone else, is covered by the
 * backend authz suite (apps/backend/test/authz/authz.imports.spec.ts): the dev session has a single
 * identity.
 */
test.describe("AI connections and imports through the /api proxy", () => {
  test.use({ storageState: AUTH_STATE });

  test("the settings AI connections card loads its tokens", async ({ page }) => {
    const tokensResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/mcp-tokens" &&
        response.request().method() === "GET",
    );
    await page.goto("/app/profile?tab=security");

    expect((await tokensResponse).status()).toBe(200);
    await expect(page.getByRole("heading", { name: "AI connections (preview)" })).toBeVisible();
    await expect(page.getByTestId("generate-token-trigger")).toBeVisible();
    await expect(page.getByTestId("token-creation-unavailable")).toHaveCount(0);
    await expect(page.getByTestId("mcp-token-error")).toHaveCount(0);
  });

  test("lists imports for an allowed user", async ({ page }) => {
    await page.goto("/app/imports");
    await expect(page.getByTestId("imports-list")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Imports", exact: true })).toBeVisible();
  });
});
