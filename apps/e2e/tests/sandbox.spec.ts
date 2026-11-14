import { expect, test } from "@playwright/test";

test("sandbox section cards are locked with an icon and no inline link", async ({ page }) => {
  await page.goto("/sandbox");
  await expect(page.getByRole("heading", { level: 1, name: "Example figures" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Locked in this example" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign up", exact: true })).toHaveCount(2);
});
