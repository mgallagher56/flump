import type { SampleHouseholdKey } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { PreviewFrame } from "../PreviewFrame/PreviewFrame";
import { DebtBorrowingPreview, type DebtBorrowingPreviewProps } from "./DebtBorrowingPreview";

/** The preview inside its frame, with the household switcher the marketing pages use. */
const SwitchingPreview = ({
  id,
  household: initial = "renter",
  asOf,
}: DebtBorrowingPreviewProps) => {
  const [household, setHousehold] = useState<SampleHouseholdKey>(initial);
  return (
    <PreviewFrame
      household={household}
      id={`frame-${id}`}
      onHouseholdChange={setHousehold}
      title="Debt and borrowing"
    >
      <DebtBorrowingPreview asOf={asOf} household={household} id={id} />
    </PreviewFrame>
  );
};

/** A fixed date, so the debt-free date and the fixed-rate end do not move with the calendar. */
const AS_OF = new Date("2026-11-01T12:00:00Z");

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

// Only the homeowner has a card and loan. From 1 November 2026 at 280 a month, with the loan's
// 220 moved to the card once the loan clears in month 37, both clear in month 39: February 2030
// (worked in DebtBorrowingPreview.test.tsx).
const homeownerPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("Personal loan")).toBeVisible();
  await expect(canvas.getByText("February 2030")).toBeVisible();
};

export const Renter: Story = {
  args: { id: "story-db-renter", household: "renter", asOf: AS_OF },
  globals: { theme: "light" },
  play: switchPlay,
};

export const RenterDark: Story = {
  args: { id: "story-db-renter-dark", household: "renter", asOf: AS_OF },
  globals: { theme: "dark" },
  play: switchPlay,
};

export const Homeowner: Story = {
  args: { id: "story-db-owner", household: "homeowner", asOf: AS_OF },
  globals: { theme: "light" },
  play: homeownerPlay,
};

export const HomeownerDark: Story = {
  args: { id: "story-db-owner-dark", household: "homeowner", asOf: AS_OF },
  globals: { theme: "dark" },
  play: homeownerPlay,
};
