/**
 * terms-existing-user: someone who used Flump before terms acceptance existed (data saved, no
 * agreement on record) is asked to read and agree on their next visit. Before agreeing they can
 * still download their data and sign out. Second view: the saved export file holds their data.
 *
 * Needs the homeowner persona with its agreement removed, as before this feature:
 *   RUN=$(verify-flump up --skip-build)
 *   docker exec flump-verify-$RUN-pg psql -U postgres -d flump_e2e -c 'DELETE FROM terms_acceptances'
 *   sleep 31   # the backend trusts a saved agreement for 30 seconds
 *   verify-flump drive terms-existing-user $RUN
 * It signs the user out at the end; `verify-flump seed homeowner $RUN` signs in and agrees again.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, journey, open } from "../scripts/lib.ts";

await journey("terms-existing-user", async ({ page, step, save, dir }) => {
  await step("the dashboard sends them to the terms first", async () => {
    await open(page, "/");
    await expect(page).toHaveURL(/\/terms-acceptance\?next=%2F/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Please read and agree to our terms" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "If you do not agree, you cannot use Flump. You can still download your data or delete your account.",
      ),
    ).toBeVisible();
    await expect(page.getByTestId("terms-data-actions")).toBeVisible();
  });

  await step("download your data without agreeing", async () => {
    const section = page.locator("#export-data-section");
    const downloading = page.waitForEvent("download");
    await section.getByRole("button", { name: "Download your data" }).click();
    const download = await downloading;
    await download.saveAs(join(dir, "export.json"));
    await expect(section.getByRole("status")).toHaveText("Your download has started.");
  });

  await step("second view: the export holds their saved accounts and no agreement", async () => {
    const body = JSON.parse(readFileSync(join(dir, "export.json"), "utf8")) as {
      accounts: Array<{ name: string }>;
      termsAcceptances: unknown[];
    };
    save("export-summary.json", {
      accounts: body.accounts.map((a) => a.name),
      termsAcceptances: body.termsAcceptances,
    });
    expect(body.accounts.map((a) => a.name)).toContain("Current account");
    expect(body.termsAcceptances).toEqual([]);
  });

  await step("delete is offered without agreeing", async () => {
    await page.getByTestId("delete-account-trigger").click();
    await expect(page.getByRole("alertdialog", { name: "Delete your account?" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  await step("sign out without agreeing", async () => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/\/terms-acceptance/);
    await expect(page).not.toHaveURL(/\/app/);
  });
});
