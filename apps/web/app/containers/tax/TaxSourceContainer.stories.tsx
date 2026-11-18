import type { TaxRecord } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import TaxSourceContainer from "./TaxSourceContainer";

const record = (
  id: string,
  name: string,
  source: TaxRecord["source"],
  type: TaxRecord["type"],
  category: string,
  amount: number,
  frequency: TaxRecord["frequency"],
  date: string,
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
  }) as TaxRecord;

const records: TaxRecord[] = [
  record(
    "s1",
    "Design work",
    "self-employed",
    "income",
    "self_employed_income",
    900,
    "monthly",
    "2026-04-06",
  ),
  record("s2", "Software", "self-employed", "expense", "office_costs", 25, "monthly", "2026-04-06"),
  record("r1", "Flat rent", "rental", "income", "rental_income", 1150, "monthly", "2026-04-06"),
  record(
    "r2",
    "Mortgage interest",
    "rental",
    "expense",
    "mortgage_interest",
    400,
    "monthly",
    "2026-04-06",
  ),
  record(
    "r3",
    "Letting agent",
    "rental",
    "expense",
    "legal_management_fees",
    90,
    "monthly",
    "2026-04-06",
  ),
];

const userProfile = {
  annualSalary: 52000,
  propertyOwnershipShare: 50,
  country: "GB",
  enabledPages: ["accounts", "budget", "tax"],
};

/** The Storybook preview renders every story side by side in light and dark. */
const meta = {
  title: "6. Pages/Tax/Source",
  component: TaxSourceContainer,
  parameters: {
    layout: "fullscreen",
    router: { loaderData: { source: "self-employed", records, userProfile } },
  },
} satisfies Meta<typeof TaxSourceContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Self-employed: the figures, the trading allowance beside the expenses and the records. */
export const SelfEmployed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      (await canvas.findAllByRole("heading", { level: 1, name: "Self-employed" })).length,
    ).toBeGreaterThan(0);
    const [add] = await canvas.findAllByRole("button", { name: "Add expense" });
    await userEvent.click(add as HTMLElement);
  },
};

/** Rental: the property allowance, the owner's share and the mortgage interest line. */
export const Rental: Story = {
  parameters: { router: { loaderData: { source: "rental", records, userProfile } } },
};

/** A source with nothing recorded in the year: one empty state with both add actions. */
export const Empty: Story = {
  parameters: { router: { loaderData: { source: "savings", records, userProfile } } },
};
