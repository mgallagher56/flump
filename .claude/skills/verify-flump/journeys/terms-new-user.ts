/**
 * terms-new-user: a person signing in for the first time sees the terms acceptance page before
 * anything else, agrees, and goes on to setup. Second view: the app now opens setup directly, and
 * reloading the acceptance page goes straight on (the agreement is saved).
 *
 * Needs a run with no persona (seeding agrees to the terms):
 *   verify-flump up --skip-build --no-seed
 *   verify-flump drive terms-new-user <run-id>
 */
import { expect, journey, open } from "../scripts/lib.ts";

await journey(
  "terms-new-user",
  async ({ page, step }) => {
    await step("sign in: the terms page shows before anything else", async () => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/terms-acceptance\?next=/);
      await expect(
        page.getByRole("heading", { level: 1, name: "Please read and agree to our terms" }),
      ).toBeVisible();
      // Focused page: no app navigation, nothing pre-ticked, no checkbox at all.
      await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
      await expect(page.getByRole("checkbox")).toHaveCount(0);
      await expect(page.getByText("You do not need to agree to it.")).toBeVisible();
    });

    await step("an app page sends them back to the terms", async () => {
      await open(page, "/app/accounts");
      await expect(page).toHaveURL(/\/terms-acceptance\?next=%2Fapp%2Faccounts/);
    });

    await step("agree and continue: setup opens", async () => {
      await open(page, "/terms-acceptance?next=%2Fapp");
      await page.getByRole("button", { name: "Agree and continue" }).click();
      await page.waitForURL(/\/app\/onboarding$/);
      await expect(page.getByRole("heading", { level: 1, name: "Set up Flump" })).toBeVisible();
    });

    await step("second view: the terms page goes straight on now", async () => {
      await open(page, "/terms-acceptance?next=%2Fapp");
      await expect(page).toHaveURL(/\/app\/onboarding$/);
    });
  },
  { signedIn: false },
);
