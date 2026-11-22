import type { UkPropertyTaxJurisdiction } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { StampDutyEstimate, type StampDutyEstimateProps } from "./StampDutyEstimate";

const Stateful = (initial: Partial<StampDutyEstimateProps>) => {
  const [propertyPriceGbp, setPrice] = useState<number | null>(initial.propertyPriceGbp ?? null);
  const [jurisdiction, setJurisdiction] = useState<UkPropertyTaxJurisdiction | null>(
    initial.jurisdiction ?? null,
  );
  const [ftb, setFtb] = useState<boolean | null>(initial.allFirstTimeBuyersMainHome ?? null);
  return (
    <StampDutyEstimate
      allFirstTimeBuyersMainHome={ftb}
      defaultOpen={initial.defaultOpen ?? true}
      jurisdiction={jurisdiction}
      propertyPriceGbp={propertyPriceGbp}
      onAllFirstTimeBuyersMainHomeChange={setFtb}
      onJurisdictionChange={setJurisdiction}
      onPropertyPriceChange={setPrice}
    />
  );
};

const meta: Meta<typeof StampDutyEstimate> = {
  title: "5. Calculators/Mortgage/StampDutyEstimate",
  component: StampDutyEstimate,
  parameters: { layout: "padded" },
  args: {
    propertyPriceGbp: 250_000,
    jurisdiction: null,
    allFirstTimeBuyersMainHome: null,
    defaultOpen: true,
    onPropertyPriceChange: fn(),
    onJurisdictionChange: fn(),
    onAllFirstTimeBuyersMainHomeChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof StampDutyEstimate>;

/** England or Northern Ireland, not first-time buyers: £250,000 gives 2% x £125,000 = £2,500. */
export const England: Story = {
  render: () => <Stateful propertyPriceGbp={250_000} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: "England or Northern Ireland" }));
    await userEvent.click(canvas.getByRole("radio", { name: "No" }));
    await expect(canvas.getByTestId("stamp-duty-result")).toHaveTextContent(
      "Estimated stamp duty: ~£2,500",
    );
  },
};

export const EnglandDark: Story = {
  ...England,
  globals: { theme: "dark" },
};

/** Scotland keeps pence: £145,050.50 gives 2% x £50.50 = £1.01. */
export const ScotlandPence: Story = {
  render: () => (
    <Stateful
      allFirstTimeBuyersMainHome={false}
      jurisdiction="SCOTLAND"
      propertyPriceGbp={145_050.5}
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("stamp-duty-result")).toHaveTextContent(
      "Estimated Land and Buildings Transaction Tax: ~£1.01",
    );
  },
};

/** Wales has no first-time buyer relief, so the question is not asked. */
export const Wales: Story = {
  render: () => <Stateful jurisdiction="WALES" propertyPriceGbp={300_000} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("radio", { name: "Yes" })).toBeNull();
    await expect(canvas.getByTestId("stamp-duty-result")).toHaveTextContent(
      "Estimated Land Transaction Tax: ~£4,500",
    );
  },
};

export const WalesDark: Story = {
  ...Wales,
  globals: { theme: "dark" },
};

/** Closed by default on the page: the disclosure opens it. */
export const Closed: Story = {
  render: () => <Stateful defaultOpen={false} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByTestId("stamp-duty-toggle");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(canvas.queryByTestId("stamp-duty-panel")).toBeNull();
    await userEvent.click(button);
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(button).toHaveAttribute("aria-controls", "stamp-duty-panel");
    await expect(canvas.getByTestId("stamp-duty-panel")).toBeInTheDocument();
    await expect(canvas.getByText("Where is the property?")).toBeInTheDocument();
  },
};
