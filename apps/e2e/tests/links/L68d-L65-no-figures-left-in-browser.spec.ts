import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { waitForHydration } from "../../support/page";
import { applyPersona } from "../../support/personas";

test.use({ storageState: AUTH_STATE });

// Runs after L68 (the file name sorts it there): L68 starts a fresh minute of the backend's request
// limits, and the burst of homeowner specs before L67 has no room left for this one.

/** Every browser storage entry, as "key=value". */
const stored = (page: Page) =>
  page.evaluate(() =>
    [localStorage, sessionStorage].flatMap((store) =>
      Object.keys(store).map((key) => `${key}=${store.getItem(key)}`),
    ),
  );

/** Keys earlier versions kept about the person (USER_STORAGE_KEYS in apps/web). */
const RETIRED_KEYS = [
  "flump_financial_baseline_v2",
  "flump_financial_baseline_v1",
  "flump_setup_checklist_dismissed",
];

// L65 (CS-3, audit slice 8): using the signed-in pages leaves no figure about the person in
// browser storage, and signing out clears anything an earlier version left there. The sign-out
// request itself is answered here, so the shared test session stays signed in for later specs.
// A financial data reset is not run (it is limited to a few an hour); its browser clear is
// covered by the Settings unit tests.
test("L65 signed-in pages keep no figures in the browser, and sign-out clears old ones", async ({
  page,
}) => {
  await page.goto("/app");
  await applyPersona(page, "homeowner");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // The pages that read the old browser baseline or checklist flag, kept to three page loads.
  for (const path of ["/app", "/app/pension", "/app/take-home"]) {
    await page.goto(path);
    await waitForHydration(page);
  }
  const afterUse = await stored(page);
  for (const key of RETIRED_KEYS) {
    expect(afterUse.some((entry) => entry.startsWith(`${key}=`))).toBe(false);
  }
  // The homeowner's saved salary and take-home appear nowhere in browser storage.
  expect(afterUse.filter((entry) => /58000|58,000|3450|3,450/.test(entry))).toEqual([]);

  // An earlier version's leftovers, then sign out.
  await page.evaluate((keys) => {
    for (const key of keys) localStorage.setItem(key, "left by an earlier version");
  }, RETIRED_KEYS);
  await page.route(/\/logout(\.data)?(\?.*)?$/, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<p>Signed out</p>" }),
  );
  await page.locator("#avatar-menu-trigger").click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect
    .poll(async () =>
      (await stored(page)).filter((e) => RETIRED_KEYS.some((k) => e.startsWith(`${k}=`))),
    )
    .toEqual([]);
});
