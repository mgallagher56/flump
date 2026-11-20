import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { MONEYHELPER_PENSIONS_URL, MoneyHelperGuidance } from "./MoneyHelperGuidance";

/** The Storybook preview renders every story side by side in light and dark. */
const meta: Meta<typeof MoneyHelperGuidance> = {
  title: "3. Patterns/MoneyHelperGuidance",
  component: MoneyHelperGuidance,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof MoneyHelperGuidance>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const links = canvas.getAllByRole("link", {
      name: /Pension guidance from MoneyHelper.*opens in a new tab/,
    });
    await expect(links[0]?.getAttribute("href")).toBe(MONEYHELPER_PENSIONS_URL);
    await expect(links[0]?.getAttribute("target")).toBe("_blank");
    await expect(links[0]?.getAttribute("rel")).toContain("noreferrer");
  },
};
