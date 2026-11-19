import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { linkSpecHeaders } from "../../support/client-address";
import { applyPersona } from "../../support/personas";

// Its own client address, so the per-address ceiling counts this file alone (client-address.ts).
test.use({ storageState: AUTH_STATE, extraHTTPHeaders: linkSpecHeaders(import.meta.filename) });

type Account = { id: string; name: string; ownership?: string; sharePercent?: number | null };

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

// L42 (SD-2, JO-3): the Dashboard savings card and the Savings page count a joint account at the
// user's share, so they show the same total.
test("L42 Dashboard savings card equals the Savings total with a joint account", async ({
  page,
}) => {
  await page.goto("/app");
  await applyPersona(page, "homeowner");

  const accounts = (await api(page, "/accounts")) as Account[];
  const easy = accounts.find((a) => a.name === "Easy access savings");
  if (!easy) throw new Error("homeowner persona has no Easy access savings account");
  const before = { ownership: easy.ownership ?? "sole", sharePercent: easy.sharePercent ?? null };

  try {
    await api(page, `/accounts/${easy.id}`, "PATCH", { ownership: "joint", sharePercent: 40 });

    await page.goto("/app/savings");
    const hero = page.getByTestId("hero-figure");
    await expect(hero).toContainText("Total savings");
    const savingsTotal = (await hero.innerText()).match(/£[\d,]+/)?.[0];
    if (!savingsTotal) throw new Error("Savings hero shows no total");

    await page.goto("/app");
    const card = page.getByTestId("widget-card-savings");
    await expect(card).toContainText(savingsTotal);
  } finally {
    await api(page, `/accounts/${easy.id}`, "PATCH", before);
  }
});
