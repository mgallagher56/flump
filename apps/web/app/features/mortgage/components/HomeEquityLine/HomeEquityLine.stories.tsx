import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { HomeEquityLine } from "./HomeEquityLine";

const meta: Meta<typeof HomeEquityLine> = {
  title: "3. Patterns/Mortgage/HomeEquityLine",
  component: HomeEquityLine,
  parameters: { layout: "padded" },
  args: {
    homeValue: 300000,
    homeSharePercent: null,
    mortgageBalance: 200000,
    mortgageSharePercent: null,
  },
};

export default meta;
type Story = StoryObj<typeof HomeEquityLine>;

export const Sole: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Your equity")).toBeTruthy();
    await expect(canvasElement.textContent).toContain("£100,000");
  },
};

/** 350,000 × 40% − 125,000 × 40% = 140,000 − 50,000 = £90,000. */
export const Joint: Story = {
  args: {
    homeValue: 350000,
    homeSharePercent: 40,
    mortgageBalance: 125000,
    mortgageSharePercent: 40,
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain("£90,000");
    await expect(canvasElement.textContent).toContain("At your 40% share");
  },
};

/** Sole home, 50% joint mortgage: 300,000 − 200,000 × 50% = £200,000. */
export const DifferentShares: Story = {
  args: { homeSharePercent: null, mortgageSharePercent: 50 },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain("£200,000");
    await expect(canvasElement.textContent).toContain(
      "At your share of the home and of the mortgage",
    );
  },
};

/** Shown neutrally: a minus sign in the normal text colour. */
export const Negative: Story = {
  args: { homeValue: 180000, mortgageBalance: 195000 },
  play: async ({ canvasElement }) => {
    const value = within(canvasElement).getByText("-£15,000");
    await expect(value).toBeTruthy();
    // Money nests the figure in its own span, so read the colour class from the nearest element
    // that carries one: the normal text colour, never a status (warning or danger) tone.
    await expect(value.closest('[class~="c_text.primary"]')).not.toBeNull();
    await expect(value.closest('[class*="c_status."]')).toBeNull();
  },
};

export const NoMortgage: Story = {
  args: { homeValue: 275000, mortgageBalance: null },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain("£275,000");
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Your equity")).toBeTruthy();
    await expect(canvasElement.textContent).toContain("£100,000");
  },
};

/** 180,000 × 50% − 195,000 × 50% = 90,000 − 97,500 = −£7,500. */
export const DarkJointNegative: Story = {
  args: {
    homeValue: 180000,
    homeSharePercent: 50,
    mortgageBalance: 195000,
    mortgageSharePercent: 50,
  },
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain("-£7,500");
    await expect(canvasElement.textContent).toContain("At your 50% share");
  },
};
