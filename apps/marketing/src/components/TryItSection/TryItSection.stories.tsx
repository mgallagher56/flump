import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { expect, userEvent, within } from "storybook/test";
import { TryItSection } from "./TryItSection";

const meta: Meta<typeof TryItSection> = {
  title: "3. Patterns/Marketing/TryItSection",
  component: TryItSection,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: { layout: "fullscreen" },
  args: { area: "debt-and-borrowing" },
};

export default meta;
type Story = StoryObj<typeof TryItSection>;

const assertDebt: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { name: "Two ways to pay off debts" })).toBeVisible();
  const toggle = canvas.getByRole("button", { name: "Change the details" });
  await userEvent.click(toggle);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
};

export const Light: Story = { globals: { theme: "light" }, play: assertDebt };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertDebt,
};

const assertPay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByRole("slider")).toHaveLength(2);
};

export const PayLight: Story = {
  args: { area: "pay" },
  globals: { theme: "light" },
  play: assertPay,
};

export const PayDark: Story = {
  args: { area: "pay" },
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertPay,
};
