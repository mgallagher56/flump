import { expect, test } from "@playwright/test";
import { openAddAccount, saveAddAccount } from "../../support/add-account-dialog";
import { AUTH_STATE } from "../../support/auth";
import { backendCall } from "../../support/backend";
import { listAccounts } from "../../support/links-api";
import { applyPersona } from "../../support/personas";

test.use({ storageState: AUTH_STATE });

interface MortgageRow {
  id: string;
  name: string;
  interestRate: number | null;
  monthlyContribution: number | null;
  termMonths: number | null;
  repaymentType?: string | null;
}

// L08 (SD-8, one account form): a mortgage added on Accounts saves the same rate, payment, term
// and repayment type the Mortgage page reads from it. Before slice 4 the Accounts dialog had no
// rate, payment or term, so the Mortgage page asked for them again.
test("L08 a mortgage added on Accounts carries its rate, payment and term", async ({ page }) => {
  await page.goto("/app");
  await applyPersona(page, "renter");
  const dialog = await openAddAccount(page);
  await dialog.getByLabel("Name").fill("L08 mortgage");
  await dialog.getByLabel("Account type").selectOption("Mortgage");
  await dialog.getByLabel("Amount owed").fill("120000");
  await dialog.getByLabel("Interest rate (optional)").fill("4.5");
  await dialog.getByLabel("Monthly payment (optional)").fill("700");
  await dialog.getByLabel("How it is repaid (optional)").selectOption("repayment");
  await dialog.getByLabel("Years left (optional)").fill("20");
  await saveAddAccount(dialog);

  const saved = (await listAccounts(page)).find((a) => a.name === "L08 mortgage") as
    | (MortgageRow & { balance: number })
    | undefined;
  if (!saved) throw new Error("the mortgage was not saved");
  try {
    expect(saved).toMatchObject({
      balance: -120000,
      interestRate: 4.5,
      monthlyContribution: 700,
      termMonths: 240,
      repaymentType: "repayment",
    });
    await page.goto("/app/mortgage");
    await expect(page.locator("#mortgage-saved")).toContainText("£120,000");
  } finally {
    await backendCall(`/accounts/${saved.id}`, "DELETE");
  }
});
