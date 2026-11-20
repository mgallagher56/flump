import type { SampleHouseholdKey } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { PreviewFrame } from "../PreviewFrame/PreviewFrame";
import { DebtBorrowingPreview, type DebtBorrowingPreviewProps } from "./DebtBorrowingPreview";

/** The preview inside its frame, with the household switcher the marketing pages use. */
const SwitchingPreview = ({ id, household: initial = "renter" }: DebtBorrowingPreviewProps) => {
  const [household, setHousehold] = useState<SampleHouseholdKey>(initial);
  return (
    <PreviewFrame
      household={household}
      id={`frame-${id}`}
      onHouseholdChange={setHousehold}
      title="Debt and borrowing"
    >
      <DebtBorrowingPreview household={household} id={id} />
    </PreviewFrame>
  );
};

const meta: Meta<typeof DebtBorrowingPreview> = {
  title: "Patterns/DebtBorrowingPreview",
  component: DebtBorrowingPreview,
  parameters: {
    layout: "padded",
  },
  render: (args) => <SwitchingPreview {...args} />,
};

export default meta;
type Story = StoryObj<typeof DebtBorrowingPreview>;

// The renter has no mortgage, so there is no mortgage section until the switch.
const switchPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { name: "Student loan" })).toBeVisible();
  await expect(canvas.queryByRole("heading", { name: "Mortgage" })).toBeNull();
  await userEvent.click(canvas.getByRole("button", { name: "Paying a mortgage" }));
  await expect(canvas.getByRole("heading", { name: "Cards and loans" })).toBeVisible();
  await expect(canvas.getByText("Estimated debt-free date")).toBeVisible();
  await expect(canvas.getByRole("heading", { name: "Mortgage" })).toBeVisible();
};

export const Renter: Story = {
  args: { id: "story-db-renter", household: "renter" },
  globals: { theme: "light" },
  play: switchPlay,
};

export const RenterDark: Story = {
  args: { id: "story-db-renter-dark", household: "renter" },
  globals: { theme: "dark" },
  play: switchPlay,
};

export const Homeowner: Story = {
  args: { id: "story-db-owner", household: "homeowner" },
  globals: { theme: "light" },
};

export const HomeownerDark: Story = {
  args: { id: "story-db-owner-dark", household: "homeowner" },
  globals: { theme: "dark" },
};
