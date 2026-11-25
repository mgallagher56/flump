/**
 * data-rights-not-invited: a signed-in account that is not in the beta sees the "not invited"
 * page, downloads its data there (the file is saved and checked as JSON for this user), deletes
 * its account through the type-to-confirm dialog, lands on the account-deleted page and cannot get
 * back in. Locally there is no WorkOS client, so the deletion erases the data and the page asks to
 * finish removing the login (the "pending" state); the journey accepts that or the plain
 * confirmation. Second views: the saved export file, and signing in again after the deletion.
 *
 * Needs an invite-only run where the run's user is not invited. Locally the beta is open unless a
 * beta admin is set, and the dev user is the only user, so start the run with an admin who is
 * someone else, and skip seeding (it would fail with 403: the user cannot write data). This
 * journey signs in itself through /login.
 *   BETA_ADMIN_USER_IDS=verify_other_admin verify-flump up --skip-build --no-seed
 *   verify-flump drive data-rights-not-invited <run-id>
 *   verify-flump down <run-id>
 * It erases the run's user, so run it last on its run.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, journey, open } from "../scripts/lib.ts";

const NOT_INVITED = "This account has not been invited yet";

await journey(
  "data-rights-not-invited",
  async ({ page, step, save, dir }) => {
    await step("sign in: the not-invited page shows instead of the app", async () => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { level: 1, name: NOT_INVITED })).toBeVisible();
      await expect(page.getByTestId("not-invited-data-actions")).toBeVisible();
      // No app chrome: no main navigation for someone outside the beta.
      await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
    });

    await step("an app page is refused the same way", async () => {
      await open(page, "/app/accounts");
      await expect(page.getByRole("heading", { level: 1, name: NOT_INVITED })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Your accounts" })).toHaveCount(0);
    });

    await step("download your data", async () => {
      const section = page.locator("#export-data-section");
      const downloading = page.waitForEvent("download");
      await section.getByRole("button", { name: "Download your data" }).click();
      const download = await downloading;
      expect(download.suggestedFilename()).toMatch(/^flump-export-\d{4}-\d{2}-\d{2}\.json$/);
      await download.saveAs(join(dir, "export.json"));
      await expect(section.getByRole("status")).toHaveText("Your download has started.");
    });

    await step("the download is JSON for this user", async () => {
      const text = readFileSync(join(dir, "export.json"), "utf8");
      const body = JSON.parse(text) as Record<string, unknown>;
      save("export-keys.json", Object.keys(body));
      expect(typeof body).toBe("object");
      // The dev sign-in's user id (apps/backend/src/auth/dev-bypass.verifier.ts).
      expect(text).toContain("dev_user_123");
    });

    await step("open Delete account and confirm with DELETE", async () => {
      await page.getByRole("button", { name: "Delete account", exact: true }).click();
      const dialog = page.getByRole("alertdialog", { name: "Delete your account?" });
      await expect(dialog).toBeVisible();
      const confirm = dialog.getByRole("button", { name: "Delete my account" });
      await expect(confirm).toBeDisabled();
      await dialog.getByRole("textbox").fill("DELETE");
      await expect(confirm).toBeEnabled();
    });

    await step("delete: land on the account-deleted page", async () => {
      await page
        .getByRole("alertdialog", { name: "Delete your account?" })
        .getByRole("button", { name: "Delete my account" })
        .click();
      await page.waitForURL(/\/account-deleted(\?|$)/);
      // A local run has no WorkOS client, so the data is erased but removing the login stays
      // pending: the page then shows its last step. With WorkOS it is the plain confirmation.
      const pending = new URL(page.url()).searchParams.get("state") === "pending";
      save("delete-outcome.json", { url: page.url(), pending });
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: pending ? "Finish deleting your account" : "Your account has been deleted",
        }),
      ).toBeVisible();
      if (pending) await expect(page.getByText("Your data has been deleted.")).toBeVisible();
    });

    await step("the app is closed to the deleted account", async () => {
      await open(page, "/app/accounts");
      await expect(page.getByRole("heading", { name: "Your accounts" })).toHaveCount(0);
      await expect(page.getByTestId("not-invited-data-actions")).toHaveCount(0);
      save("after-delete-app.json", { url: page.url() });
    });

    await step("signing in again does not get back in", async () => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");
      const url = new URL(page.url());
      const h1 = ((await page.getByRole("heading", { level: 1 }).first().textContent()) ?? "")
        .trim()
        .replace(/\s+/g, " ");
      save("after-delete-sign-in.json", { url: url.pathname + url.search, h1 });
      await expect(page.getByRole("heading", { name: "Your money" })).toHaveCount(0);
      await expect(page.getByTestId("not-invited-data-actions")).toHaveCount(0);
      await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
    });
  },
  { signedIn: false },
);
