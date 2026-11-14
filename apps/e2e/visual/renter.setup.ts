import { test as setup } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";
import { applyPersona } from "../support/personas";

setup.use({ storageState: AUTH_STATE });

/** Runs after the homeowner shots (project `dependencies`): re-seeds the user as the renter. */
setup("seed the renter persona", async ({ page }) => {
  await page.goto("/healthz");
  await applyPersona(page, "renter");
});
