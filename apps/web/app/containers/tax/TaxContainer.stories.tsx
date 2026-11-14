import type { TaxRecord } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import TaxContainer from "./TaxContainer";

const record = (
  id: string,
  name: string,
  source: TaxRecord["source"],
  type: TaxRecord["type"],
  category: string,
  amount: number,
  frequency: TaxRecord["frequency"],
  date: string,
  extra: Partial<TaxRecord> = {},
): TaxRecord =>
  ({
    id,
    userId: "user-1",
    name,
    source,
    type,
    category,
    amount,
    frequency,
    date,
    endDate: null,
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    hasReceipt: false,
    createdAt: `${date}T00:00:00Z`,
    updatedAt: `${date}T00:00:00Z`,
    ...extra,
  }) as TaxRecord;

/** A landlord who also freelances, with enough records to paginate the records table. */
const records: TaxRecord[] = [
  record("r1", "Flat rent", "rental", "income", "rental_income", 1150, "monthly", "2026-04-06"),
  record(
    "r2",
    "Service charge",
    "rental",
    "expense",
    "services_costs",
    46,
    "monthly",
    "2026-04-06",
  ),
  record(
    "r3",
    "Mortgage interest",
    "rental",
    "expense",
    "mortgage_interest",
    545,
    "monthly",
    "2026-04-06",
  ),
  record(
    "r4",
    "Letting agent fees",
    "rental",
    "expense",
    "legal_management_fees",
    92,
    "monthly",
    "2026-04-06",
  ),
  record(
    "r5",
    "Boiler repair",
    "rental",
    "expense",
    "repairs_maintenance",
    380,
    "one-off",
    "2026-07-14",
    {
      hasReceipt: true,
      receiptFilename: "boiler-invoice.pdf",
      receiptMimeType: "application/pdf",
    } as Partial<TaxRecord>,
  ),
  record(
    "r6",
    "Landlord insurance",
    "rental",
    "expense",
    "rent_rates_insurance",
    240,
    "annual",
    "2026-05-01",
  ),
  record(
    "r7",
    "Design retainer",
    "self-employed",
    "income",
    "self_employed_income",
    1800,
    "monthly",
    "2026-04-30",
  ),
  record("r8", "Laptop", "self-employed", "expense", "office_costs", 1299, "one-off", "2026-06-02"),
  record(
    "r9",
    "Train to client",
    "self-employed",
    "expense",
    "travel_costs",
    64.5,
    "one-off",
    "2026-09-18",
  ),
  record(
    "r10",
    "Accountancy software",
    "self-employed",
    "expense",
    "legal_finance_fees",
    12,
    "monthly",
    "2026-04-06",
  ),
  record(
    "r11",
    "Easy-access saver interest",
    "savings",
    "income",
    "savings_interest",
    48,
    "monthly",
    "2026-04-30",
  ),
  record(
    "r12",
    "Index fund dividend",
    "savings",
    "income",
    "dividend_income",
    620,
    "annual",
    "2026-09-01",
  ),
  record("r13", "Flat rent", "rental", "income", "rental_income", 1100, "monthly", "2025-04-06", {
    endDate: "2026-04-05",
  } as Partial<TaxRecord>),
];

const loaderData = {
  records,
  userProfile: {
    annualSalary: 52000,
    propertyOwnershipShare: 50,
    country: "GB",
    enabledPages: ["accounts", "budget", "tax"],
    dashboardWidgets: ["accounts", "budget", "tax"],
    dashboardWidgetOrder: ["accounts", "budget", "tax"],
  },
  accounts: [],
};

/** A PAYE-only person who has not turned the section on. */
const optedOutLoaderData = {
  records: [],
  userProfile: {
    annualSalary: 52000,
    propertyOwnershipShare: 100,
    country: "GB",
    enabledPages: ["accounts", "budget", "savings", "pension"],
    dashboardWidgets: ["accounts", "budget"],
    dashboardWidgetOrder: ["accounts", "budget"],
  },
  accounts: [],
};

/** The Storybook preview renders every story side by side in light and dark. */
const meta = {
  title: "6. Pages/Tax",
  component: TaxContainer,
  parameters: { layout: "fullscreen", router: { loaderData } },
} satisfies Meta<typeof TaxContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opted in with records: hero, two KPIs, the one notice and the sources list. */
export const OptedInWithData: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect((await canvas.findAllByText(/^Income for /)).length).toBeGreaterThan(0);
    await expect((await canvas.findAllByText("Estimated bill")).length).toBeGreaterThan(0);
    await expect(
      (await canvas.findAllByRole("button", { name: "Add income" })).length,
    ).toBeGreaterThan(0);
  },
};

export const RecordsDrawer: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [drawer] = await canvas.findAllByRole("button", { name: /^All records/ });
    await userEvent.click(drawer);
    await expect((await canvas.findAllByRole("table")).length).toBeGreaterThan(0);
  },
};

/** Opted in, nothing added yet: one prompt to add income, no figures. */
export const OptedInEmpty: Story = {
  parameters: { router: { loaderData: { ...loaderData, records: [] } } },
};

/** Not opted in: one empty state with one button. */
export const OptedOut: Story = {
  parameters: { router: { loaderData: optedOutLoaderData } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      (await canvas.findAllByRole("button", { name: "Turn on Self Assessment" })).length,
    ).toBeGreaterThan(0);
    await expect(canvasElement.textContent).not.toContain("£");
  },
};
