import { ScenarioZone } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { useMemo, useState } from "react";
import { expect, fireEvent, fn, within } from "storybook/test";
import { useScenarioState } from "~/hooks/useScenarioState";
import { MortgageSummary } from "../MortgageSummary";
import { MortgageTracker } from "../MortgageTracker";
import { OverpaymentSimulator } from "../OverpaymentSimulator";
import { MortgageScenarioInputs } from "./MortgageScenarioInputs";

const meta: Meta<typeof MortgageScenarioInputs> = {
  title: "3. Financial Patterns & Sections/MortgageScenarioInputs",
  component: MortgageScenarioInputs,
  parameters: { layout: "padded" },
  args: {
    values: { loanAmount: 180000, interestRate: 4.5, remainingTerm: 20 },
    isEdited: () => false,
    onChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MortgageScenarioInputs>;

export const Saved: Story = {};

export const Edited: Story = {
  args: { isEdited: (key) => key === "interestRate" },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByText("Changed from your saved figure").length,
    ).toBeGreaterThan(0);
  },
};

export const Interactive: Story = {
  render: (args) => {
    const [values, setValues] = useState(args.values);
    return (
      <MortgageScenarioInputs
        {...args}
        isEdited={(key) => values[key] !== args.values[key]}
        values={values}
        onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
      />
    );
  },
};
