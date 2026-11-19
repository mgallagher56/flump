import type { Locator, Page } from "@playwright/test";

/**
 * A call through the same-origin `/api` proxy from the signed-in page, as the web app makes it
 * from the browser (the proxy is a strict allow-list of those calls). Shared by the link tests.
 */
export const pageApi = <T = unknown>(page: Page, path: string, method = "GET", body?: unknown) =>
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
  ) as Promise<T>;

export interface LinkAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  accountSubtype?: string | null;
  linkedAccountId?: string | null;
  ownership?: string;
  sharePercent?: number | null;
  details?: Array<{ year: number; month: number; value: number; source: string }>;
}

/** The user's accounts with their history, through the proxy. */
export const listAccounts = (page: Page) => pageApi<LinkAccount[]>(page, "/accounts");

/** A "YYYY-MM" month as the History page names it ("November 2026"). */
export const monthLabel = (month: string): string => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year ?? 0, (monthNumber ?? 1) - 1, 1)));
};

/**
 * One account's row on the Accounts page, found by its name link. Opens every long group first
 * ("Show all"), so a row past the first eight is found too.
 */
export async function accountsPageRow(page: Page, name: string): Promise<Locator> {
  await page.goto("/app/accounts");
  const showAll = page.getByRole("button", { name: /^Show all \d/ });
  while ((await showAll.count()) > 0) await showAll.first().click();
  return page.getByRole("listitem").filter({ has: page.getByRole("link", { name, exact: true }) });
}
