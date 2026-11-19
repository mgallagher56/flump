import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { backendCall } from "../../support/backend";
import { accountsPageRow, listAccounts, pageApi } from "../../support/links-api";

test.use({ storageState: AUTH_STATE });

// L18 as decision 14 option B restates it: a property and its mortgage are linked; the
// mortgage's share is copied to the property when the pair is set up, and either may then differ
// (unequal owners with a joint mortgage). Before slice 4 there was no link, and a mortgage's share
// overwrote its property's.
test("L18 a linked property takes its mortgage's share once, then keeps its own", async ({
  page,
}) => {
  await page.goto("/app");
  const pair = await backendCall<{ mortgage: { id: string }; property: { id: string } }>(
    "/accounts/mortgage-with-property",
    "POST",
    {
      mortgage: { name: "L18 mortgage", balance: 100000, ownership: "joint", sharePercent: 40 },
      property: { name: "L18 home", balance: 200000 },
    },
  );
  try {
    let accounts = await listAccounts(page);
    const property = () => accounts.find((a) => a.id === pair.property.id);
    const mortgage = () => accounts.find((a) => a.id === pair.mortgage.id);
    expect(mortgage()?.linkedAccountId).toBe(pair.property.id);
    expect(property()).toMatchObject({ ownership: "joint", sharePercent: 40 });
    // The Accounts page shows each one's share on its row.
    await expect(await accountsPageRow(page, "L18 home")).toContainText("Joint, 40%");
    await expect(await accountsPageRow(page, "L18 mortgage")).toContainText("Joint, 40%");

    await pageApi(page, `/accounts/${pair.mortgage.id}`, "PATCH", { sharePercent: 50 });
    accounts = await listAccounts(page);
    expect(mortgage()?.sharePercent).toBe(50);
    expect(property()?.sharePercent).toBe(40);
    // Changing the mortgage's share leaves the property's as it was, on the page too.
    await expect(await accountsPageRow(page, "L18 mortgage")).toContainText("Joint, 50%");
    await expect(await accountsPageRow(page, "L18 home")).toContainText("Joint, 40%");
  } finally {
    await backendCall(`/accounts/${pair.mortgage.id}`, "DELETE");
    await backendCall(`/accounts/${pair.property.id}`, "DELETE");
  }
});
