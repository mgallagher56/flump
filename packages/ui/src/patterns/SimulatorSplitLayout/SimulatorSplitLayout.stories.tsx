import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Card } from "../../primitives/Card/Card";
import { SliderField } from "../../primitives/SliderField/SliderField";
import { SimulatorSplitLayout } from "./SimulatorSplitLayout";

const meta: Meta<typeof SimulatorSplitLayout> = {
  title: "3. Financial Patterns & Sections/SimulatorSplitLayout",
  component: SimulatorSplitLayout,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof SimulatorSplitLayout>;

export const Default: Story = {
  render: () => (
    <SimulatorSplitLayout
      content={
        <Card>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "bold" }}>
            The Debt-to-Wealth Crossover Bridge
          </h3>
          <div
            style={{
              height: "220px",
              backgroundColor: "rgba(99,102,241,0.06)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--colors-text-muted)",
              fontSize: "13px",
            }}
          >
            [ Interactive Wealth Accumulation Chart: Year 1 to 5 ]
          </div>
        </Card>
      }
      controls={
        <Card>
          <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "bold" }}>
            Payoff Parameters
          </h4>
          <SliderField
            label="Extra Monthly Overpayment"
            max={500}
            min={0}
            step={10}
            unitPrefix="£"
            unitSuffix="/mo"
            value={50}
            onChange={() => {}}
          />
        </Card>
      }
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Payoff Parameters")).toBeInTheDocument();
    await expect(canvas.getByText("The Debt-to-Wealth Crossover Bridge")).toBeInTheDocument();
  },
};
