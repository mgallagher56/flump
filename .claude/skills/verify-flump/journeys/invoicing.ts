/**
 * invoicing: on /app/invoicing log billable work, build a draft invoice from it, issue it, mark
 * it paid, and see each status, then reload and see the paid invoice and its billed entry again.
 * Last, check the dates the page fills in are today's.
 * Expects the selfemployed persona (no work log or invoices yet); any persona works.
 * Run: verify-flump seed selfemployed <run-id>, then verify-flump drive invoicing <run-id>
 * Work logs and invoices are not on the /api allow-list, so the saved state is proved by a reload.
 */
import { expect, journey, open } from "../scripts/lib.ts";

const SUFFIX = Date.now().toString(36);
const WORK = `Verify design review ${SUFFIX}`;
const CLIENT = `Verify Client ${SUFFIX}`;
// 3 hours at £65 an hour = £195, with no VAT.
const HOURS = "3";
const RATE = "65";
const TOTAL = "£195";
// The browser's local date, as the date fields show it (yyyy-mm-dd).
// The app fills dates on the London clock, so compare with London, not this machine's zone.
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

await journey("invoicing", async ({ page, step, save }) => {
  const invoicesTab = () => page.getByRole("tab", { name: /^Invoices \(\d+\)$/ });
  const card = page.getByRole("article").filter({ hasText: CLIENT });

  await step("open Work log and invoicing", async () => {
    await open(page, "/app/invoicing");
    await expect(
      page.getByRole("heading", { level: 1, name: "Work log and invoicing" }),
    ).toBeVisible();
  });

  await step("log 3 hours of billable work at £65", async () => {
    const panel = page.getByRole("tabpanel", { name: "Work log" });
    await panel.getByRole("textbox", { name: "Work description" }).fill(WORK);
    await panel.getByRole("textbox", { name: "Client name (optional)" }).fill(CLIENT);
    await panel.getByRole("textbox", { name: "Hours worked" }).fill(HOURS);
    await panel.getByRole("textbox", { name: "Hourly rate (£)" }).fill(RATE);
    await panel.getByRole("button", { name: "Add work entry" }).click();
    const entries = page.getByRole("region", { name: "Recorded work log entries" });
    await expect(entries).toContainText(WORK);
    await expect(entries).toContainText(TOTAL);
  });

  await step("select the entry and create a draft invoice", async () => {
    await page.getByRole("checkbox", { name: `Select ${WORK} for draft invoice` }).check();
    await page.getByRole("textbox", { name: "Client name", exact: true }).fill(CLIENT);
    await page.getByRole("button", { name: "Create draft invoice from selected" }).click();
    await expect(
      page.getByRole("checkbox", { name: `Select ${WORK} for draft invoice` }),
    ).toHaveCount(0);
  });

  await step("the invoice is a draft for £195", async () => {
    await invoicesTab().click();
    await expect(card).toContainText("Draft");
    await expect(card).toContainText(TOTAL);
  });

  await step("issue the invoice", async () => {
    await card.getByRole("button", { name: "Issue invoice" }).click();
    await expect(card.getByRole("button", { name: "Mark as paid" })).toBeVisible();
    await expect(card).toContainText("Issued");
  });

  await step("mark the invoice paid", async () => {
    await card.getByRole("button", { name: "Mark as paid" }).click();
    await expect(card.getByRole("button", { name: "Add to Self Assessment" })).toBeVisible();
    await expect(card).toContainText("Paid");
    save("paid-card.txt", (await card.textContent()) ?? "");
  });

  await step("reload: the invoice is still paid and the entry billed", async () => {
    await page.reload();
    await expect(page.getByRole("region", { name: "Recorded work log entries" })).toContainText(
      "Billed",
    );
    await invoicesTab().click();
    await expect(card).toContainText("Paid");
    await expect(card).toContainText(TOTAL);
    await expect(card.getByRole("button", { name: "Issue invoice" })).toHaveCount(0);
    await expect(card.getByRole("button", { name: "Mark as paid" })).toHaveCount(0);
  });

  await step("the issue and paid dates are today's", async () => {
    const text = (await card.textContent()) ?? "";
    save("dates.json", { today, card: text });
    expect(text, "paid date").toContain(`Paid ${today}`);
    expect(text, "issue date").toContain(`Issued ${today}`);
  });
});
