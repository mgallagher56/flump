import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import { css } from "../../../styled-system/css";
import { Card } from "../../primitives/Card/Card";
import { formatMoney } from "../../primitives/Money/Money";
import { SliderField } from "../../primitives/SliderField/SliderField";
import { PageHeader } from "../PageHeader/PageHeader";
import { SimulatorSplitLayout } from "./SimulatorSplitLayout";

const heading = css({ textStyle: "heading.sm", color: "text.primary", margin: "0" });
const chartBox = css({
  height: "260px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "surface.sunken",
  borderRadius: "xl",
  color: "text.secondary",
  textStyle: "body.sm",
});
const cardStack = css({ display: "flex", flexDirection: "column", gap: "5" });
const stack = css({ display: "flex", flexDirection: "column", gap: "6" });
const figure = css({
  textStyle: "numeric.lg",
  color: "text.primary",
  fontVariantNumeric: "tabular-nums",
});
const caption = css({ textStyle: "body.sm", color: "text.secondary" });

/** Simple stand-in payoff model so the story outcome responds to the sliders. */
const payoffMonths = (balance: number, apr: number, payment: number): number => {
  const r = apr / 100 / 12;
  if (payment <= balance * r) return 600;
  return Math.ceil(-Math.log(1 - (balance * r) / payment) / Math.log(1 + r));
};

const Demo = () => {
  const [balance, setBalance] = useState(8400);
  const [apr, setApr] = useState(19.9);
  const [payment, setPayment] = useState(260);
  const months = payoffMonths(balance, apr, payment);
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const headline = `Debt free in ${years} years ${rem} months`;

  return (
    <div className={stack}>
      <PageHeader
        badge="Sample data"
        description="See how extra payments change your payoff date."
        title="Debt payoff"
      />
      <SimulatorSplitLayout
        content={
          <>
            <Card>
              <div className={cardStack}>
                <h2 className={heading}>Balance over time</h2>
                <div className={chartBox}>Chart goes here</div>
              </div>
            </Card>
            <Card>
              <p className={caption}>Total repaid at this pace</p>
              <p className={figure}>{formatMoney(payment * months).text}</p>
            </Card>
          </>
        }
        controls={
          <Card>
            <div className={cardStack}>
              <h2 className={heading}>Payoff settings</h2>
              <SliderField
                format="currency"
                label="Balance"
                max={30000}
                min={0}
                step={100}
                value={balance}
                onChange={setBalance}
              />
              <SliderField
                format="percent"
                label="Interest rate"
                max={40}
                min={0}
                step={0.1}
                value={apr}
                onChange={setApr}
              />
              <SliderField
                format="currency"
                label="Monthly payment"
                max={1000}
                min={0}
                step={10}
                value={payment}
                onChange={setPayment}
              />
            </div>
          </Card>
        }
        summary={<strong>{headline}</strong>}
      />
    </div>
  );
};

const meta: Meta<typeof SimulatorSplitLayout> = {
  title: "3. Patterns/SimulatorSplitLayout",
  component: SimulatorSplitLayout,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof SimulatorSplitLayout>;

export const Default: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("region", { name: "Parameters" })).toBeInTheDocument();
    await expect(canvas.getByRole("region", { name: "Results" })).toBeInTheDocument();
    await expect(canvasElement.querySelector("main")).toBeNull();
    // Moving a slider updates the outcome in the summary bar.
    const slider = canvas.getByLabelText("Monthly payment range slider") as HTMLInputElement;
    const before = canvas.getByText(/Debt free in/).textContent;
    slider.focus();
    await userEvent.keyboard("{End}");
    await expect(canvas.getByText(/Debt free in/).textContent).not.toBe(before);
  },
};

export const Dark: Story = {
  ...Default,
  globals: { theme: "dark" },
};

export const ControlsOpenUnderLg: Story = {
  render: () => <Demo />,
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const adjust = canvas.getByRole("button", { name: "Adjust" });
    await expect(adjust).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(adjust);
    await expect(adjust).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByText(/Debt free in/)).toBeInTheDocument();
  },
};

const tallBlock = css({
  height: "400px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "surface.sunken",
  borderRadius: "xl",
  color: "text.secondary",
  textStyle: "body.sm",
});

/**
 * A column taller than the viewport is not sticky: it scrolls with the page, so the last control
 * can be reached without scrolling to the end of the results first.
 */
export const TallControls: Story = {
  render: () => (
    <SimulatorSplitLayout
      content={
        <Card>
          <div className={tallBlock}>Results</div>
        </Card>
      }
      controls={
        <Card>
          <div className={cardStack}>
            <h2 className={heading}>Many settings</h2>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div className={tallBlock} key={n}>
                Setting group {n}
              </div>
            ))}
            <button type="button">Last control</button>
          </div>
        </Card>
      }
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const region = canvas.getByRole("region", { name: "Parameters" });
    await waitFor(() => expect(region).toHaveAttribute("data-sticky", "false"));
    await expect(canvas.getByRole("button", { name: "Last control" })).toBeInTheDocument();
  },
};
