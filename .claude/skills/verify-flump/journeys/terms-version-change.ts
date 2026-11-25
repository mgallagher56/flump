/**
 * terms-version-change: someone who agreed while an earlier privacy notice applied (0.1) is shown
 * the new one (0.2) on their next visit. The privacy notice is information, so the page asks them
 * only to read it and select Continue, never to agree. Second view: the dashboard opens and the
 * terms page goes straight on.
 *
 * Needs the homeowner persona with its agreement moved back to privacy notice 0.1:
 *   RUN=$(verify-flump up --skip-build)
 *   docker exec flump-verify-$RUN-pg psql -U postgres -d flump_e2e \
 *     -c "UPDATE terms_acceptances SET privacy_notice_version = '0.1'"
 *   sleep 31   # the backend trusts a saved agreement for 30 seconds
 *   verify-flump drive terms-version-change $RUN
 */
import { expect, journey, open } from "../scripts/lib.ts";

await journey("terms-version-change", async ({ page, step }) => {
  await step("the dashboard sends them to the changed privacy notice", async () => {
    await open(page, "/");
    await expect(page).toHaveURL(/\/terms-acceptance\?next=%2F/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Our privacy notice has changed" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Agree and continue" })).toHaveCount(0);
    await expect(
      page.getByText(
        "If you would rather not continue, you can still download your data or delete your account.",
      ),
    ).toBeVisible();
  });

  await step("continue: back to the dashboard", async () => {
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByRole("heading", { name: "Your money" })).toBeVisible();
  });

  await step("second view: the terms page goes straight on now", async () => {
    await open(page, "/terms-acceptance?next=%2F");
    await expect(page).toHaveURL((url) => url.pathname === "/");
  });
});
