import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { LifeBuoy, PiggyBank, WalletCards } from "lucide-react";
import { css } from "../../../styled-system/css";
import { Button } from "../../primitives/Button/Button";
import { SectionHeader } from "./SectionHeader";

const meta: Meta<typeof SectionHeader> = {
  title: "3. Patterns/SectionHeader",
  component: SectionHeader,
  parameters: { layout: "padded" },
  args: {
    icon: LifeBuoy,
    tone: "accent",
    title: "Breathing room",
    description: "How long your savings would cover the essentials.",
  },
  decorators: [
    (Story) => (
      <div className={css({ maxWidth: "40rem" })}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SectionHeader>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { level: 2, name: "Breathing room" })).toBeVisible();
  await expect(canvas.getByText("How long your savings would cover the essentials.")).toBeVisible();
  // The tile is decoration: the title names the section.
  await expect(canvasElement.querySelector("[data-tile-tone]")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
};

export const Default: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };

const stack = css({ display: "flex", flexDirection: "column", gap: "page.section" });

const Variants = () => (
  <div className={stack}>
    <SectionHeader
      description="Your income and what you spend each month."
      domain="pay"
      icon={WalletCards}
      title="Where your money goes"
    />
    <SectionHeader
      action={
        <Button size="sm" variant="outline">
          Edit
        </Button>
      }
      description="The saved figures every estimate on this page starts from."
      domain="savings"
      icon={PiggyBank}
      title="Your details"
    />
    <SectionHeader icon={LifeBuoy} title="No description" tone="accent" />
  </div>
);

const variantsPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByRole("heading", { level: 2 })).toHaveLength(3);
  await expect(canvas.getByRole("button", { name: "Edit" })).toBeVisible();
};

export const TonesAndAction: Story = {
  globals: { theme: "light" },
  render: () => <Variants />,
  play: variantsPlay,
};

export const TonesAndActionDark: Story = {
  globals: { theme: "dark" },
  render: () => <Variants />,
  play: variantsPlay,
};
