import { expect, test } from "@playwright/test";

test("sandbox navigation marks locked items with 'Sign up to open'", async ({ page }) => {
  await page.goto("/sandbox");
  const locked = page.getByRole("button", { name: /Sign up to open/ }).first();
  await expect(locked).toBeVisible();
  await expect(locked).toHaveAttribute("aria-disabled", "true");
  await expect(locked.getByText("Sign up to open")).toBeVisible();
});
