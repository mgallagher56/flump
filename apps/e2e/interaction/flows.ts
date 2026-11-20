import { expect, type Page } from "@playwright/test";
import { waitForHydration } from "../support/page";
import { applyPersona, clearToNewUser } from "../support/personas";
import type { Actor } from "./actor";

/**
 * The seven core flows of the E38 plan (section 3.2), each written once against the Actor so the
 * mouse, touch and keyboard-only runs do the same task. `prepare` runs before counting starts;
 * `run` is the counted task and ends by checking the task really happened (checks send no input).
 *
 * The flows share the single dev user and run in this order in each mode. Deletes and resets
 * share a limit of 10 an hour per user, so the flows do not clean up after themselves: the first
 * flow of each mode re-seeds the homeowner (one reset), the account flow deletes the account it
 * added (one delete, part of the task), and onboarding clears the user (one reset). From an empty
 * database that is 8 of the 10: 2 in the first mode (global setup has just seeded it), 3 in each
 * of the others. Against a database that already holds data, global setup's own reset makes 9,
 * so a second run within the hour is refused (README "Interaction cost").
 *
 * Modes after the first start from a reset of an onboarded user, which keeps the profile's
 * non-financial fields (name, tax region); the seeded persona sets the ones the flows read.
 */
export interface Flow {
  id: string;
  title: string;
  /** Where the person starts the task. */
  start: string;
  prepare?: (page: Page) => Promise<void>;
  run: (actor: Actor) => Promise<void>;
}

const CHECK_IN_LINK = /^Start monthly check-in$/;

/**
 * The homeowner as seeded, with this month's check-in still due. `applyPersona` re-seeds when the
 * accounts, budget or salary differ; a recorded check-in is not one of those, so check for it.
 */
async function freshHomeowner(page: Page): Promise<void> {
  const seeded = await applyPersona(page, "homeowner");
  await page.goto("/");
  const due = page.locator("#monthly-check-in-card").getByRole("link", { name: CHECK_IN_LINK });
  if ((await due.count()) === 0) {
    await clearToNewUser(page);
    await applyPersona(page, "homeowner");
  } else if (seeded.unchanged) {
    return;
  }
  // Seeding is about 30 writes, and the backend allows 120 a minute per user. Let that minute
  // pass, so a save inside a counted flow is never refused (a refusal adds a "Try again").
  await page.waitForTimeout(WRITE_WINDOW_MS);
}

/** One minute of the backend's per-user write limit, and a second to spare. */
const WRITE_WINDOW_MS = 61_000;

/** Opens a page from the app navigation: the phone's More pages drawer, or a desktop group menu. */
async function openFromNav(actor: Actor, group: string, link: string): Promise<void> {
  const { page } = actor;
  if (actor.mode === "phone-touch") {
    await actor.press(
      page.locator('nav[aria-label="Main navigation"]').getByRole("button", { name: "More pages" }),
    );
    await actor.press(
      page.getByTestId("mobile-nav-drawer").getByRole("link", { name: link, exact: true }),
    );
    return;
  }
  const nav = page.getByRole("navigation", { name: "Primary" });
  await actor.press(nav.getByRole("button", { name: group }));
  // The group menu's links carry a description after the page name.
  await actor.press(nav.getByRole("link", { name: new RegExp(`^${link}\\b`) }));
}

export const FLOWS: Flow[] = [
  {
    id: "1-budget",
    title: "1. Create and edit a budget",
    start: "/app/budget",
    prepare: freshHomeowner,
    async run(actor) {
      const { page } = actor;
      await actor.press(page.getByRole("button", { name: "Edit budget" }));
      const moneyIn = page.getByRole("region", { name: "Money in" });
      // The add row opens with the focus on its name field, and Enter in the row adds the entry.
      await actor.press(moneyIn.getByRole("button", { name: "Add income" }));
      await actor.typeFocused(
        moneyIn.getByRole("textbox", { name: /^New entry name in/ }),
        "Side work",
      );
      await actor.type(moneyIn.getByRole("textbox", { name: /^New entry amount in/ }), "200");
      await actor.key("Enter");
      await expect(moneyIn.getByLabel("Amount for Side work")).toBeVisible();

      const expenses = page.getByRole("region", { name: "Expenses" });
      await actor.press(expenses.getByRole("button", { name: "Add to expenses" }));
      await actor.typeFocused(expenses.getByRole("textbox", { name: /^New entry name in/ }), "Gym");
      await actor.type(expenses.getByRole("textbox", { name: /^New entry amount in/ }), "35");
      await actor.key("Enter");
      const essential = expenses.getByRole("switch", { name: "Essential: Gym" });
      const wasEssential = await essential.isChecked();
      await actor.press(essential);
      await expect(essential).toBeChecked({ checked: !wasEssential });

      const housing = page.getByRole("region", { name: "Housing" });
      await actor.type(
        housing.getByRole("textbox", { name: "Amount for Mortgage payment" }),
        "1300",
      );
      await actor.press(page.getByRole("button", { name: "Finish editing" }).first());
      await expect(page.getByRole("button", { name: "Edit budget" })).toBeVisible();
      // £3,450 salary + £200 side work.
      await expect(page.getByRole("main")).toContainText(/Money in each month\s*£3,650/);
    },
  },
  {
    id: "2-check-in",
    title: "2. Complete a monthly check-in",
    start: "/",
    async run(actor) {
      const { page } = actor;
      await actor.press(
        page.locator("#monthly-check-in-card").getByRole("link", { name: CHECK_IN_LINK }),
      );
      const sheet = page.getByRole("dialog", { name: "Monthly check-in" });
      await expect(sheet).toBeVisible();
      const current = sheet.getByRole("textbox", {
        name: "New balance in pounds, Current account",
      });
      await actor.type(current, "3450");
      await actor.key("Enter");
      // From md the sheet is one list and the row folds up; on a phone it moves to the next step.
      await expect(current).toBeHidden();
      // Every other balance is unchanged this month.
      const same = sheet.getByRole("button", { name: "No change", exact: true });
      const done = sheet.getByRole("button", { name: "Done", exact: true });
      for (let row = 0; row < 20; row++) {
        await expect(same.first().or(done)).toBeVisible();
        if (await done.isVisible()) break;
        const pressed = await same.first().elementHandle();
        await actor.press(same.first());
        await pressed?.waitForElementState("hidden");
      }
      await actor.press(done);
      await expect(sheet).toBeHidden();
    },
  },
  {
    id: "3-accounts",
    title: "3. Add, edit, update the balance of and remove an account",
    start: "/app/accounts",
    async run(actor) {
      const { page } = actor;
      await actor.press(
        page.getByRole("main").getByRole("link", { name: "Add account", exact: true }),
      );
      const add = page.getByRole("dialog", { name: "Add account" });
      await actor.type(add.getByRole("textbox", { name: "Name" }), "Holiday fund");
      await actor.choose(add.getByRole("combobox", { name: "Account type" }), "Savings");
      await actor.type(add.getByRole("textbox", { name: "Balance" }), "500");
      await actor.press(add.getByRole("button", { name: "Add account", exact: true }));
      await expect(add).toBeHidden();

      await actor.press(page.getByRole("link", { name: "Holiday fund", exact: true }));
      await expect(page.getByRole("heading", { level: 1, name: "Holiday fund" })).toBeVisible();
      const edit = page.getByRole("dialog", { name: "Edit account" });
      await actor.press(page.getByRole("button", { name: "Edit", exact: true }));
      await actor.type(edit.getByRole("textbox", { name: "Name" }), "Holiday savings");
      await actor.press(edit.getByRole("button", { name: "Save", exact: true }));
      await expect(page.getByRole("heading", { level: 1, name: "Holiday savings" })).toBeVisible();

      // The balance is updated in place under the figure (E38 S2): the field opens with the focus
      // and the saved figure selected, and Enter saves.
      await actor.press(page.getByRole("button", { name: "Update balance" }));
      await actor.typeFocused(page.getByRole("textbox", { name: "New balance" }), "750");
      await actor.key("Enter");
      await expect(page.getByRole("group", { name: "Current balance" })).toContainText("£750");

      await actor.press(page.getByRole("button", { name: "Edit", exact: true }));
      await actor.press(edit.getByRole("button", { name: "Delete", exact: true }));
      await actor.press(page.getByRole("button", { name: "Delete Holiday savings", exact: true }));
      await expect(page).toHaveURL(/\/app\/accounts$/);
      await expect(page.getByRole("link", { name: "Holiday savings", exact: true })).toHaveCount(0);
    },
  },
  {
    id: "4-debt",
    title: "4. Add and edit a debt and model paying it off",
    start: "/app/debt",
    async run(actor) {
      const { page } = actor;
      await actor.press(page.getByRole("button", { name: "Add a debt" }));
      const add = page.getByRole("dialog", { name: "Add a debt" });
      await actor.type(add.getByRole("textbox", { name: "Name of the debt" }), "Store card");
      await actor.type(add.getByRole("textbox", { name: "Balance you owe" }), "600");
      await actor.press(add.getByRole("button", { name: "Add debt", exact: true }));
      await expect(add).toBeHidden();

      await actor.press(page.getByRole("button", { name: "Edit Store card" }));
      const edit = page.getByRole("dialog", { name: "Edit debt" });
      await actor.type(edit.getByRole("textbox", { name: /^Minimum payment each month/ }), "25");
      await actor.press(edit.getByRole("button", { name: /^Save/ }));
      await expect(edit).toBeHidden();

      // The scenario zone starts closed below the saved figures.
      await actor.press(page.getByRole("button", { name: "Show what-if: pay more each month" }));
      await actor.type(page.getByRole("textbox", { name: "Extra payment each month input" }), "50");
      await actor.key("Enter");
      await expect(page.getByRole("slider", { name: "Extra payment each month" })).toHaveValue(
        "50",
      );
    },
  },
  {
    id: "5-self-assessment",
    title: "5. Add and edit Self Assessment income and cost records",
    start: "/app/self-assessment",
    // The page's one-time opt-in saves the profile; it is set up, not part of the task.
    async prepare(page) {
      await page.goto("/app/self-assessment");
      await waitForHydration(page);
      const optIn = page.getByRole("button", { name: "Turn on Self Assessment" });
      if ((await optIn.count()) === 0) return;
      await optIn.click();
      await expect(page.getByRole("combobox", { name: "Tax year" })).toBeVisible();
    },
    async run(actor) {
      const { page } = actor;
      const record = page.getByRole("dialog", { name: "Add a record" });
      await actor.press(page.getByRole("button", { name: "Add income" }).first());
      await actor.press(page.getByRole("menuitem", { name: "Self-employed income" }));
      await actor.type(record.getByRole("textbox", { name: "Name" }), "Design work");
      await actor.type(record.getByRole("textbox", { name: "Amount" }), "800");
      // The dialog stays open for the next record, on the same source, with the focus on Name
      // (E38 S2); the second record is an expense, so its type changes.
      await actor.press(record.getByRole("button", { name: "Add and start another" }));
      await expect(record.getByRole("status")).toHaveText(
        "Design work added. Add the next record.",
      );
      await actor.typeFocused(record.getByRole("textbox", { name: "Name" }), "Software");
      await actor.type(record.getByRole("textbox", { name: "Amount" }), "30");
      await actor.choose(record.getByRole("combobox", { name: "Type" }), "Expense");
      await actor.press(record.getByRole("button", { name: "Add record" }));
      await expect(record).toBeHidden();

      // The records table is behind a disclosure, grouped by income source (UX Batch E).
      await actor.press(page.getByRole("button", { name: "Records", exact: true }));
      const table = page.getByRole("table", { name: /^Self-employed records for / });
      await actor.press(table.getByRole("button", { name: "Design work", exact: true }));
      const edit = page.getByRole("dialog", { name: "Edit record" });
      await actor.type(edit.getByRole("textbox", { name: "Amount" }), "900");
      await actor.press(edit.getByRole("button", { name: "Save changes" }));
      await expect(edit).toBeHidden();
      await expect(table.getByRole("row").filter({ hasText: "Design work" })).toContainText("£900");
      await expect(table.getByRole("row").filter({ hasText: "Software" })).toContainText("£30");
    },
  },
  {
    id: "6-profile-scenarios",
    title: "6. Update salary and pension, then model pension and mortgage changes",
    start: "/app/profile",
    async run(actor) {
      const { page } = actor;
      await actor.press(page.getByRole("link", { name: "Your pension" }));
      await expect(page.getByRole("heading", { level: 1, name: "Your pension" })).toBeVisible();
      await actor.press(page.getByRole("button", { name: "Salary and contributions" }));
      await actor.press(page.getByRole("button", { name: "Edit salary and contributions" }));
      await actor.type(page.getByRole("textbox", { name: "Yearly salary before tax" }), "60000");
      await actor.type(page.getByRole("textbox", { name: "Your contribution (% of salary)" }), "9");
      await actor.press(page.getByRole("button", { name: "Save details" }));
      await expect(page.getByText("£60,000 a year")).toBeVisible();

      // The scenario zone starts closed below the saved figures.
      await actor.press(
        page.getByRole("button", { name: "Show what-if: change your contribution" }),
      );
      await actor.type(page.getByRole("textbox", { name: "Your contribution input" }), "10");
      await actor.key("Enter");
      await expect(page.getByRole("slider", { name: "Your contribution" })).toHaveValue("10");

      await openFromNav(actor, "Debt and borrowing", "Mortgage");
      await expect(page.getByRole("heading", { level: 1, name: "Your mortgage" })).toBeVisible();
      await actor.press(page.getByRole("button", { name: "Show what-if: overpay or a new rate" }));
      await actor.type(page.getByRole("textbox", { name: "Extra each month input" }), "200");
      await actor.key("Enter");
      await expect(page.getByRole("slider", { name: "Extra each month" })).toHaveValue("200");
    },
  },
  {
    id: "7-onboarding",
    title: "7. New-user setup to the first dashboard figure",
    start: "/app/onboarding",
    // A brand-new user: the suite has one, so this clears it (one reset) and runs last.
    async prepare(page) {
      await clearToNewUser(page);
    },
    async run(actor) {
      const { page } = actor;
      const income = page.getByRole("region", { name: "You and income" });
      await actor.type(income.getByRole("textbox", { name: "Your age" }), "31");
      await actor.press(income.getByRole("radio", { name: /^Employed/ }));
      await actor.type(income.getByRole("textbox", { name: /^Yearly salary before tax/ }), "36000");
      await actor.choose(
        income.getByRole("combobox", { name: /^Where do you pay tax/ }),
        "England",
      );
      await actor.press(income.getByRole("button", { name: "Next", exact: true }));
      const housing = page.getByRole("region", { name: "Housing and spending" });
      await actor.press(housing.getByRole("button", { name: "Skip this step" }));
      const savings = page.getByRole("region", { name: "Savings and debt" });
      await actor.press(savings.getByRole("button", { name: "Skip this step" }));
      await actor.press(page.getByRole("button", { name: "Finish and open dashboard" }));
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("heading", { level: 1, name: "Your money" })).toBeVisible();
      // The first calculated figure: the take-home estimate setup saved as the budget's income.
      await expect(page.getByRole("main")).toContainText(/Income in your budget\s*£[\d,]+/);
    },
  },
];
