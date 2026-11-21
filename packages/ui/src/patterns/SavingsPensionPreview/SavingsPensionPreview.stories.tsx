import type { SampleHouseholdKey } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { PreviewFrame } from "../PreviewFrame/PreviewFrame";
import { SavingsPensionPreview, type SavingsPensionPreviewProps } from "./SavingsPensionPreview";

/** The preview inside its frame, with the household switcher the marketing pages use. */
const SwitchingPreview = ({ id, household: initial = "renter" }: SavingsPensionPreviewProps) => {
  const [household, setHousehold] = useState<SampleHouseholdKey>(initial);
  return (
    <PreviewFrame
      household={household}
      id={`frame-${id}`}
      onHouseholdChange={setHousehold}
      title="Savings and pension"
    >
      <SavingsPensionPreview household={household} id={id} />
    </PreviewFrame>
  );
};

const meta: Meta<typeof SavingsPensionPreview> = {
  title: "3. Patterns/SavingsPensionPreview",
  component: SavingsPensionPreview,
  parameters: {
    layout: "padded",
  },
  render: (args) => <SwitchingPreview {...args} />,
};

export default meta;
type Story = StoryObj<typeof SavingsPensionPreview>;

// The renter has no pension pot; the homeowner has one, so switching shows the pots list.
const switchPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("Cash ISA")).toBeVisible();
  await expect(canvas.queryByRole("list", { name: "Pension pots" })).toBeNull();
  await userEvent.click(canvas.getByRole("button", { name: "Paying a mortgage" }));
  await expect(canvas.getByText("Workplace and personal pension")).toBeVisible();
  await expect(canvas.getByRole("list", { name: "Pension pots" })).toBeVisible();
  await expect(canvas.getByText("Estimated interest over the next 12 months")).toBeVisible();
};

// Only the homeowner has the employer paying in at 4%: 52,000 x 4% / 12 = 173.33, shown as £173.
const homeownerPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("Cash and emergency savings")).toBeVisible();
  await expect(canvas.getByText("Paid in by the employer each month")).toBeVisible();
  await expect(canvas.getByText("£173")).toBeVisible();
};

export const Renter: Story = {
  args: { id: "story-sp-renter", household: "renter" },
  globals: { theme: "light" },
  play: switchPlay,
};

export const RenterDark: Story = {
  args: { id: "story-sp-renter-dark", household: "renter" },
  globals: { theme: "dark" },
  play: switchPlay,
};

export const Homeowner: Story = {
  args: { id: "story-sp-owner", household: "homeowner" },
  globals: { theme: "light" },
  play: homeownerPlay,
};

export const HomeownerDark: Story = {
  args: { id: "story-sp-owner-dark", household: "homeowner" },
  globals: { theme: "dark" },
  play: homeownerPlay,
};
