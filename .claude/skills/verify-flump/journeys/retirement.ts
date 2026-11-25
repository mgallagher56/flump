/**
 * retirement: save a retirement plan on /app/retirement, see the estimate after income tax, check
 * that the year-by-year after-tax figures sit below the before-tax ones where tax is due, drive
 * the "Lump sum at retirement" what-if and check its 25% tax-free lump sum by hand, then change
 * the saved plan and see the change survive a reload.
 * Expects the retiree persona (no saved plan, tax region Northern Ireland, three pensions:
 * £142,000 + £63,000 + £37,000 = £242,000).
 * Run: verify-flump seed retiree <run-id>, then verify-flump drive retirement <run-id>
 * The retirement plan is not on the /api allow-list, so the saved plan is proved by reloading the
 * page and reading the saved fields back.
 */
import { expect, journey, open } from "../scripts/lib.ts";

const money = (text: string) =>
  Number(/£([\d,]+)/.exec(text)?.[1]?.replaceAll(",", "") ?? Number.NaN);

// Hand-worked lump sum: with the what-if retirement age at today's age there are no years of
// growth or contributions, so the pensions at retirement are today's balances:
// 142,000 + 63,000 + 37,000 = 242,000. The tax-free lump sum is 25% of that, 60,500, below the
// lump sum allowance (268,275), so 60,500. Estimates show to three significant figures: ~£60,500.
const LUMP_SUM = "~£60,500";

await journey("retirement", async ({ page, step, save }) => {
  const details = page.locator("#retirement-plan-details");
  const savedNote = details.getByText("Retirement plan saved.");

  await step("open Retirement: no saved plan yet", async () => {
    await open(page, "/app/retirement");
    await expect(page.getByRole("heading", { level: 1, name: "Retirement plan" })).toBeVisible();
    await expect(page.getByText("Estimates in today's prices, after income tax.")).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Estimated yearly income in retirement" }),
    ).toContainText("Not set");
  });

  await step("fill the plan details and save", async () => {
    await details.getByRole("textbox", { name: "Retirement age" }).fill("66");
    await details.getByRole("textbox", { name: "Plan to age" }).fill("90");
    await details.getByRole("textbox", { name: "State Pension age" }).fill("67");
    await details
      .getByRole("textbox", { name: "State Pension forecast (pounds a year)" })
      .fill("12000");
    await details.getByRole("button", { name: "Save plan" }).click();
    await expect(savedNote).toBeVisible();
  });

  await step("the estimate shows after income tax", async () => {
    const hero = page.getByRole("group", { name: /^Estimated yearly income from age 66/ });
    await expect(hero).toContainText(/~£[\d,]+/);
    save("hero.txt", (await hero.textContent()) ?? "");
  });

  await step("year by year: after tax is below before tax where tax is due", async () => {
    await page.getByRole("button", { name: "Show what-if: change your plan" }).click();
    await page.getByRole("button", { name: /^Assumptions, pots and year by year/ }).click();
    const table = page
      .getByRole("table")
      .filter({ has: page.getByRole("columnheader", { name: /After tax/ }) });
    await expect(table).toBeVisible();
    const headers = (await table.getByRole("columnheader").allTextContents()).map((h) => h.trim());
    const col = (name: string) => headers.findIndex((h) => h.startsWith(name));
    const [age, before, tax, after] = [
      col("Age"),
      col("Before tax"),
      col("Income tax"),
      col("After tax"),
    ];
    expect(Math.min(age, before, tax, after)).toBeGreaterThanOrEqual(0);
    const rows = await table
      .locator("tbody tr")
      .evaluateAll((trs) =>
        trs.map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => td.textContent ?? "")),
      );
    const parsed = rows.map((cells) => ({
      age: Number(cells[age]),
      before: money(cells[before] ?? ""),
      tax: money(cells[tax] ?? ""),
      after: money(cells[after] ?? ""),
    }));
    save("year-by-year.json", parsed);
    const taxed = parsed.filter((r) => r.tax > 0);
    expect(taxed.length, "years with income tax due").toBeGreaterThan(0);
    for (const r of taxed) expect(r.after, `age ${r.age}`).toBeLessThan(r.before);
  });

  await step("what-if: take a lump sum at retirement from today's age", async () => {
    const zone = page.locator("#retirement-scenario-outcome");
    await page.getByRole("button", { name: "Lump sum at retirement" }).click();
    await expect(page.getByRole("button", { name: "Lump sum at retirement" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const slider = page.getByRole("slider", { name: "Retirement age", exact: true });
    await slider.focus();
    await slider.press("Home");
    const min = await slider.getAttribute("min");
    await expect(slider).toHaveValue(min ?? "");
    await expect(zone).toContainText(`Tax-free lump sum at age ${min}: ${LUMP_SUM}.`);
    await expect(
      page.getByText(/This illustration takes a tax-free lump sum at retirement: 25% of your/),
    ).toBeVisible();
    save("lump-sum.txt", (await zone.textContent()) ?? "");
  });

  await step(
    "what-if leaves the saved plan alone: change the saved retirement age to 65",
    async () => {
      await page.getByRole("button", { name: "Reset to saved figures" }).click();
      await details.getByRole("textbox", { name: "Retirement age" }).fill("65");
      await details.getByRole("button", { name: "Save plan" }).click();
      await expect(savedNote).toBeVisible();
      await expect(
        page.getByRole("group", { name: /^Estimated yearly income from age 65/ }),
      ).toBeVisible();
    },
  );

  await step("reload: the saved plan is still there", async () => {
    await page.reload();
    await expect(details.getByRole("textbox", { name: "Retirement age" })).toHaveValue("65");
    await expect(details.getByRole("textbox", { name: "Plan to age" })).toHaveValue("90");
    await expect(details.getByRole("textbox", { name: "State Pension age" })).toHaveValue("67");
    await expect(
      details.getByRole("textbox", { name: "State Pension forecast (pounds a year)" }),
    ).toHaveValue(/12,?000/);
    await expect(
      page.getByRole("group", { name: /^Estimated yearly income from age 65/ }),
    ).toContainText(/~£[\d,]+/);
  });
});
