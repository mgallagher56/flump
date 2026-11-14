import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { ToolBreadcrumbs } from "./ToolBreadcrumbs";

const meta: Meta<typeof ToolBreadcrumbs> = {
  title: "3. Patterns/ToolBreadcrumbs",
  component: ToolBreadcrumbs,
  parameters: { layout: "padded" },
  args: { title: "Mortgage overpayment or Stocks and Shares ISA" },
};

export default meta;
type Story = StoryObj<typeof ToolBreadcrumbs>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("link", { name: /All calculators/ })).toHaveAttribute(
    "href",
    "/tools",
  );
  await expect(canvasElement.querySelector('[aria-current="page"]')).toHaveTextContent(
    "Mortgage overpayment or Stocks and Shares ISA",
  );
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
