/**
 * mortgage-estimates: on Mortgage estimates, the "From income" tool takes England stamp duty off
 * the deposit (E39 S1c, PR #905). A £50,000 income at 4 times gives a £200,000 loan; with a
 * £50,000 deposit the property price is £250,000 until the stamp duty answers are in. Answering
 * "England or Northern Ireland" and "No" (not first-time buyers) shows stamp duty of £2,450 and
 * the price falls to about £248,000; answering "Yes" (first-time buyers) shows £0 and the price
 * goes back to £250,000. A reload proves the scenario is not stored.
 * Run: verify-flump drive mortgage-estimates <run-id>
 *
 * Hand working, England SDLT from 1 April 2025 (main home, no other home owned):
 *   Standard bands: 0% to £125,000, 2% to £250,000, 5% to £925,000, 10% to £1.5m, 12% above.
 *   First-time buyer relief (price up to £500,000): 0% to £300,000, 5% to £500,000.
 *   Budget for price plus tax: loan 200,000 + deposit 50,000 - other costs 0 = 250,000.
 *   Not first-time buyers: P + 0.02 x (P - 125,000) = 250,000, so P = 252,500 / 1.02 = 247,549.02.
 *   SDLT is floored to the pound: at P = 247,549.99, 0.02 x 122,549.99 = 2,450.9998, floored 2,450,
 *   and 247,549.99 + 2,450 = 249,999.99 fits; at P = 247,550.00 the tax is 2,451 and it does not.
 *   So stamp duty £2,450, price shown to 3 significant figures ~£248,000, loan to value
 *   200,000 / 247,549.99 = 80.8%, shown 81%.
 *   First-time buyers: a £250,000 price is under £300,000, so the tax is £0, price ~£250,000, 80%.
 */
import type { Locator } from "@playwright/test";
import { expect, journey, open } from "../scripts/lib.ts";

/** Types into a slider's value pill the way a user does: focus, select all, type, leave. */
const typeInPill = async (pill: Locator, text: string) => {
  await pill.click();
  await pill.press("ControlOrMeta+a");
  await pill.pressSequentially(text);
  await pill.blur();
};

await journey("mortgage-estimates", async ({ page, step, save }) => {
  const panel = () => page.getByRole("tabpanel", { name: "From income" });
  const result = () => page.getByTestId("income-multiple-result");
  const stampDuty = () => page.locator("#stamp-duty-panel");

  await step("open Mortgage estimates", async () => {
    await open(page, "/app/mortgage-estimates");
    await expect(page.getByRole("heading", { level: 1, name: "Mortgage estimates" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Model a mortgage" })).toBeVisible();
  });

  await step("choose the From income tool", async () => {
    await page.getByRole("tab", { name: "From income" }).click();
    await expect(panel()).toBeVisible();
  });

  await step("set income to £50,000 at 4 times", async () => {
    const income = panel().getByRole("textbox", { name: "Yearly income before tax input" });
    await typeInPill(income, "50000");
    const low = panel().getByRole("textbox", { name: "Lower multiple of yearly income" });
    await low.fill("4");
    await low.blur();
    const high = panel().getByRole("textbox", { name: "Upper multiple of yearly income" });
    await high.fill("4");
    await high.blur();
    await expect(result()).toContainText("~£200,000");
  });

  await step("add a £50,000 deposit: price £250,000 before stamp duty", async () => {
    await panel().getByRole("button", { name: "Deposit and buying costs" }).click();
    const deposit = panel().getByRole("textbox", { name: "Deposit" });
    await deposit.fill("50000");
    await deposit.blur();
    await expect(result()).toContainText("With a £50,000 deposit");
    await expect(result()).toContainText("Property price ~£250,000 to ~£250,000");
    await expect(result()).toContainText("loan to value 80% to 80%");
  });

  await step("open the stamp duty estimate and choose England", async () => {
    await page.getByRole("button", { name: "Stamp duty estimate" }).click();
    await expect(stampDuty()).toContainText(
      "Worked out on the property price in your estimate above",
    );
    await stampDuty()
      .getByRole("group", { name: "Where is the property?" })
      .getByRole("radio", { name: "England or Northern Ireland" })
      .check();
    await expect(page.getByTestId("stamp-duty-empty")).toContainText(
      "Answer the first-time buyer question",
    );
    // No tax answers yet, so the price is still the untaxed one.
    await expect(result()).toContainText("Property price ~£250,000 to ~£250,000");
  });

  await step("not first-time buyers: £2,450 comes off the deposit", async () => {
    await stampDuty()
      .getByRole("group", { name: /Are all the buyers first-time buyers/ })
      .getByRole("radio", { name: "No" })
      .check();
    await expect(page.getByTestId("stamp-duty-result")).toContainText(
      "Estimated stamp duty: ~£2,450",
    );
    await expect(result()).toContainText("Property price ~£248,000 to ~£248,000");
    await expect(result()).toContainText("loan to value 81% to 81%");
    save("not-first-time.txt", (await result().textContent()) ?? "");
  });

  await step("first-time buyers: no stamp duty, price back to £250,000", async () => {
    await stampDuty()
      .getByRole("group", { name: /Are all the buyers first-time buyers/ })
      .getByRole("radio", { name: "Yes" })
      .check();
    await expect(page.getByTestId("stamp-duty-result")).toContainText("Estimated stamp duty: ~£0");
    await expect(result()).toContainText("Property price ~£250,000 to ~£250,000");
    await expect(result()).toContainText("loan to value 80% to 80%");
    save("first-time.txt", (await result().textContent()) ?? "");
  });

  await step("reload: the scenario is not stored", async () => {
    await page.reload();
    await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
    await page.getByRole("tab", { name: "From income" }).click();
    // The income goes back to the saved salary and the deposit is empty again.
    await expect(
      panel().getByRole("textbox", { name: "Yearly income before tax input" }),
    ).toHaveValue("£58,000");
    await expect(result()).not.toContainText("Property price");
  });
});
