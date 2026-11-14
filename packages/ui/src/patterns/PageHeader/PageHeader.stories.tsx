import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Button } from "../../primitives/Button/Button";
import { PageHeader } from "./PageHeader";

const meta: Meta<typeof PageHeader> = {
  title: "3. Patterns/PageHeader",
  component: PageHeader,
  parameters: {
    layout: "padded",
  },
  args: {
    title: "Debt payoff",
    description: "See how extra payments change your payoff date and the interest you pay.",
    actions: <Button size="sm">Add debt</Button>,
  },
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Debt payoff" }),
    ).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Add debt" })).toBeInTheDocument();
  },
};

const primaryAndSecondaryArgs = {
  title: "Your budget",
  description: "What comes in, what goes out and what is left each month.",
  actions: (
    <>
      <Button size="sm" variant="secondary">
        Export
      </Button>
      <Button size="sm">Edit budget</Button>
    </>
  ),
};

const primaryAndSecondaryPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByRole("button")).toHaveLength(2);
  await expect(canvas.getByRole("button", { name: "Edit budget" })).toBeInTheDocument();
  await expect(canvas.queryByRole("note")).toBeNull();
};

/**
 * The one `actions` slot holds one primary and at most one secondary. The description is one
 * line. There is no notice slot: the page's notice sits at the foot of its first projection.
 */
export const PrimaryAndSecondary: Story = {
  args: primaryAndSecondaryArgs,
  play: primaryAndSecondaryPlay,
};

export const PrimaryAndSecondaryDark: Story = {
  args: primaryAndSecondaryArgs,
  globals: { theme: "dark" },
  play: primaryAndSecondaryPlay,
};

export const SampleDataBadge: Story = {
  args: {
    title: "Home",
    description: "Where you stand this month. Sample data.",
    badge: "Sample data",
    actions: undefined,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Sample data")).toBeInTheDocument();
  },
};

export const TitleOnly: Story = {
  args: { description: undefined, actions: undefined },
};

export const LongContent: Story = {
  args: {
    title: "Mortgage overpayment and remortgage planning for 2026/27",
    description:
      "Compare overpaying with saving, test a higher renewal rate and see what each choice does to your balance, monthly payment and total interest over the term.",
    badge: "Sample data",
  },
};

/**
 * Round 4: on a phone the h1 and a single action share the first row and the description runs
 * full width beneath, so the action never takes a row of its own.
 */
const phonePlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const title = canvas.getByRole("heading", { level: 1, name: "Your budget" });
  const action = canvas.getByRole("button", { name: "Edit budget" });
  const titleBox = title.getBoundingClientRect();
  const actionBox = action.getBoundingClientRect();
  // Same row: the action's vertical centre falls within the h1's line box.
  const centre = actionBox.top + actionBox.height / 2;
  await expect(centre > titleBox.top && centre < titleBox.bottom + 8).toBe(true);
};

export const PhoneTitleAndAction: Story = {
  args: {
    title: "Your budget",
    description: "Your income, spending and how long your money lasts.",
    actions: <Button variant="outline">Edit budget</Button>,
  },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: phonePlay,
};

export const PhoneTitleAndActionDark: Story = {
  ...PhoneTitleAndAction,
  globals: { theme: "dark" },
};

/** Round 4: a long title on a phone wraps inside the screen, and the action moves below it. */
export const PhoneLongTitle: Story = {
  args: {
    title: "Pension contributions and income above £100,000",
    description: "How pension contributions change tax on income over £100,000.",
    actions: <Button variant="outline">Edit details</Button>,
  },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector("header") as HTMLElement;
    // Nothing runs off the side: the header is no wider than its container.
    await expect(header.scrollWidth <= header.clientWidth + 1).toBe(true);
  },
};
