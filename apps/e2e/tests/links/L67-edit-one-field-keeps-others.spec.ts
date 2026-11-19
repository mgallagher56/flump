import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { applyPersona } from "../../support/personas";

test.use({ storageState: AUTH_STATE });

type Account = {
  id: string;
  name: string;
  balance: number | string;
  interestRate?: number | string | null;
  ownership?: string;
  sharePercent?: number | null;
};

const api = (page: Page, path: string, method = "GET", body?: unknown) =>
  page.evaluate(
    async ({ path, method, body }) => {
      const response = await fetch(`/api${path}`, {
        method,
        headers: { "Content-Type": "application/json", "x-flump-request": "1" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`${method} ${path} ${response.status}`);
      return (await response.json()) as unknown;
    },
    { path, method, body },
  );

const findEasy = async (page: Page) => {
  const accounts = (await api(page, "/accounts")) as Account[];
  const easy = accounts.find((a) => a.name === "Easy access savings");
  if (!easy) throw new Error("homeowner persona has no Easy access savings account");
  return easy;
};

// L67 (SD-1, JO-1): editing only the rate of a joint savings account on Savings leaves its
// balance alone. The edit form holds the whole balance (7,600), never the 40% share (3,040).
test("L67 a rate-only edit of a joint savings account keeps its balance", async ({ page }) => {
  await page.goto("/app");
  await applyPersona(page, "homeowner");

  const easy = await findEasy(page);
  const before = {
    ownership: easy.ownership ?? "sole",
    sharePercent: easy.sharePercent ?? null,
    interestRate:
      easy.interestRate === null || easy.interestRate === undefined
        ? null
        : Number(easy.interestRate),
  };
  const whole = Number(easy.balance);
  // 7,600 x 40% = 3,040, shown in whole pounds.
  const share = `£${Math.round(whole * 0.4).toLocaleString("en-GB")}`;

  try {
    await api(page, `/accounts/${easy.id}`, "PATCH", { ownership: "joint", sharePercent: 40 });

    await page.goto("/app/savings");
    const row = page.locator("[data-list-row]").filter({ hasText: "Easy access savings" });
    await expect(row).toContainText(share);

    await page.getByRole("button", { name: "Edit Easy access savings" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit savings account" });
    await expect(dialog.getByLabel("Current balance")).toHaveValue(
      new RegExp(whole.toLocaleString("en-GB")),
    );
    await expect(dialog).toContainText("This is the whole balance. Your share is 40% of it.");
    await dialog.getByLabel("Interest rate (AER)").fill("4.1");
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect(dialog).toBeHidden();

    await expect(row).toContainText(share);
    expect(Number((await findEasy(page)).balance)).toBe(whole);
  } finally {
    await api(page, `/accounts/${easy.id}`, "PATCH", before);
  }
});
